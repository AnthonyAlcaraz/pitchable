/**
 * Apply supplemental schema fixes that prisma db push might miss.
 * Uses the pg module directly (no transaction wrapping) so that
 * ALTER TYPE ... ADD VALUE works correctly.
 *
 * Each statement runs individually — failures are logged but don't
 * block other statements or server startup.
 */
const { Client } = require('pg');

const statements = [
  // User table additions (Google OAuth, email verification)
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "googleId" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" TEXT NOT NULL DEFAULT 'local'`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'User_googleId_key') THEN CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId"); END IF; END $$`,
  `ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationSentAt" TIMESTAMP(3)`,
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lowCreditsAlertedAt" TIMESTAMP(3)`,

  // PitchLens additions
  `ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "accentColorDiversity" BOOLEAN NOT NULL DEFAULT true`,

  // Enum additions (each MUST run outside a transaction)
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

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  console.log('Connected to database for schema fixes');

  let success = 0;
  let failed = 0;

  for (const sql of statements) {
    try {
      await client.query(sql);
      success++;
    } catch (err) {
      // Log but continue — some statements may already be applied
      console.warn('Statement skipped:', sql.substring(0, 80) + '...', '—', err.message);
      failed++;
    }
  }

  console.log(`Schema fixes complete: ${success} succeeded, ${failed} skipped`);
  await client.end();
}

run().catch((err) => {
  console.error('Schema fix script failed:', err.message);
  // Exit 0 so we don't block server startup
});
