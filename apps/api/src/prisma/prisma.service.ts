import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleDestroy, OnModuleInit
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const connectionString = configService.get<string>('DATABASE_URL')!;
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    // Run safe schema migrations that add missing columns
    const migrations: string[] = [
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT`,
      `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'OUTLINE_GENERATION'`,
      `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'SLIDE_MODIFICATION'`,
      `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE'`,
    ];

    for (const sql of migrations) {
      try {
        await this.$executeRawUnsafe(sql);
        this.logger.log(`Migration OK: ${sql.slice(0, 60)}...`);
      } catch (e) {
        this.logger.warn(`Migration skipped: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
