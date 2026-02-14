# Phase 1: Foundation + Design Engine - Research

**Researched:** 2026-02-14
**Domain:** NestJS 11 + Prisma 7 + Auth + Design Constraints + Docker Infrastructure
**Confidence:** HIGH

## Summary

Phase 1 covers 19 requirements across three domains: Authentication (AUTH-01..04), Design Constraints (DC-01..08), and Infrastructure (INF-01..07). The project already has a scaffolded NestJS 11 application with Prisma 7, a basic JWT auth module using bcrypt, a Docker Compose with PostgreSQL 16 and Redis 7, and a substantial design constraint engine (color, typography, density validators with ~500 lines of working code).

The scaffold has significant gaps relative to Phase 1 requirements:
- Auth uses bcrypt (not argon2id), single JWT (no refresh token), no logout/invalidate, no password reset
- Docker Compose uses plain `postgres:16-alpine` (no pgvector), missing MinIO
- PrismaService extends PrismaClient directly without the Prisma 7 driver adapter pattern
- No Swagger, rate limiting, health checks, or structured error handling
- Design engine covers DC-01 through DC-05 and DC-07 but needs DC-06 (layout rules) and DC-08 (5 themes with validation proof)

**Primary recommendation:** Build Phase 1 as five incremental plans that upgrade the existing scaffold rather than rewriting from scratch. The constraint engine and themes are ~80% done; auth needs a full rewrite from bcrypt single-token to argon2id dual-token; infrastructure needs everything added fresh.

## Existing Codebase State (CRITICAL for planning)

The project is NOT a blank scaffold. The planner MUST account for existing code.

### What Already Exists

| Component | File(s) | Status | Gaps |
|-----------|---------|--------|------|
| NestJS scaffold | `src/`, `nest-cli.json`, `tsconfig.json` | Working | Missing `"type": "module"` in package.json for Prisma 7 ESM |
| Prisma 7 schema | `prisma/schema.prisma` | 9 models defined | Missing `refreshToken` + `refreshTokenHash` on User model; PrismaService lacks driver adapter |
| PrismaService | `src/prisma/prisma.service.ts` | Working | Extends PrismaClient without adapter (Prisma 7 requires `@prisma/adapter-pg`) |
| Docker Compose | `docker-compose.yml` | Postgres 16 + Redis 7 | Missing pgvector extension image, missing MinIO |
| Auth module | `src/auth/` | 8 files | Uses bcrypt (not argon2id), single JWT (no refresh), no logout, no password reset |
| Constraint engine | `src/constraints/` | 5 files, ~500 LOC | Missing layout rules (DC-06), max 3 colors/slide, max 2 columns |
| Themes | `src/themes/` | 5 themes seeded | All 5 themes defined with validated palettes and font pairings |
| App module | `src/app.module.ts` | All modules imported | ConfigModule, BullMQ, Prisma, Auth, Constraints, Themes all wired |
| package.json | `package.json` | Dependencies installed | Missing argon2, @nestjs/throttler, @nestjs/terminus, @nestjs/swagger, helmet, resend/nodemailer |

### What Must Be Changed (Not Created)

1. **PrismaService**: Add `@prisma/adapter-pg` driver adapter (Prisma 7 requirement)
2. **AuthService**: Replace bcrypt with argon2id, add refresh token rotation, add logout/invalidate, add password reset
3. **User model**: Add `refreshTokenHash` field, add `passwordResetToken`/`passwordResetExpiry` fields
4. **Docker Compose**: Replace `postgres:16-alpine` with `pgvector/pgvector:pg16`, add MinIO service
5. **main.ts**: Add Swagger setup, ValidationPipe, helmet, CORS
6. **Constraint engine**: Add layout validator (DC-06)

## Standard Stack

### Core (Phase 1 specific packages to ADD)

| Library | Version | Purpose | Why Standard | Confidence |
|---------|---------|---------|--------------|------------|
| argon2 | 0.44.0 | Password hashing (AUTH-01) | OWASP 2024 recommendation. Replaces bcrypt. Memory-hard, resistant to GPU attacks. | HIGH |
| @nestjs/swagger | 11.2.6 | OpenAPI docs (INF-03) | Official NestJS module. Auto-generates from decorators. Peer: @nestjs/common ^11.0.1 | HIGH |
| @nestjs/throttler | 6.5.0 | Rate limiting (INF-05) | Official NestJS module. Supports NestJS 11. In-memory or Redis storage. | HIGH |
| @nestjs/terminus | 11.0.0 | Health checks (INF-07) | Official NestJS module. Supports Prisma, Redis, custom indicators. | HIGH |
| helmet | 8.1.0 | HTTP security headers | CSP, X-Frame-Options, etc. One-line Express middleware. | HIGH |
| @prisma/adapter-pg | 7.4.0 | Prisma 7 PostgreSQL adapter | Required by Prisma 7 for driver-adapter based connections. Ships with `pg` 8.16.3. | HIGH |
| resend | 6.9.2 | Transactional email (AUTH-04) | Modern email API. Simpler than nodemailer+SMTP. Free tier: 100 emails/day. | HIGH |
| swagger-ui-express | latest | Swagger UI rendering | Required by @nestjs/swagger for serving the docs UI. | HIGH |

### Already Installed (verified from package.json)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| @nestjs/core | ^11.0.1 | NestJS framework | Installed |
| @prisma/client | ^7.4.0 | Prisma ORM | Installed |
| @nestjs/passport | ^11.0.5 | Auth framework | Installed |
| @nestjs/jwt | ^11.0.2 | JWT operations | Installed |
| passport-jwt | ^4.0.1 | JWT strategy | Installed |
| class-validator | ^0.14.3 | DTO validation (INF-04) | Installed |
| class-transformer | ^0.5.1 | DTO transformation | Installed |
| @nestjs/config | ^4.0.3 | Env configuration (INF-02) | Installed |
| @nestjs/bullmq | ^11.0.4 | Queue integration | Installed |
| bcrypt | ^6.0.0 | Password hashing (TO REMOVE) | Installed, must be replaced |

### To Remove

| Library | Reason |
|---------|--------|
| bcrypt | Replace with argon2 per OWASP 2024. Stack decision: argon2id. |
| @types/bcrypt | No longer needed after bcrypt removal |

### Installation Command

```bash
# Add new dependencies
npm install argon2 @nestjs/swagger swagger-ui-express @nestjs/throttler @nestjs/terminus helmet @prisma/adapter-pg resend

# Add dev dependencies
npm install -D @types/express

# Remove bcrypt
npm uninstall bcrypt @types/bcrypt
```

## Architecture Patterns

### Pattern 1: Prisma 7 Service with Driver Adapter

The existing `PrismaService` extends `PrismaClient` directly. Prisma 7 requires a driver adapter.

**Current (broken for Prisma 7):**
```typescript
@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

**Correct Prisma 7 pattern:**
```typescript
// Source: https://www.prisma.io/docs/guides/nestjs (Feb 2026)
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.get<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

**Key differences from old pattern:**
- No `onModuleInit` / `$connect()` needed -- Prisma 7 with driver adapter connects lazily
- Driver adapter handles connection pooling (defaults: connection timeout 0, idle timeout 10s)
- `@prisma/adapter-pg` ships with `pg` 8.16.3 as a dependency
- ConfigService injected to read DATABASE_URL from environment

**Confidence:** HIGH -- verified from official Prisma docs for NestJS (Feb 2026)

### Pattern 2: JWT Access + Refresh Token with argon2id

The existing auth uses single JWT + bcrypt. Phase 1 requires dual tokens + argon2id.

**Architecture:**
```
Login flow:
  1. User sends email+password
  2. Server verifies password with argon2.verify()
  3. Server generates access token (15 min) + refresh token (7 days)
  4. Refresh token hashed with argon2 and stored in User.refreshTokenHash
  5. Both tokens returned to client

Refresh flow:
  1. Client sends expired access token + valid refresh token
  2. Server loads user, verifies refresh token hash
  3. Server issues new access+refresh token pair (rotation)
  4. Old refresh token hash replaced

Logout flow:
  1. Server nullifies User.refreshTokenHash
  2. Refresh token becomes invalid
```

**Code pattern:**
```typescript
// Source: https://www.elvisduru.com/blog/nestjs-jwt-authentication-refresh-token
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  async getTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        { secret: this.configService.get('JWT_ACCESS_SECRET'), expiresIn: '15m' },
      ),
      this.jwtService.signAsync(
        { sub: userId, email, role },
        { secret: this.configService.get('JWT_REFRESH_SECRET'), expiresIn: '7d' },
      ),
    ]);
    return { accessToken, refreshToken };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hash = await argon2.hash(refreshToken);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshTokenHash) throw new ForbiddenException('Access Denied');

    const matches = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!matches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null },
    });
  }
}
```

**Two strategies required:**
```typescript
// AccessTokenStrategy -- validates access tokens
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_ACCESS_SECRET'),
    });
  }
  validate(payload: JwtPayload) { return payload; }
}

// RefreshTokenStrategy -- validates refresh tokens, passes raw token
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }
  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.get('Authorization')?.replace('Bearer', '').trim();
    return { ...payload, refreshToken };
  }
}
```

**Confidence:** HIGH -- pattern verified from multiple NestJS auth tutorials and the argon2 npm docs

### Pattern 3: Password Reset via Email

```
Flow:
  1. User submits email to /auth/forgot-password
  2. Server generates a signed JWT with email payload (expires 1h)
  3. Server sends email with link: https://app.com/reset-password?token=<jwt>
  4. User clicks link, enters new password
  5. Server verifies JWT, hashes new password with argon2, saves
  6. Server nullifies refreshTokenHash (forces re-login)
```

**Email provider:** Resend (v6.9.2). Free tier: 100 emails/day, 3,000/month. No SMTP config needed.

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@slideforge.app',
  to: email,
  subject: 'Reset your SlideForge password',
  html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.</p>`,
});
```

**Confidence:** HIGH

### Pattern 4: Docker Compose with pgvector + MinIO

```yaml
# Source: https://hub.docker.com/r/pgvector/pgvector
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16    # NOT postgres:16-alpine
    environment:
      POSTGRES_USER: slideforge
      POSTGRES_PASSWORD: slideforge_dev
      POSTGRES_DB: slideforge
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U slideforge"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redisdata:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - '9000:9000'    # API
      - '9001:9001'    # Console
    volumes:
      - miniodata:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "mc", "ready", "local"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
  miniodata:
```

**pgvector extension initialization:**
The `pgvector/pgvector:pg16` image comes with the extension pre-installed. To enable it in the database:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
This can be done in a Prisma migration or an init script mounted at `/docker-entrypoint-initdb.d/`.

**Confidence:** HIGH -- `pgvector/pgvector` is the official Docker image, updated within 24h of research

### Pattern 5: Swagger Setup with CLI Plugin

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors();

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('SlideForge API')
    .setDescription('AI Presentation Generation Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

**nest-cli.json plugin config** (auto-adds @ApiProperty decorators at compile time):
```json
{
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": [
      {
        "name": "@nestjs/swagger",
        "options": {
          "classValidatorShim": true,
          "introspectComments": true
        }
      }
    ]
  }
}
```

**Confidence:** HIGH -- verified from official NestJS OpenAPI docs

### Pattern 6: Rate Limiting with @nestjs/throttler

```typescript
// app.module.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'short', ttl: seconds(1), limit: 3 },   // 3 req/sec
      { name: 'medium', ttl: seconds(10), limit: 20 }, // 20 req/10s
      { name: 'long', ttl: seconds(60), limit: 100 },  // 100 req/min
    ]),
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
```

Per-route override:
```typescript
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Throttle({ short: { limit: 1, ttl: seconds(1) } }) // Stricter on login
@Post('login')
login() { ... }

@SkipThrottle() // No rate limit on health check
@Get('health')
health() { ... }
```

**For production with multiple instances:** Use Redis storage (ThrottlerStorageRedisService) instead of in-memory.

**Confidence:** HIGH -- @nestjs/throttler 6.5.0 verified for NestJS 11 support

### Pattern 7: Health Checks with @nestjs/terminus

```typescript
// health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }
}
```

**Note:** @nestjs/terminus 11.0.0 has `@prisma/client` as an optional peer dependency, meaning PrismaHealthIndicator works natively.

**Confidence:** HIGH

### Pattern 8: Structured Error Responses (INF-06)

```typescript
// common/filters/http-exception.filter.ts
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'string' ? message : (message as any).message,
      error: typeof message === 'object' ? (message as any).error : undefined,
    };

    response.status(status).json(errorResponse);
  }
}
```

Register globally in main.ts:
```typescript
app.useGlobalFilters(new AllExceptionsFilter());
```

**Confidence:** HIGH

### Recommended Module Structure for Phase 1

```
src/
  auth/
    auth.controller.ts        # Endpoints: register, login, logout, refresh, forgot-password, reset-password
    auth.module.ts             # JwtModule with separate access/refresh secrets
    auth.service.ts            # argon2 hashing, dual JWT generation, refresh rotation
    strategies/
      access-token.strategy.ts # PassportStrategy('jwt')
      refresh-token.strategy.ts # PassportStrategy('jwt-refresh')
    guards/
      access-token.guard.ts    # AuthGuard('jwt')
      refresh-token.guard.ts   # AuthGuard('jwt-refresh')
      roles.guard.ts           # Role-based access
    dto/
      register.dto.ts          # class-validator: email, password, name
      login.dto.ts             # class-validator: email, password
      forgot-password.dto.ts   # email
      reset-password.dto.ts    # token, newPassword
    decorators/
      current-user.decorator.ts
      roles.decorator.ts
  constraints/
    color-validator.ts         # EXISTING: WCAG contrast, forbidden pairs
    typography-validator.ts    # EXISTING: font whitelist, sizes, pairing
    density-validator.ts       # EXISTING: bullet count, word count, auto-split
    layout-validator.ts        # NEW: max columns, max font sizes, max colors per slide
    constraints.module.ts
    constraints.service.ts     # Unified validation entry point
    index.ts                   # Barrel exports
  themes/
    themes.controller.ts
    themes.module.ts
    themes.service.ts          # EXISTING: 5 built-in themes with seed
  prisma/
    prisma.service.ts          # Prisma 7 with driver adapter
    prisma.module.ts           # @Global module
  health/
    health.controller.ts       # NEW: /health endpoint
    health.module.ts           # NEW: TerminusModule
  common/
    filters/
      http-exception.filter.ts # NEW: Structured error responses
    interceptors/
      logging.interceptor.ts   # NEW: Request logging
  main.ts                      # Swagger, helmet, CORS, ValidationPipe, global filters
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WCAG contrast ratio | Custom math | Existing `color-validator.ts` + W3C formula | Already implemented correctly with sRGB linearization and WCAG formula |
| Password hashing | Custom crypto | argon2 (v0.44.0) | Cryptographic hashing must use audited implementations. Never roll your own. |
| JWT token generation | Manual token creation | @nestjs/jwt (v11.0.2) | Token signing, verification, expiry all handled. Tested against JWT spec. |
| Rate limiting | Custom middleware | @nestjs/throttler (v6.5.0) | Handles IP tracking, sliding windows, per-route config. Redis backing for multi-instance. |
| Health checks | Custom /health endpoint | @nestjs/terminus (v11.0.0) | Standard health check format. Built-in indicators for Prisma, Redis, HTTP. |
| API documentation | Manual OpenAPI JSON | @nestjs/swagger (v11.2.6) + CLI plugin | Auto-generates from decorators and DTOs. CLI plugin eliminates @ApiProperty boilerplate. |
| Email sending | Raw SMTP / nodemailer | Resend (v6.9.2) | Deliverability, templates, analytics built in. No SMTP server config. |
| Hex color parsing | Regex + parseInt | Existing `hexToRgb()` in color-validator.ts | Already handles validation, short hex, edge cases |

## Common Pitfalls

### Pitfall 1: Prisma 7 Missing Driver Adapter

**What goes wrong:** PrismaService extends PrismaClient without passing an adapter. Prisma 7 requires driver adapters for relational databases. Without it, the client may fail silently or throw cryptic connection errors.
**Why it happens:** Prisma 6 pattern (extend PrismaClient, call $connect) is everywhere in tutorials. Prisma 7 changed the connection model.
**How to avoid:** Always pass `{ adapter: new PrismaPg({ connectionString }) }` to the PrismaClient constructor. Remove $connect() calls -- Prisma 7 with adapters connects lazily.
**Warning signs:** "Cannot find module 'prisma-fmt-*'" errors, connection timeout on first query.

### Pitfall 2: Single JWT Secret for Both Token Types

**What goes wrong:** Using the same JWT_SECRET for access and refresh tokens means a stolen access token can be used as a refresh token, defeating the purpose of short-lived access tokens.
**Why it happens:** Simpler configuration with one secret. Tutorials often skip this.
**How to avoid:** Use two secrets: `JWT_ACCESS_SECRET` (for 15-min access tokens) and `JWT_REFRESH_SECRET` (for 7-day refresh tokens). Different secrets, different strategies, different guards.
**Warning signs:** AuthModule has a single `secret` in JwtModule config.

### Pitfall 3: Refresh Token Stored in Plain Text

**What goes wrong:** If the database is compromised, refresh tokens can be used directly to generate access tokens.
**Why it happens:** Developers hash the password but forget the refresh token is also a credential.
**How to avoid:** Hash refresh tokens with argon2 before storing. Verify with `argon2.verify()`.
**Warning signs:** `refreshToken` field in User model is a plain string, not `refreshTokenHash`.

### Pitfall 4: bcrypt + argon2 Migration Confusion

**What goes wrong:** Existing passwords hashed with bcrypt cannot be verified with argon2. If you swap the library without a migration strategy, all existing users get locked out.
**Why it happens:** Hash format is different. bcrypt hashes start with `$2b$`, argon2 hashes start with `$argon2id$`.
**How to avoid:** Since there are no production users yet, do a clean swap. If there were users, you'd need a dual-verify fallback that checks the hash prefix and uses the correct library.
**Warning signs:** Login failures after library swap on a database with existing users.

### Pitfall 5: Rate Limiter Using In-Memory Storage in Multi-Instance

**What goes wrong:** Each NestJS instance has its own rate limit counter. A user can bypass limits by hitting different instances.
**Why it happens:** @nestjs/throttler defaults to in-memory storage.
**How to avoid:** For single-instance MVP, in-memory is fine. For production, configure ThrottlerStorageRedisService. Plan the switch now, implement when scaling.
**Warning signs:** Rate limiting working in dev (single instance) but ineffective in production (multiple instances behind a load balancer).

### Pitfall 6: Swagger Plugin Not Configured in nest-cli.json

**What goes wrong:** Every DTO property needs an `@ApiProperty()` decorator manually. Without the CLI plugin, Swagger docs show empty request bodies and response schemas.
**Why it happens:** The plugin is opt-in via nest-cli.json, not enabled by default.
**How to avoid:** Add the `@nestjs/swagger` plugin to `nest-cli.json` `compilerOptions.plugins`. Enable `classValidatorShim: true` to auto-infer types from class-validator decorators.
**Warning signs:** Swagger UI shows `{}` for request/response bodies despite DTOs having class-validator decorators.

### Pitfall 7: Missing pgvector Extension in Docker

**What goes wrong:** Prisma migrations that reference the `vector` type fail because the pgvector extension is not installed.
**Why it happens:** Using `postgres:16-alpine` image instead of `pgvector/pgvector:pg16`. The extension needs to be explicitly created.
**How to avoid:** Use `pgvector/pgvector:pg16` Docker image (extension pre-installed) AND run `CREATE EXTENSION IF NOT EXISTS vector;` in the first migration or init script.
**Warning signs:** `ERROR: type "vector" does not exist` during migration.

### Pitfall 8: ValidationPipe Not Configured Globally

**What goes wrong:** DTOs with class-validator decorators are silently ignored. Invalid data reaches service layer.
**Why it happens:** NestJS does not enable validation globally by default. You must register the pipe.
**How to avoid:** In main.ts: `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`. The `whitelist` strips unknown properties, `forbidNonWhitelisted` rejects requests with extra fields.
**Warning signs:** API accepts any JSON body without validation errors.

## Code Examples

### argon2 Password Hashing (replaces bcrypt)

```typescript
import * as argon2 from 'argon2';

// Hash a password (registration)
const passwordHash = await argon2.hash(password, {
  type: argon2.argon2id,  // argon2id is the recommended variant
  memoryCost: 65536,       // 64 MB (OWASP minimum recommendation)
  timeCost: 3,             // 3 iterations
  parallelism: 4,          // 4 threads
});

// Verify a password (login)
const isValid = await argon2.verify(passwordHash, password);
// Returns: true | false (no timing side-channel)
```

**Note:** argon2 v0.44.0 ships with prebuilt binaries from v0.26.0+. No node-gyp or C++ compiler needed. TypeScript types included.

### Prisma Schema Updates for Auth

```prisma
model User {
  id                  String   @id @default(uuid()) @db.Uuid
  email               String   @unique
  passwordHash        String
  refreshTokenHash    String?   // NEW: hashed refresh token for rotation
  name                String
  role                UserRole  @default(USER)
  creditBalance       Int       @default(0)
  tier                UserTier  @default(FREE)
  passwordResetToken  String?   // NEW: JWT for password reset
  passwordResetExpiry DateTime? // NEW: when the reset token expires
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  presentations      Presentation[]
  creditTransactions CreditTransaction[]

  @@index([email])
}
```

### Layout Validator (DC-06 -- NEW, does not exist yet)

```typescript
// constraints/layout-validator.ts
export interface LayoutConfig {
  columns: number;
  fontSizesUsed: number[];
  colorsUsed: string[];
  hasFullBleedText: boolean;
  overlayOpacity?: number;  // 0-100 percentage
}

export interface LayoutValidationResult {
  valid: boolean;
  violations: string[];
}

export const LAYOUT_LIMITS = {
  maxColumns: 2,
  maxDistinctFontSizes: 3,
  maxDistinctColors: 3,
  minOverlayOpacity: 30,  // % overlay required for full-bleed text
} as const;

export function validateLayout(layout: LayoutConfig): LayoutValidationResult {
  const violations: string[] = [];

  if (layout.columns > LAYOUT_LIMITS.maxColumns) {
    violations.push(
      `Layout uses ${layout.columns} columns (max ${LAYOUT_LIMITS.maxColumns}).`
    );
  }

  const uniqueSizes = [...new Set(layout.fontSizesUsed)];
  if (uniqueSizes.length > LAYOUT_LIMITS.maxDistinctFontSizes) {
    violations.push(
      `Slide uses ${uniqueSizes.length} distinct font sizes (max ${LAYOUT_LIMITS.maxDistinctFontSizes}).`
    );
  }

  const uniqueColors = [...new Set(layout.colorsUsed.map(c => c.toLowerCase()))];
  if (uniqueColors.length > LAYOUT_LIMITS.maxDistinctColors) {
    violations.push(
      `Slide uses ${uniqueColors.length} distinct colors (max ${LAYOUT_LIMITS.maxDistinctColors}).`
    );
  }

  if (layout.hasFullBleedText) {
    const opacity = layout.overlayOpacity ?? 0;
    if (opacity < LAYOUT_LIMITS.minOverlayOpacity) {
      violations.push(
        `Full-bleed text without sufficient overlay (${opacity}%, min ${LAYOUT_LIMITS.minOverlayOpacity}%).`
      );
    }
  }

  return { valid: violations.length === 0, violations };
}
```

### Environment Configuration (.env)

```env
# Database
DATABASE_URL=postgresql://slideforge:slideforge_dev@localhost:5432/slideforge

# JWT
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars-different

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
MINIO_USE_SSL=false

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
FRONTEND_URL=http://localhost:3001

# App
PORT=3000
NODE_ENV=development
```

### @nestjs/config Validation Schema

```typescript
// config/env.validation.ts
import { plainToInstance, Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync, IsEnum } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  REDIS_PORT: number = 6379;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  PORT: number = 3000;
}

export function validate(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validated;
}
```

Usage in AppModule:
```typescript
ConfigModule.forRoot({
  isGlobal: true,
  validate,
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| bcrypt for password hashing | argon2id | OWASP 2024 | argon2id is memory-hard, resistant to GPU attacks. bcrypt still works but is not recommended for new projects. |
| PrismaClient extends directly | PrismaClient with driver adapter | Prisma 7 (Dec 2025) | Rust engine removed. Pure JS. Driver adapters required for all relational DBs. |
| JwtModule.register({ secret }) | Separate access/refresh secrets | Best practice since ~2022 | Single-secret approach allows access token reuse as refresh token. |
| Express middleware rate limiting | @nestjs/throttler 6.x | Throttler v6 (2025) | Named throttlers, helper functions (seconds/minutes), NestJS 11 support. |
| Manual @ApiProperty on every DTO | @nestjs/swagger CLI plugin | @nestjs/swagger 7+ | Plugin reads class-validator decorators at compile time, eliminates boilerplate. |
| Multer for file uploads | S3 presigned URLs | Industry shift ~2023 | Presigned URLs bypass server memory/bandwidth. Use for MinIO in dev. |

**Deprecated/outdated patterns in existing code:**
- `bcrypt` import in auth.service.ts -- replace with argon2
- `PrismaService extends PrismaClient` without adapter -- add @prisma/adapter-pg
- `JwtModule.register({ secret, signOptions: { expiresIn: '24h' } })` -- 24h access token is too long, use 15m access + 7d refresh

## Design Constraint Engine Gap Analysis

### Requirements vs Implementation

| Requirement | ID | Status | File | Gap |
|-------------|------|--------|------|-----|
| WCAG color contrast validation | DC-01 | DONE | color-validator.ts | `validateTextContrast()` with 4.5:1 body, 3:1 large text thresholds |
| Banned color pairs | DC-02 | DONE | color-validator.ts | `FORBIDDEN_PAIRS` array with HSL range matching, 4 pairs defined |
| Typography rules (max 2 fonts, min 24pt, sans-serif only, banned fonts) | DC-03 | PARTIAL | typography-validator.ts | Font whitelist exists (10 fonts), size minimums exist. BUT: min body size is 18pt not 24pt per requirement. Banned fonts (Comic Sans, Papyrus, etc.) not explicitly listed -- they just fail the whitelist. Requirement says "sans-serif only" which is enforced by whitelist. |
| Banned font pairings | DC-04 | DONE | typography-validator.ts | `validateFontPairing()` checks same-category and identical fonts |
| Content density limits | DC-05 | PARTIAL | density-validator.ts | Max bullets = 5 (req says 6), max words = 80 (matches). Missing: max 10 words/bullet check |
| Layout rules | DC-06 | MISSING | -- | No layout validator exists. Need: max 2 columns, max 3 font sizes, max 3 colors, overlay check |
| Auto-split slides | DC-07 | DONE | density-validator.ts | `suggestSplit()` handles bullet and sentence splitting |
| 5 built-in themes | DC-08 | DONE | themes.service.ts | 5 themes with validated palettes and font pairings |

### Fixes Needed

1. **DC-03**: Update `FONT_SIZE_MINIMUMS.body` from 18 to 24 (requirement says "min 24pt body")
2. **DC-05**: Update `DENSITY_LIMITS.maxBulletsPerSlide` from 5 to 6 (requirement says "max 6 bullets"). Add max 10 words/bullet validation.
3. **DC-06**: Create new `layout-validator.ts` (see code example above)
4. **DC-08**: Add validation proof -- run each theme through `validateSlideDesign()` as a unit test to prove all 5 pass

## Open Questions

1. **ESM in package.json**: The existing `package.json` does NOT have `"type": "module"`. Prisma 7 docs recommend ESM for the generated client. The tsconfig uses `"module": "nodenext"` which supports both. Need to determine if adding `"type": "module"` breaks existing imports. Recommendation: test adding it; if imports break, use `.js` extensions on all relative imports (some already exist in the codebase).

2. **Resend vs Nodemailer**: Both work for password reset emails. Resend is simpler (API call, no SMTP) but requires a paid domain for custom from address. Nodemailer with a dev SMTP service (Mailtrap, Ethereal) is free for development. Recommendation: Use Resend for simplicity; the free tier (100 emails/day) is enough for Phase 1.

3. **Theme validation proof**: The 5 built-in themes need to be proven valid by running them through the constraint engine. The `creative-warm` theme uses Poppins (heading) + DM Sans (body) -- both geometric sans-serif. The `validateFontPairing()` function would flag this as invalid. Either: (a) update the theme's font pairing, or (b) relax the same-category rule for built-in themes. Recommendation: fix the font pairing in the theme definition.

4. **argon2 on Windows**: The `argon2` npm package ships prebuilt binaries. If native compilation fails on Windows, the alternative `@node-rs/argon2` (v2.0.2) provides the same API without node-gyp. Both are acceptable.

## Sources

### Primary (HIGH confidence)
- [Prisma + NestJS Official Guide](https://www.prisma.io/docs/guides/nestjs) -- Prisma 7 driver adapter pattern, PrismaService setup
- [@prisma/adapter-pg 7.4.0](https://www.npmjs.com/package/@prisma/adapter-pg) -- verified via npm registry Feb 14, 2026
- [@nestjs/swagger 11.2.6](https://www.npmjs.com/package/@nestjs/swagger) -- peer: @nestjs/common ^11.0.1
- [@nestjs/throttler 6.5.0](https://github.com/nestjs/throttler) -- NestJS 11 support confirmed
- [@nestjs/terminus 11.0.0](https://www.npmjs.com/package/@nestjs/terminus) -- @prisma/client as optional peer dep
- [argon2 0.44.0](https://www.npmjs.com/package/argon2) -- prebuilt binaries, TypeScript types included
- [pgvector/pgvector Docker](https://hub.docker.com/r/pgvector/pgvector) -- official image, updated Feb 13, 2026
- [WCAG Relative Luminance](https://www.w3.org/WAI/GL/wiki/Relative_luminance) -- W3C standard formula
- [WCAG Contrast Ratio](https://www.w3.org/WAI/GL/wiki/Contrast_ratio) -- (L1+0.05)/(L2+0.05)

### Secondary (MEDIUM confidence)
- [NestJS JWT Auth with Refresh Tokens](https://www.elvisduru.com/blog/nestjs-jwt-authentication-refresh-token) -- dual strategy pattern verified
- [Prisma 7 ESM Setup](https://medium.com/@iyanu752/setting-up-your-nestjs-server-with-prisma-7-and-supabase-590b36e6f22d) -- ESM config requirements
- [MinIO Docker Compose](https://www.datacamp.com/tutorial/minio-docker) -- env vars, healthcheck

### Tertiary (LOW confidence)
- NestJS CLI plugin auto-documentation behavior -- verified from NestJS docs but could not extract full page content; based on training data + multiple blog posts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified via npm registry on Feb 14, 2026
- Architecture: HIGH -- patterns from official docs (Prisma, NestJS) and verified tutorials
- Pitfalls: HIGH -- most derived from examining actual codebase gaps + official migration guides
- Design engine gaps: HIGH -- line-by-line comparison of existing code vs requirements

**Existing code assessment:**
- Constraint engine: ~80% complete (missing DC-06 layout rules, minor constant adjustments)
- Auth: ~30% complete (working bcrypt JWT, needs argon2id + refresh tokens + password reset)
- Infrastructure: ~20% complete (Docker + Prisma exist, everything else missing)
- Themes: ~90% complete (5 themes exist, 1 font pairing may need fix)

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (stable ecosystem, 30-day validity)

---
*Phase 1 research for: SlideForge AI Presentation SaaS*
*Researched: 2026-02-14*
