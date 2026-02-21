import { Module } from '@nestjs/common';
import { LlmService } from './llm.service.js';

/**
 * Standalone module for LlmService.
 * Extracted from ChatModule to avoid circular dependencies when
 * other modules (e.g. FigmaModule) need LLM access.
 */
@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}
