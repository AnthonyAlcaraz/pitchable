import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { EventsModule } from '../events/events.module.js';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module.js';
import { FigmaService } from './figma.service.js';
import { FigmaImageSyncService } from './figma-image-sync.service.js';
import { FigmaController } from './figma.controller.js';

@Module({
  imports: [PrismaModule, EventsModule, KnowledgeBaseModule],
  controllers: [FigmaController],
  providers: [FigmaService, FigmaImageSyncService],
  exports: [FigmaService, FigmaImageSyncService],
})
export class FigmaModule {}
