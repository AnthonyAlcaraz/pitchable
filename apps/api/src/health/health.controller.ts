import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health.js';
import { SlideType } from '../../generated/prisma/enums.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
    ]);
  }

  @Get('enums')
  enumCheck() {
    return {
      slideTypes: Object.keys(SlideType),
      hasFlywheel: 'FLYWHEEL' in SlideType,
      buildTime: '__BUILD_TIME__',
    };
  }
}
