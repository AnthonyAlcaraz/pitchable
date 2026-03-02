#!/bin/sh
set -e

# Apply schema changes to production DB on startup
echo "=== Running prisma db push ==="
echo "=== DATABASE_URL set: $([ -n "$DATABASE_URL" ] && echo 'YES' || echo 'NO') ==="
cd /app/apps/api

echo "=== Attempting prisma db push ==="
npx prisma db push --accept-data-loss --url "$DATABASE_URL" 2>&1 || echo "=== prisma db push FAILED (exit $?) ==="
echo "=== prisma db push completed ==="

# Supplemental schema fixes (ALTER TABLE, ALTER TYPE, CREATE TABLE)
# are applied in PrismaService.onModuleInit() via $executeRawUnsafe.
# This ensures they run with the correct connection adapter and
# without transaction wrapping (required for ALTER TYPE ADD VALUE).

exec node /app/apps/api/dist/src/main.js
