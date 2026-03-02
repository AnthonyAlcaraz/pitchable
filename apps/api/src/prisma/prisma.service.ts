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
      // PitchBrief AI summary
      `ALTER TABLE "PitchBrief" ADD COLUMN IF NOT EXISTS "aiSummary" TEXT`,
      `ALTER TYPE "CreditReason" ADD VALUE IF NOT EXISTS 'DOCUMENT_INGESTION'`,
      // Google OAuth + email verification columns
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" TEXT NOT NULL DEFAULT 'local'`,
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_googleId_key') THEN CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId"); END IF; END $$`,
      `ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationSentAt" TIMESTAMP(3)`,
      `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lowCreditsAlertedAt" TIMESTAMP(3)`,
      // PitchLens accent color diversity
      `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "accentColorDiversity" BOOLEAN NOT NULL DEFAULT true`,
      // New SlideType enum values
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'MATRIX_2X2'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'WATERFALL'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FUNNEL'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'COMPETITIVE_MATRIX'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'ROADMAP'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PRICING_TABLE'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'UNIT_ECONOMICS'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'SWOT'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'THREE_PILLARS'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'HOOK'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'BEFORE_AFTER'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'SOCIAL_PROOF'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'OBJECTION_HANDLER'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FAQ'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'VERDICT'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'COHORT_TABLE'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PROGRESS_TRACKER'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PRODUCT_SHOWCASE'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FLYWHEEL'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'REVENUE_MODEL'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'CUSTOMER_JOURNEY'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'TECH_STACK'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'GROWTH_LOOPS'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'CASE_STUDY'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'HIRING_PLAN'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'USE_OF_FUNDS'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'RISK_MITIGATION'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'DEMO_SCREENSHOT'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'MILESTONE_TIMELINE'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PARTNERSHIP_LOGOS'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FINANCIAL_PROJECTION'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'GO_TO_MARKET'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PERSONA'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'TESTIMONIAL_WALL'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'THANK_YOU'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'SCENARIO_ANALYSIS'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'VALUE_CHAIN'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'GEOGRAPHIC_MAP'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'IMPACT_SCORECARD'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'EXIT_STRATEGY'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'ORG_CHART'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FEATURE_COMPARISON'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'DATA_TABLE'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'ECOSYSTEM_MAP'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'KPI_DASHBOARD'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'REFERENCES'`,
      `ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'ABSTRACT'`,
      `ALTER TYPE "PresentationType" ADD VALUE IF NOT EXISTS 'ACADEMIC'`,
      `ALTER TYPE "DeckArchetype" ADD VALUE IF NOT EXISTS 'ACADEMIC_PRESENTATION'`,
      // Observability tables
      `CREATE TABLE IF NOT EXISTS "ActivityEvent" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId" UUID,
        "eventType" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "ipHash" TEXT,
        "duration" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "ActivityEvent_eventType_idx" ON "ActivityEvent"("eventType")`,
      `CREATE INDEX IF NOT EXISTS "ActivityEvent_category_idx" ON "ActivityEvent"("category")`,
      `CREATE INDEX IF NOT EXISTS "ActivityEvent_userId_idx" ON "ActivityEvent"("userId")`,
      `CREATE INDEX IF NOT EXISTS "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "ActivityEvent_userId_eventType_createdAt_idx" ON "ActivityEvent"("userId", "eventType", "createdAt")`,
      `CREATE TABLE IF NOT EXISTS "GenerationMetric" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        "presentationId" UUID,
        "operation" TEXT NOT NULL,
        "model" TEXT NOT NULL,
        "inputTokens" INTEGER NOT NULL DEFAULT 0,
        "outputTokens" INTEGER NOT NULL DEFAULT 0,
        "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
        "cacheWriteTokens" INTEGER NOT NULL DEFAULT 0,
        "durationMs" INTEGER NOT NULL,
        "slideType" TEXT,
        "slideCount" INTEGER,
        "success" BOOLEAN NOT NULL DEFAULT true,
        "errorMessage" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "GenerationMetric_pkey" PRIMARY KEY ("id")
      )`,
      `CREATE INDEX IF NOT EXISTS "GenerationMetric_userId_idx" ON "GenerationMetric"("userId")`,
      `CREATE INDEX IF NOT EXISTS "GenerationMetric_presentationId_idx" ON "GenerationMetric"("presentationId")`,
      `CREATE INDEX IF NOT EXISTS "GenerationMetric_operation_idx" ON "GenerationMetric"("operation")`,
      `CREATE INDEX IF NOT EXISTS "GenerationMetric_createdAt_idx" ON "GenerationMetric"("createdAt")`,
      `CREATE INDEX IF NOT EXISTS "GenerationMetric_model_createdAt_idx" ON "GenerationMetric"("model", "createdAt")`,
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
