import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ThemesModule } from './themes/themes.module.js';
import { CreditsModule } from './credits/credits.module.js';
import { ExportsModule } from './exports/exports.module.js';
import { PresentationsModule } from './presentations/presentations.module.js';
import { ImagesModule } from './images/images.module.js';
import { ConstraintsModule } from './constraints/constraints.module.js';
import { HealthModule } from './health/health.module.js';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module.js';
import { EventsModule } from './events/events.module.js';
import { InteractionGateModule } from './chat/interaction-gate.module.js';
import { ChatModule } from './chat/chat.module.js';
import { BillingModule } from './billing/billing.module.js';
import { PitchLensModule } from './pitch-lens/pitch-lens.module.js';
import { PitchBriefModule } from './pitch-brief/pitch-brief.module.js';
import { GalleryModule } from './gallery/gallery.module.js';
import { ApiKeysModule } from './api-keys/api-keys.module.js';
import { ApiV1Module } from './api-v1/api-v1.module.js';
import { McpModule } from './mcp/mcp.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { EmailModule } from './email/email.module.js';
import { FigmaModule } from './figma/figma.module.js';
import { validate } from './config/env.validation.js';

// Parse REDIS_URL (Railway provides this) or fall back to host/port
const redisUrl = process.env['REDIS_URL'];
const redisConnection = redisUrl
  ? (() => {
      const u = new URL(redisUrl);
      return {
        host: u.hostname,
        port: +u.port || 6379,
        password: u.password || undefined,
      };
    })()
  : {
      host: process.env['REDIS_HOST'] || 'localhost',
      port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    };

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 30 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 300 },
    ]),
    BullModule.forRoot({
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: { age: 3600, count: 1000 },  // keep last 1000 or 1h
        removeOnFail: { age: 86400 },                  // keep failed jobs 24h
      },
    } as any),
    ScheduleModule.forRoot(),
    // Serve the React SPA from the built web app (production only)
    ...(process.env['NODE_ENV'] === 'production'
      ? [
          ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', '..', '..', 'web', 'dist'),
            // Only exclude API-only prefixes (no SPA route collision).
            // Prefixes with SPA pages (gallery, billing, chat, pitch-lens,
            // pitch-briefs, analytics) are NOT excluded — NestJS controller
            // routes are registered before the SPA fallback, so API sub-routes
            // are handled first and the bare SPA paths get index.html.
            exclude: [
              '/auth/{*path}',
              '/presentations/{*path}',
              '/credits/{*path}',
              '/exports/{*path}',
              '/health/{*path}',
              '/api/{*path}',
              '/api-keys/{*path}',
              '/themes/{*path}',
              '/constraints/{*path}',
              '/images/{*path}',
              '/knowledge-base/{*path}',
              '/mcp/{*path}',
              '/socket.io/{*path}',
              '/figma/{*path}',
              '/email/{*path}',
            ],
          }),
        ]
      : []),
    PrismaModule,
    AuthModule,
    ConstraintsModule,
    ThemesModule,
    CreditsModule,
    PresentationsModule,
    ImagesModule,
    ExportsModule,
    KnowledgeBaseModule,
    EventsModule,
    InteractionGateModule,
    ChatModule,
    BillingModule,
    PitchLensModule,
    PitchBriefModule,
    GalleryModule,
    ApiKeysModule,
    ApiV1Module,
    McpModule,
    AnalyticsModule,
    EmailModule,
    FigmaModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
