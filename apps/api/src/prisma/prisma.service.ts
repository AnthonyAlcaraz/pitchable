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
    // Run safe schema migrations that add missing columns/tables
    const migrations: string[] = [
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "previewUrl" TEXT`,
      `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'OUTLINE_GENERATION'`,
      `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'SLIDE_MODIFICATION'`,
      `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'CHAT_MESSAGE'`,
      `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'WEBSITE_CRAWL'`,
      `ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "contentHash" TEXT`,
      `ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "contentHash" TEXT`,
      `ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "approvalScore" DOUBLE PRECISION NOT NULL DEFAULT 0`,
      `ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS "usageCount" INTEGER NOT NULL DEFAULT 0`,
      `CREATE INDEX IF NOT EXISTS "Document_userId_contentHash_idx" ON "Document" ("userId", "contentHash")`,
      `CREATE INDEX IF NOT EXISTS "DocumentChunk_contentHash_idx" ON "DocumentChunk" ("contentHash")`,
      // FigmaTemplate table
      `CREATE TABLE IF NOT EXISTS "FigmaTemplate" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "figmaFileKey" TEXT NOT NULL,
        "figmaFileName" TEXT,
        "thumbnailUrl" TEXT,
        "isPublic" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FigmaTemplate_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "FigmaTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS "FigmaTemplate_userId_idx" ON "FigmaTemplate" ("userId")`,
      `CREATE INDEX IF NOT EXISTS "FigmaTemplate_isPublic_idx" ON "FigmaTemplate" ("isPublic")`,
      // FigmaTemplateMapping table
      `CREATE TABLE IF NOT EXISTS "FigmaTemplateMapping" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "templateId" UUID NOT NULL,
        "slideType" "SlideType" NOT NULL,
        "figmaNodeId" TEXT NOT NULL,
        "figmaNodeName" TEXT,
        "thumbnailUrl" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FigmaTemplateMapping_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "FigmaTemplateMapping_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FigmaTemplate"("id") ON DELETE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "FigmaTemplateMapping_templateId_slideType_key" ON "FigmaTemplateMapping" ("templateId", "slideType")`,
      `CREATE INDEX IF NOT EXISTS "FigmaTemplateMapping_templateId_idx" ON "FigmaTemplateMapping" ("templateId")`,
      // BriefLens join table
      `CREATE TABLE IF NOT EXISTS "BriefLens" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "briefId" UUID NOT NULL,
        "lensId" UUID NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BriefLens_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "BriefLens_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "PitchBrief"("id") ON DELETE CASCADE,
        CONSTRAINT "BriefLens_lensId_fkey" FOREIGN KEY ("lensId") REFERENCES "PitchLens"("id") ON DELETE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "BriefLens_briefId_lensId_key" ON "BriefLens" ("briefId", "lensId")`,
      `CREATE INDEX IF NOT EXISTS "BriefLens_briefId_idx" ON "BriefLens" ("briefId")`,
      `CREATE INDEX IF NOT EXISTS "BriefLens_lensId_idx" ON "BriefLens" ("lensId")`,
      // PitchLens missing column
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "figmaTemplateId" UUID`,
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
