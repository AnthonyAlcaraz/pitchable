#!/bin/sh
set -e

# Apply schema changes to production DB on startup
# Uses DATABASE_URL from Railway env vars directly
echo "Running prisma db push..."
cd /app/apps/api && npx prisma db push --skip-generate --schema prisma/schema.prisma 2>&1 || echo "prisma db push failed (non-fatal)"

exec node /app/apps/api/dist/src/main.js
