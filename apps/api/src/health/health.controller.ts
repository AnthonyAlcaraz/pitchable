import { Controller, Get, Post } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SlideType } from '../../generated/prisma/enums.js';

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

  @Get('enums')
  enumCheck() {
    return {
      slideTypes: Object.keys(SlideType),
      hasFlywheel: 'FLYWHEEL' in SlideType,
    };
  }

  @Post('migrate-enums')
  async migrateEnums() {
    const newVals = [
      'FLYWHEEL','REVENUE_MODEL','CUSTOMER_JOURNEY','TECH_STACK',
      'GROWTH_LOOPS','CASE_STUDY','HIRING_PLAN','USE_OF_FUNDS',
      'RISK_MITIGATION','DEMO_SCREENSHOT','MILESTONE_TIMELINE','PARTNERSHIP_LOGOS',
    ];
    const results: Record<string, string> = {};
    for (const v of newVals) {
      try {
        await this.prisma.$executeRawUnsafe(
          `DO $$$ BEGIN ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS '${v}'; EXCEPTION WHEN duplicate_object THEN NULL; END $$$;`
        );
        results[v] = 'OK';
      } catch (e: any) {
        results[v] = `ERROR: ${e.message?.slice(0, 100)}`;
      }
    }
    // Verify by querying pg_enum
    let dbEnums: any[] = [];
    try {
      dbEnums = await this.prisma.$queryRawUnsafe(
        "SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SlideType') ORDER BY enumsortorder"
      );
    } catch (e: any) {
      return { results, dbEnums: `ERROR: ${e.message?.slice(0, 100)}` };
    }
    return {
      results,
      dbEnums: dbEnums.map((r: any) => r.enumlabel),
      hasFlywheel: dbEnums.some((r: any) => r.enumlabel === 'FLYWHEEL'),
    };
  }
}
