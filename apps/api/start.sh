#!/bin/sh
set -e

# Apply schema changes to production DB on startup
# Uses DATABASE_URL from Railway env vars directly
echo "=== Running prisma db push ==="
cd /app/apps/api
if npx prisma db push --skip-generate --accept-data-loss 2>&1; then
  echo "=== prisma db push succeeded ==="
else
  echo "=== prisma db push FAILED (exit code $?) — app will start anyway ==="
fi

exec node /app/apps/api/dist/src/main.js
