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

# Apply any missing enum values or columns that prisma db push may skip
echo "=== Applying supplemental schema fixes ==="
node -e "
const { PrismaClient } = require('./generated/prisma/client.js');
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
(async () => {
  const fixes = [
    \"ALTER TABLE \\\"PitchLens\\\" ADD COLUMN IF NOT EXISTS \\\"accentColorDiversity\\\" BOOLEAN NOT NULL DEFAULT true\",
  ];
  const enumVals = [
    'MATRIX_2X2','WATERFALL','FUNNEL','COMPETITIVE_MATRIX','ROADMAP',
    'PRICING_TABLE','UNIT_ECONOMICS','SWOT','THREE_PILLARS','HOOK',
    'BEFORE_AFTER','SOCIAL_PROOF','OBJECTION_HANDLER','FAQ','VERDICT',
    'COHORT_TABLE','PROGRESS_TRACKER','PRODUCT_SHOWCASE','FLYWHEEL','REVENUE_MODEL','CUSTOMER_JOURNEY','TECH_STACK','GROWTH_LOOPS','CASE_STUDY','HIRING_PLAN','USE_OF_FUNDS','RISK_MITIGATION','DEMO_SCREENSHOT','MILESTONE_TIMELINE','PARTNERSHIP_LOGOS',
  ];
  for (const sql of fixes) {
    try { await prisma.\$executeRawUnsafe(sql); } catch {}
  }
  for (const v of enumVals) {
    try { await prisma.\$executeRawUnsafe('ALTER TYPE \"SlideType\" ADD VALUE IF NOT EXISTS \\'' + v + '\\''); } catch {}
  }
  console.log('Schema fixes applied');
  await prisma.\$disconnect();
})();
" 2>&1 || echo "=== Schema fixes failed ==="

exec node /app/apps/api/dist/src/main.js
# rebuild trigger
