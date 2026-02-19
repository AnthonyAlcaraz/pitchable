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

# Generate Prisma client
RUN cd apps/api && npx prisma generate

# Build only the packages we need (api + web)
RUN npx turbo run build --filter='@deckpilot/api' --filter='@deckpilot/web'

# Prisma generates ESM TypeScript (package.json has "type":"module").
# tsc compiles these to ESM JS in dist/generated/prisma/, but doesn't copy
# the package.json. Node.js needs it there to treat .js files as ESM at runtime.
# prisma generate doesn't create package.json in Docker, so we write it directly.
RUN echo '{"type":"module"}' > apps/api/dist/generated/prisma/package.json \
    && echo "=== generated/prisma/ contents ===" \
    && ls -la apps/api/generated/prisma/ \
    && echo "=== dist/generated/prisma/ contents ===" \
    && ls -la apps/api/dist/generated/prisma/ \
    && echo "=== dist/generated/prisma/client.js format check ===" \
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
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

# Copy built outputs
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/generated ./apps/api/generated
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma

# Copy node_modules (production deps)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

# Copy package.json files (needed for module resolution)
COPY --from=build /app/package.json ./
COPY --from=build /app/apps/api/package.json ./apps/api/

EXPOSE 3000

CMD ["node", "apps/api/dist/src/main.js"]
