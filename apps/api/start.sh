#!/bin/sh
set -e

# Apply any pending schema changes (new enums, columns, etc.)
cd /app/apps/api && npx prisma db push --accept-data-loss --skip-generate

exec node /app/apps/api/dist/src/main.js
