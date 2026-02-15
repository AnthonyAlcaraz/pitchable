import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../api-keys.service.js';
import { SCOPES_KEY } from '../decorators/require-scopes.decorator.js';
import type { RequestUser } from '../../auth/decorators/current-user.decorator.js';

// In-memory sliding window rate limiter
const rateLimitWindows = new Map<string, number[]>();

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract API key from x-api-key header or Authorization: Bearer pk_...
    const rawKey = this.extractKey(request);
    if (!rawKey) {
      throw new UnauthorizedException('Missing API key. Provide x-api-key header or Authorization: Bearer pk_...');
    }

    // Verify key
    const result = await this.apiKeysService.verify(rawKey);
    if (!result) {
      throw new UnauthorizedException('Invalid or expired API key.');
    }

    // Rate limit check
    const now = Date.now();
    const windowMs = 60_000;
    const timestamps = rateLimitWindows.get(result.keyId) ?? [];
    const recent = timestamps.filter((t) => now - t < windowMs);
    if (recent.length >= result.rateLimit) {
      const retryAfter = Math.ceil((recent[0]! + windowMs - now) / 1000);
      const response = context.switchToHttp().getResponse();
      response.setHeader('Retry-After', String(retryAfter));
      response.setHeader('X-RateLimit-Limit', String(result.rateLimit));
      response.setHeader('X-RateLimit-Remaining', '0');
      response.setHeader('X-RateLimit-Reset', String(Math.ceil((recent[0]! + windowMs) / 1000)));
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }
    recent.push(now);
    rateLimitWindows.set(result.keyId, recent);

    // Set rate limit headers
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', String(result.rateLimit));
    response.setHeader('X-RateLimit-Remaining', String(result.rateLimit - recent.length));

    // Attach user to request (same shape as JWT auth)
    const user: RequestUser = {
      userId: result.userId,
      email: result.email,
      role: result.role,
    };
    request.user = user;
    request.apiKey = { id: result.keyId, scopes: result.scopes };

    // Check required scopes
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredScopes && requiredScopes.length > 0) {
      const hasAll = requiredScopes.every((s) => result.scopes.includes(s));
      if (!hasAll) {
        throw new ForbiddenException(
          `API key missing required scope(s): ${requiredScopes.filter((s) => !result.scopes.includes(s)).join(', ')}`,
        );
      }
    }

    return true;
  }

  private extractKey(request: any): string | null {
    const xApiKey = request.headers['x-api-key'];
    if (xApiKey) return xApiKey;

    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer pk_')) {
      return authHeader.slice(7);
    }
    return null;
  }
}
