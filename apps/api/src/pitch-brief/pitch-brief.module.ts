import { Module } from '@nestjs/common';
import { PitchBriefService } from './pitch-brief.service.js';
import { PitchBriefController } from './pitch-brief.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module.js';

@Module({
  imports: [
    PrismaModule,
    KnowledgeBaseModule,
  ],
  controllers: [PitchBriefController],
  providers: [PitchBriefService],
  exports: [PitchBriefService],
})
export class PitchBriefModule {}
