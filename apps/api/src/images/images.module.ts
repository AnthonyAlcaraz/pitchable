import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CreditsModule } from '../credits/credits.module.js';
import { ImagePromptBuilderService } from './image-prompt-builder.service.js';
import { NanoBananaService } from './nano-banana.service.js';
import { ImgurService } from './imgur.service.js';
import { ImageGenerationProcessor } from './image-generation.processor.js';
import { ImagesService } from './images.service.js';
import { ImagesController } from './images.controller.js';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    CreditsModule,
    BullModule.registerQueue({ name: 'image-generation' }),
  ],
  controllers: [ImagesController],
  providers: [
    ImagePromptBuilderService,
    NanoBananaService,
    ImgurService,
    ImageGenerationProcessor,
    ImagesService,
  ],
  exports: [ImagesService, ImagePromptBuilderService],
})
export class ImagesModule {}
