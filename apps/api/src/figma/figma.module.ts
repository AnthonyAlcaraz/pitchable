import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EventsModule } from '../events/events.module.js';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module.js';
import { FigmaService } from './figma.service.js';
import { FigmaImageSyncService } from './figma-image-sync.service.js';
import { FigmaController } from './figma.controller.js';
import { FigmaTemplateController } from './figma-template.controller.js';
import { FigmaTemplateService } from './figma-template.service.js';
import { FigmaRendererService } from './figma-renderer.service.js';
import { FigmaWebhookController } from './figma-webhook.controller.js';
import { FigmaWebhookService } from './figma-webhook.service.js';
import { FigmaSyncProcessor } from './figma-sync.processor.js';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    KnowledgeBaseModule,
    BullModule.registerQueue({ name: 'figma-sync' }),
  ],
  controllers: [FigmaController, FigmaTemplateController, FigmaWebhookController],
  providers: [
    FigmaService,
    FigmaImageSyncService,
    FigmaTemplateService,
    FigmaRendererService,
    FigmaWebhookService,
    FigmaSyncProcessor,
  ],
  exports: [
    FigmaService,
    FigmaImageSyncService,
    FigmaTemplateService,
    FigmaRendererService,
    FigmaWebhookService,
  ],
})
export class FigmaModule {}
