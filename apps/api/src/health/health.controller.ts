import { Controller, Get, UseGuards } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaHealthIndicator } from './prisma.health.js';

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
