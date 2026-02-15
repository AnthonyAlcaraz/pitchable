import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';

export interface VerifyResult {
  keyId: string;
  userId: string;
  email: string;
  role: string;
  scopes: string[];
  rateLimit: number;
}

const VALID_SCOPES = ['presentations:read', 'presentations:write', 'generation', 'export'];

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);
  private lastUsedUpdates = new Map<string, number>();

  constructor(private readonly prisma: PrismaService) {}

  /** Create a new API key. Returns plaintext key ONCE. */
  async create(
    userId: string,
    name: string,
    scopes: string[],
    expiresAt?: Date,
  ): Promise<{ id: string; plaintext: string; prefix: string }> {
    // Validate scopes
    const invalid = scopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalid.length > 0) {
      throw new ForbiddenException(`Invalid scopes: ${invalid.join(', ')}`);
    }

    const raw = 'pk_' + randomBytes(32).toString('hex');
    const prefix = raw.substring(0, 11); // "pk_" + 8 hex chars
    const keyHash = await argon2.hash(raw);

    const key = await this.prisma.apiKey.create({
      data: { userId, name, keyHash, keyPrefix: prefix, scopes, expiresAt },
    });

    this.logger.log(`API key created: ${prefix}... for user ${userId}`);
    return { id: key.id, plaintext: raw, prefix };
  }

  /** Verify an API key and return user info + scopes. */
  async verify(rawKey: string): Promise<VerifyResult | null> {
    if (!rawKey.startsWith('pk_')) return null;

    const prefix = rawKey.substring(0, 11);
    const candidates = await this.prisma.apiKey.findMany({
      where: { keyPrefix: prefix, isRevoked: false },
      include: { user: { select: { id: true, email: true, role: true } } },
    });

    for (const candidate of candidates) {
      // Check expiry
      if (candidate.expiresAt && candidate.expiresAt < new Date()) continue;

      const valid = await argon2.verify(candidate.keyHash, rawKey);
      if (!valid) continue;

      // Debounced lastUsedAt update (every 60s per key)
      const now = Date.now();
      const lastUpdate = this.lastUsedUpdates.get(candidate.id) ?? 0;
      if (now - lastUpdate > 60_000) {
        this.lastUsedUpdates.set(candidate.id, now);
        this.prisma.apiKey
          .update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } })
          .catch(() => {}); // fire and forget
      }

      return {
        keyId: candidate.id,
        userId: candidate.user.id,
        email: candidate.user.email,
        role: candidate.user.role,
        scopes: candidate.scopes,
        rateLimit: candidate.rateLimit,
      };
    }

    return null;
  }

  /** List API keys for a user (never returns hash). */
  async list(userId: string) {
    return this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        isRevoked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Revoke an API key. */
  async revoke(userId: string, keyId: string): Promise<void> {
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) throw new NotFoundException('API key not found.');
    if (key.userId !== userId) throw new ForbiddenException();

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isRevoked: true },
    });
  }

  /** Rotate: revoke old key, create new one with same scopes. */
  async rotate(
    userId: string,
    keyId: string,
  ): Promise<{ id: string; plaintext: string; prefix: string }> {
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) throw new NotFoundException('API key not found.');
    if (key.userId !== userId) throw new ForbiddenException();

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isRevoked: true },
    });

    return this.create(userId, key.name, key.scopes, key.expiresAt ?? undefined);
  }
}
