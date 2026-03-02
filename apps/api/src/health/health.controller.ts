import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaHealthIndicator } from './prisma.health.js';
import * as argon2 from 'argon2';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
    ]);
  }

  // TEMPORARY: diagnostic + fix for overflow-test account. Remove after verification.
  @Get('user-debug')
  async userDebug() {
    const user = await this.prisma.user.findUnique({
      where: { email: 'overflow-test@test.com' },
      select: {
        id: true,
        email: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        passwordHash: true,
        authProvider: true,
      },
    });
    if (!user) return { exists: false };
    return {
      exists: true,
      id: user.id,
      hasPasswordHash: !!user.passwordHash,
      hashPrefix: user.passwordHash?.slice(0, 20),
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      authProvider: user.authProvider,
    };
  }

  @Post('reset-test-user')
  async resetTestUser() {
    const user = await this.prisma.user.findUnique({
      where: { email: 'overflow-test@test.com' },
    });
    if (!user) return { error: 'User not found' };
    const newHash = await argon2.hash('OverTest1234');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, failedLoginAttempts: 0, lockedUntil: null },
    });
    return { success: true, hashPrefix: newHash.slice(0, 20) };
  }

  @Get('deep')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async deepCheck() {
    // Recent error count from ActivityEvent
    const errorCount = await this.prisma.$queryRawUnsafe<
      Array<{ count: bigint }>
    >(
      `SELECT COUNT(*) as count FROM "ActivityEvent" WHERE "eventType" LIKE '%_fail' AND "createdAt" >= NOW() - INTERVAL '1 hour'`,
    );

    // Generation metrics summary (last hour)
    const genMetrics = await this.prisma.$queryRawUnsafe<
      Array<{ total: bigint; successes: bigint; avgMs: number }>
    >(
      `SELECT COUNT(*) as total, SUM(CASE WHEN "success" THEN 1 ELSE 0 END) as successes, AVG("durationMs")::int as "avgMs"
     FROM "GenerationMetric" WHERE "createdAt" >= NOW() - INTERVAL '1 hour'`,
    );

    return {
      database: 'ok',
      recentErrors: Number(errorCount[0]?.count ?? 0),
      generationsLastHour: {
        total: Number(genMetrics[0]?.total ?? 0),
        successes: Number(genMetrics[0]?.successes ?? 0),
        avgDurationMs: genMetrics[0]?.avgMs ?? 0,
      },
    };
  }
}
