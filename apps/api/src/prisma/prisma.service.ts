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
      // PitchLens missing columns
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "figmaTemplateId" UUID`,
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "backgroundImageFrequency" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "sidePanelImageFrequency" INTEGER NOT NULL DEFAULT 5`,
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "useCount" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION NOT NULL DEFAULT 0`,
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "clonedFromId" UUID`,
      // Slide missing columns
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "imageLayout" TEXT`,
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "imageLocalPath" TEXT`,
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "contentHash" TEXT`,
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "sectionLabel" TEXT`,
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "figmaFileKey" TEXT`,
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "figmaNodeId" TEXT`,
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "figmaNodeName" TEXT`,
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "figmaLastSyncAt" TIMESTAMPTZ`,
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "figmaSyncVersion" INTEGER NOT NULL DEFAULT 0`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ImageSource') THEN CREATE TYPE "ImageSource" AS ENUM ('AI_GENERATED', 'FIGMA', 'UPLOADED', 'STOCK'); END IF; END $$`,
      `ALTER TABLE "Slide" ADD COLUMN IF NOT EXISTS "imageSource" "ImageSource" NOT NULL DEFAULT 'AI_GENERATED'`,
      // DraftSlide table
      `CREATE TABLE IF NOT EXISTS "DraftSlide" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "presentationId" UUID NOT NULL,
        "slideNumber" INTEGER NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "speakerNotes" TEXT,
        "slideType" "SlideType" NOT NULL,
        "imagePrompt" TEXT,
        "sectionLabel" TEXT,
        "contentHash" TEXT,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "DraftSlide_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "DraftSlide_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE
      )`,
      `CREATE INDEX IF NOT EXISTS "DraftSlide_presentationId_idx" ON "DraftSlide" ("presentationId")`,
      // SlideSource table
      `CREATE TABLE IF NOT EXISTS "SlideSource" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "slideId" UUID NOT NULL,
        "chunkId" UUID NOT NULL,
        "relevance" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SlideSource_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "SlideSource_slideId_fkey" FOREIGN KEY ("slideId") REFERENCES "Slide"("id") ON DELETE CASCADE,
        CONSTRAINT "SlideSource_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "DocumentChunk"("id") ON DELETE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "SlideSource_slideId_chunkId_key" ON "SlideSource" ("slideId", "chunkId")`,
      `CREATE INDEX IF NOT EXISTS "SlideSource_slideId_idx" ON "SlideSource" ("slideId")`,
      `CREATE INDEX IF NOT EXISTS "SlideSource_chunkId_idx" ON "SlideSource" ("chunkId")`,
      // FigmaIntegration table (user-level Figma PAT)
      `CREATE TABLE IF NOT EXISTS "FigmaIntegration" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL UNIQUE,
        "accessToken" TEXT NOT NULL,
        "figmaUserId" TEXT,
        "figmaUserName" TEXT,
        "isValid" BOOLEAN NOT NULL DEFAULT true,
        "lastValidatedAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FigmaIntegration_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "FigmaIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "FigmaIntegration_userId_key" ON "FigmaIntegration" ("userId")`,
      // FigmaWebhook table (Figma FILE_UPDATE webhooks)
      `CREATE TABLE IF NOT EXISTS "FigmaWebhook" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "fileKey" TEXT NOT NULL,
        "webhookId" TEXT NOT NULL UNIQUE,
        "passcode" TEXT NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastEventAt" TIMESTAMPTZ,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "FigmaWebhook_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "FigmaWebhook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "FigmaWebhook_webhookId_key" ON "FigmaWebhook" ("webhookId")`,
      `CREATE INDEX IF NOT EXISTS "FigmaWebhook_fileKey_idx" ON "FigmaWebhook" ("fileKey")`,
      `CREATE INDEX IF NOT EXISTS "FigmaWebhook_userId_idx" ON "FigmaWebhook" ("userId")`,
      // PitchLens Figma columns
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "figmaFileKey" TEXT`,
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "figmaAccessToken" TEXT`,
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
