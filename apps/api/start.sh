#!/bin/sh
set -e

# Apply schema changes to production DB on startup
echo "=== Running prisma db push ==="
echo "=== DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo 'YES' || echo 'NO') ==="
cd /app/apps/api

# Try with --url flag first, fallback to config
echo "=== Attempting prisma db push ==="
npx prisma db push --accept-data-loss --url "$DATABASE_URL" 2>&1 || echo "=== prisma db push FAILED (exit $?) ==="
echo "=== prisma db push completed ==="

# Apply any missing enum values via raw SQL file (avoids ESM/CJS issues)
echo "=== Applying supplemental enum values ==="
cat > /tmp/enum_fixes.sql << 'SQLEOF'
ALTER TABLE "PitchLens" ADD COLUMN IF NOT EXISTS "accentColorDiversity" BOOLEAN NOT NULL DEFAULT true;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'MATRIX_2X2';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'WATERFALL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FUNNEL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'COMPETITIVE_MATRIX';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'ROADMAP';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PRICING_TABLE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'UNIT_ECONOMICS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'SWOT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'THREE_PILLARS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'HOOK';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'BEFORE_AFTER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'SOCIAL_PROOF';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'OBJECTION_HANDLER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FAQ';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'VERDICT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'COHORT_TABLE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PROGRESS_TRACKER';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PRODUCT_SHOWCASE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FLYWHEEL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'REVENUE_MODEL';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'CUSTOMER_JOURNEY';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'TECH_STACK';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'GROWTH_LOOPS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'CASE_STUDY';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'HIRING_PLAN';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'USE_OF_FUNDS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'RISK_MITIGATION';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'DEMO_SCREENSHOT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'MILESTONE_TIMELINE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PARTNERSHIP_LOGOS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
SQLEOF

npx prisma db execute --url "$DATABASE_URL" --file /tmp/enum_fixes.sql 2>&1 || echo "=== Enum fixes via prisma db execute FAILED ==="
echo "=== Enum fixes completed ==="

exec node /app/apps/api/dist/src/main.js
