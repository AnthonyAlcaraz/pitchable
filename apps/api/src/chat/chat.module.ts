import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { LlmService } from './llm.service.js';
import { ContextBuilderService } from './context-builder.service.js';
import { GenerationService } from './generation.service.js';
import { IntentClassifierService } from './intent-classifier.service.js';
import { SlideModifierService } from './slide-modifier.service.js';
import { ContentReviewerService } from './content-reviewer.service.js';
import { FeedbackLogService } from './feedback-log.service.js';
import { ValidationGateService } from './validation-gate.service.js';
import { QualityAgentsService } from './quality-agents.service.js';
import { VisualCriticService } from './visual-critic.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module.js';
import { ConstraintsModule } from '../constraints/constraints.module.js';
import { ExportsModule } from '../exports/exports.module.js';
import { CreditsModule } from '../credits/credits.module.js';
import { ImagesModule } from '../images/images.module.js';
import { EmailModule } from '../email/email.module.js';
import { PitchLensModule } from '../pitch-lens/pitch-lens.module.js';

@Module({
  imports: [PrismaModule, KnowledgeBaseModule, ConstraintsModule, ExportsModule, CreditsModule, ImagesModule, EmailModule, PitchLensModule],
  controllers: [ChatController],
  providers: [
    ChatService,
    LlmService,
    ContextBuilderService,
    GenerationService,
    IntentClassifierService,
    SlideModifierService,
    ContentReviewerService,
    FeedbackLogService,
    ValidationGateService,
    QualityAgentsService,
    VisualCriticService,
  ],
  exports: [
    ChatService,
    LlmService,
    ContextBuilderService,
    GenerationService,
    IntentClassifierService,
    SlideModifierService,
    ContentReviewerService,
    FeedbackLogService,
    ValidationGateService,
    QualityAgentsService,
    VisualCriticService,
  ],
})
export class ChatModule {}
