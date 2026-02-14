import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { FeedbackLogService } from './feedback-log.service.js';
import { TtlMap } from '../common/ttl-map.js';
import type { FeedbackCategory } from './feedback-log.service.js';

export interface ValidationRequest {
  presentationId: string;
  slideId: string;
  slideNumber: number;
  title: string;
  body: string;
  speakerNotes: string;
  slideType: string;
  reviewPassed: boolean;
}

export type ValidationAction = 'accept' | 'edit' | 'reject';

export interface ValidationResponse {
  action: ValidationAction;
  slideId: string;
  editedContent?: {
    title?: string;
    body?: string;
    speakerNotes?: string;
  };
}

@Injectable()
export class ValidationGateService {
  private readonly logger = new Logger(ValidationGateService.name);

  /** Pending validation requests keyed by `${presentationId}:${slideId}`. 15-min TTL. */
  private pendingValidations = new TtlMap<string, ValidationRequest>(15 * 60 * 1000, 5000);

  /** Auto-approve setting keyed by presentationId. 24-hour TTL. */
  private autoApproveSettings = new TtlMap<string, boolean>(24 * 60 * 60 * 1000, 1000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feedbackLog: FeedbackLogService,
  ) {}

  /**
   * Queue a slide for validation. Returns true if validation is needed,
   * false if auto-approved.
   */
  queueValidation(request: ValidationRequest): boolean {
    const autoApprove = this.autoApproveSettings.get(request.presentationId) ?? false;

    // Auto-approve if setting is on AND content reviewer passed
    if (autoApprove && request.reviewPassed) {
      this.logger.debug(
        `Auto-approved slide ${request.slideNumber} (reviewer passed)`,
      );
      return false;
    }

    const key = `${request.presentationId}:${request.slideId}`;
    this.pendingValidations.set(key, request);
    return true;
  }

  /**
   * Check if there's a pending validation for a presentation.
   */
  hasPendingValidation(presentationId: string): boolean {
    return this.pendingValidations.hasByPrefix(`${presentationId}:`);
  }

  /**
   * Get the next pending validation for a presentation.
   */
  getNextValidation(presentationId: string): ValidationRequest | null {
    const found = this.pendingValidations.findByPrefix(`${presentationId}:`);
    return found?.value ?? null;
  }

  /**
   * Process a validation response (accept/edit/reject).
   */
  async processValidation(
    userId: string,
    presentationId: string,
    slideId: string,
    response: ValidationResponse,
  ): Promise<{ message: string; slideUpdated: boolean }> {
    const key = `${presentationId}:${slideId}`;
    const request = this.pendingValidations.get(key);

    if (!request) {
      return { message: 'No pending validation for this slide.', slideUpdated: false };
    }

    this.pendingValidations.delete(key);

    switch (response.action) {
      case 'accept': {
        this.logger.debug(`Slide ${request.slideNumber} accepted by user`);
        return { message: `Slide ${request.slideNumber} accepted.`, slideUpdated: false };
      }

      case 'edit': {
        if (!response.editedContent) {
          return { message: 'Edit action requires editedContent.', slideUpdated: false };
        }

        // Apply the edit
        const updateData: Record<string, string> = {};
        if (response.editedContent.title !== undefined) {
          updateData['title'] = response.editedContent.title;
        }
        if (response.editedContent.body !== undefined) {
          updateData['body'] = response.editedContent.body;
        }
        if (response.editedContent.speakerNotes !== undefined) {
          updateData['speakerNotes'] = response.editedContent.speakerNotes;
        }

        await this.prisma.slide.update({
          where: { id: slideId },
          data: updateData,
        });

        // Log the correction for the feedback loop
        const originalContent = `${request.title}\n${request.body}`;
        const correctedContent = `${response.editedContent.title ?? request.title}\n${response.editedContent.body ?? request.body}`;

        const category = this.inferCategory(request, response);
        await this.feedbackLog.logCorrection(
          userId,
          presentationId,
          slideId,
          category,
          originalContent,
          correctedContent,
        );

        this.logger.debug(
          `Slide ${request.slideNumber} edited — correction logged [${category}]`,
        );

        return {
          message: `Slide ${request.slideNumber} updated with your edits.`,
          slideUpdated: true,
        };
      }

      case 'reject': {
        // Atomic transaction: delete + renumber
        await this.prisma.$transaction(async (tx) => {
          await tx.slide.delete({ where: { id: slideId } });

          const remaining = await tx.slide.findMany({
            where: { presentationId },
            orderBy: { slideNumber: 'asc' },
            select: { id: true, slideNumber: true },
          });

          for (let i = 0; i < remaining.length; i++) {
            if (remaining[i].slideNumber !== i + 1) {
              await tx.slide.update({
                where: { id: remaining[i].id },
                data: { slideNumber: i + 1 },
              });
            }
          }
        });

        // Log as a rejection with nuanced context for rule codification
        const rejectionReason = `[REJECTED] Slide ${request.slideNumber} (${request.slideType}): "${request.title}" — user removed this slide`;
        await this.feedbackLog.logFeedback({
          userId,
          presentationId,
          slideId,
          type: 'CORRECTION',
          category: 'concept',
          originalContent: `[${request.slideType}] ${request.title}\n${request.body}`,
          correctedContent: rejectionReason,
        });

        this.logger.debug(`Slide ${request.slideNumber} rejected and removed`);

        return {
          message: `Slide ${request.slideNumber} removed. Remaining slides renumbered.`,
          slideUpdated: true,
        };
      }
    }
  }

  /**
   * Set auto-approve for a presentation.
   */
  setAutoApprove(presentationId: string, enabled: boolean): void {
    this.autoApproveSettings.set(presentationId, enabled);
    this.logger.debug(
      `Auto-approve ${enabled ? 'enabled' : 'disabled'} for presentation ${presentationId}`,
    );
  }

  /**
   * Check if auto-approve is enabled for a presentation.
   */
  isAutoApproveEnabled(presentationId: string): boolean {
    return this.autoApproveSettings.get(presentationId) ?? false;
  }

  /**
   * Clear all pending validations for a presentation.
   */
  clearPendingValidations(presentationId: string): void {
    this.pendingValidations.deleteByPrefix(`${presentationId}:`);
  }

  /**
   * Detect what changed between original and edited to infer category.
   */
  private inferCategory(
    original: ValidationRequest,
    response: ValidationResponse,
  ): FeedbackCategory {
    const edited = response.editedContent;
    if (!edited) return 'style';

    // If title changed, likely a clarity/style issue
    if (edited.title && edited.title !== original.title) return 'style';

    // If body was significantly shortened, likely a density issue
    if (edited.body) {
      const originalWords = original.body.split(/\s+/).length;
      const editedWords = edited.body.split(/\s+/).length;
      if (editedWords < originalWords * 0.7) return 'density';
    }

    // If only speaker notes changed, it's a style preference
    if (edited.speakerNotes && !edited.title && !edited.body) return 'tone';

    return 'style';
  }
}
