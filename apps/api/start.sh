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
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'MATRIX_2X2';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'WATERFALL';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FUNNEL';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'COMPETITIVE_MATRIX';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'ROADMAP';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PRICING_TABLE';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'UNIT_ECONOMICS';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'SWOT';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'THREE_PILLARS';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'HOOK';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'BEFORE_AFTER';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'SOCIAL_PROOF';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'OBJECTION_HANDLER';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FAQ';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'VERDICT';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'COHORT_TABLE';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PROGRESS_TRACKER';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PRODUCT_SHOWCASE';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'FLYWHEEL';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'REVENUE_MODEL';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'CUSTOMER_JOURNEY';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'TECH_STACK';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'GROWTH_LOOPS';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'CASE_STUDY';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'HIRING_PLAN';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'USE_OF_FUNDS';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'RISK_MITIGATION';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'DEMO_SCREENSHOT';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'MILESTONE_TIMELINE';
ALTER TYPE "SlideType" ADD VALUE IF NOT EXISTS 'PARTNERSHIP_LOGOS';
SQLEOF

npx prisma db execute --url "$DATABASE_URL" --file /tmp/enum_fixes.sql 2>&1 || echo "=== Enum fixes via prisma db execute FAILED ==="
echo "=== Enum fixes completed ==="

exec node /app/apps/api/dist/src/main.js
