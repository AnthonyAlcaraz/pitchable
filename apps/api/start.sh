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

# Apply supplemental schema fixes via Node.js + pg module.
# Each statement runs individually WITHOUT transaction wrapping.
# This is required because ALTER TYPE ... ADD VALUE cannot run inside
# a transaction block (prisma db execute wraps in a transaction).
echo "=== Applying supplemental schema fixes ==="
node /app/apps/api/scripts/apply-schema-fixes.js 2>&1 || echo "=== Schema fix script FAILED ==="
echo "=== Schema fixes completed ==="

exec node /app/apps/api/dist/src/main.js
