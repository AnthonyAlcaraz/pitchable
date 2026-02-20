#!/bin/sh
set -e

echo "Running Prisma schema sync..."
cd /app/apps/api && npx prisma db push --skip-generate --accept-data-loss 2>&1 || echo "Warning: prisma db push failed, continuing..."

echo "Starting application..."
exec node /app/apps/api/dist/src/main.js
