import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CreditsModule } from '../credits/credits.module.js';
import { EventsModule } from '../events/events.module.js';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module.js';
import { ImagePromptBuilderService } from './image-prompt-builder.service.js';
import { NanoBananaService } from './nano-banana.service.js';
import { ImgurService } from './imgur.service.js';
import { ImageGenerationProcessor } from './image-generation.processor.js';
import { ImagesService } from './images.service.js';
import { ImagesController } from './images.controller.js';
import { ImageCriticService } from './image-critic.service.js';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    CreditsModule,
    EventsModule,
    KnowledgeBaseModule,
    BullModule.registerQueue({ name: 'image-generation' }),
  ],
  controllers: [ImagesController],
  providers: [
    ImagePromptBuilderService,
    NanoBananaService,
    ImageCriticService,
    ImgurService,
    ImageGenerationProcessor,
    ImagesService,
  ],
  exports: [ImagesService, ImagePromptBuilderService, NanoBananaService, ImageCriticService],
})
export class ImagesModule {}
