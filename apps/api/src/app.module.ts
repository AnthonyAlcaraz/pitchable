import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 3 },
      { name: 'medium', ttl: 10000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    BullModule.forRoot({
      connection: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
      },
    }),
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
