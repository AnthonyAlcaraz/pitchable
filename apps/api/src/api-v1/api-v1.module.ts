import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ApiKeysModule } from '../api-keys/api-keys.module.js';
import { PresentationsModule } from '../presentations/presentations.module.js';
import { CreditsModule } from '../credits/credits.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { ConstraintsModule } from '../constraints/constraints.module.js';
import { ExportsModule } from '../exports/exports.module.js';
import { PitchBriefModule } from '../pitch-brief/pitch-brief.module.js';
import { PitchLensModule } from '../pitch-lens/pitch-lens.module.js';
import { ApiV1Controller } from './api-v1.controller.js';
import { SyncGenerationService } from './sync-generation.service.js';

@Module({
  imports: [
    PrismaModule,
    ApiKeysModule,
    PresentationsModule,
    CreditsModule,
    ChatModule,
    ConstraintsModule,
    ExportsModule,
    PitchBriefModule,
    PitchLensModule,
  ],
  controllers: [ApiV1Controller],
  providers: [SyncGenerationService],
  exports: [SyncGenerationService],
})
export class ApiV1Module {}
