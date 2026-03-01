# ── Stage 1: Install dependencies ──────────────────────────────
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build everything ──────────────────────────────────
FROM node:22-slim AS build

RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY . .

# Generate Prisma client (cache bust: 12-new-types-v1)
RUN echo "enum-bust-1772368384" && cd apps/api && npx prisma generate && grep FLYWHEEL generated/prisma/enums.ts && echo "=== FLYWHEEL enum confirmed in generated client ==="

# Prisma generate in Docker doesn't always create package.json with "type":"module".
# Without it, tsc compiles the generated .ts files as CJS instead of ESM.
# We must ensure it exists BEFORE tsc runs so it compiles to ESM like local dev.
RUN echo '{"type":"module"}' > apps/api/generated/prisma/package.json

# Build only the packages we need (api + web)
RUN npx turbo run build --force --filter='@deckpilot/api' --filter='@deckpilot/web'

# tsc doesn't copy package.json files to dist/. Node.js needs it there
# to treat the ESM-compiled .js files as ESM at runtime.
RUN cp apps/api/generated/prisma/package.json apps/api/dist/generated/prisma/package.json \
    && echo "=== dist/generated/prisma/client.js (first 5 lines) ===" \
    && head -5 apps/api/dist/generated/prisma/client.js

# ── Stage 3: Production image ─────────────────────────────────
FROM node:22-slim AS prod

# Install Chromium and system deps for Marp CLI PDF export
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgbm1 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libcups2 \
    fonts-liberation \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CHROME_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

# Copy built outputs
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/generated ./apps/api/generated
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=build /app/apps/api/public ./apps/api/public

# Copy node_modules (production deps)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

# Copy package.json files (needed for module resolution)
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json ./apps/api/

# Copy startup script (runs prisma db push before app)
COPY apps/api/start.sh ./apps/api/start.sh
RUN chmod +x ./apps/api/start.sh

EXPOSE 3000

CMD ["./apps/api/start.sh"]
