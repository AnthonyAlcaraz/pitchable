import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PitchBriefService } from './pitch-brief.service.js';
import { PitchBriefController } from './pitch-brief.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module.js';

@Module({
  imports: [
    PrismaModule,
    KnowledgeBaseModule,
    BullModule.registerQueue({ name: 'document-processing' }),
  ],
  controllers: [PitchBriefController],
  providers: [PitchBriefService],
  exports: [PitchBriefService],
})
export class PitchBriefModule {}
