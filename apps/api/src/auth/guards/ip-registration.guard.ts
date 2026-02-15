import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Max registrations from a single IP within 24 hours. */
const MAX_REGISTRATIONS_24H = 2;

/** Max registrations from a single IP ever. */
const MAX_REGISTRATIONS_TOTAL = 5;

@Injectable()
export class IpRegistrationGuard implements CanActivate {
  private readonly logger = new Logger(IpRegistrationGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket.remoteAddress ?? 'unknown';

    // Skip check for localhost during development
    if (ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') {
      return true;
    }

    // Check 24h window
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCount = await this.prisma.registrationIpLog.count({
      where: { ip, createdAt: { gte: oneDayAgo } },
    });

    if (recentCount >= MAX_REGISTRATIONS_24H) {
      this.logger.warn(`IP ${ip} blocked: ${recentCount} registrations in 24h`);
      throw new HttpException(
        'Too many registrations from this IP address. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check lifetime total
    const totalCount = await this.prisma.registrationIpLog.count({
      where: { ip },
    });

    if (totalCount >= MAX_REGISTRATIONS_TOTAL) {
      this.logger.warn(`IP ${ip} blocked: ${totalCount} total registrations`);
      throw new HttpException(
        'Registration limit reached for this IP address.',
        HttpStatus.FORBIDDEN,
      );
    }

    return true;
  }
}
