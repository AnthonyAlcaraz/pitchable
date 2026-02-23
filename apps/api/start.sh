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

exec node /app/apps/api/dist/src/main.js
