import { Module } from '@nestjs/common';
import { PitchBriefService } from './pitch-brief.service.js';
import { PitchBriefController } from './pitch-brief.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module.js';
import { CreditsModule } from '../credits/credits.module.js';

@Module({
  imports: [
    PrismaModule,
    KnowledgeBaseModule,
    CreditsModule,
  ],
  controllers: [PitchBriefController],
  providers: [PitchBriefService],
  exports: [PitchBriefService],
})
export class PitchBriefModule {}
