import { Test } from '@nestjs/testing';
import { ValidationGateService } from './validation-gate.service';
import { FeedbackLogService } from './feedback-log.service';
import type { ValidationRequest } from './validation-gate.service';

// Mock PrismaService at module level to avoid generated Prisma client ESM import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaService } = require('../prisma/prisma.service');

describe('ValidationGateService', () => {
  let service: ValidationGateService;
  let prisma: {
    slide: {
      update: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let feedbackLog: {
    logFeedback: jest.Mock;
    logCorrection: jest.Mock;
  };

  const mockRequest: ValidationRequest = {
    presentationId: 'pres-1',
    slideId: 'slide-1',
    slideNumber: 2,
    title: 'Market Size',
    body: '- TAM: $10B\n- SAM: $2B',
    speakerNotes: 'Explain market dynamics.',
    slideType: 'DATA_METRICS',
    reviewPassed: true,
  };

  beforeEach(async () => {
    prisma = {
      slide: {
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn((fn) => fn(prisma)),
    };

    feedbackLog = {
      logFeedback: jest.fn().mockResolvedValue('fb-1'),
      logCorrection: jest.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        ValidationGateService,
        { provide: PrismaService, useValue: prisma },
        { provide: FeedbackLogService, useValue: feedbackLog },
      ],
    }).compile();

    service = module.get(ValidationGateService);
  });

  afterEach(() => {
    service['pendingValidations'].destroy();
    service['autoApproveSettings'].destroy();
  });

  describe('queueValidation', () => {
    it('should queue a validation and return true', () => {
      const needsValidation = service.queueValidation(mockRequest);
      expect(needsValidation).toBe(true);
    });

    it('should auto-approve when setting is on and reviewer passed', () => {
      service.setAutoApprove('pres-1', true);
      const needsValidation = service.queueValidation(mockRequest);
      expect(needsValidation).toBe(false);
    });

    it('should NOT auto-approve when reviewer failed', () => {
      service.setAutoApprove('pres-1', true);
      const needsValidation = service.queueValidation({
        ...mockRequest,
        reviewPassed: false,
      });
      expect(needsValidation).toBe(true);
    });

    it('should NOT auto-approve when setting is off', () => {
      service.setAutoApprove('pres-1', false);
      const needsValidation = service.queueValidation(mockRequest);
      expect(needsValidation).toBe(true);
    });
  });

  describe('hasPendingValidation / getNextValidation', () => {
    it('should detect pending validations', () => {
      expect(service.hasPendingValidation('pres-1')).toBe(false);

      service.queueValidation(mockRequest);

      expect(service.hasPendingValidation('pres-1')).toBe(true);
      expect(service.hasPendingValidation('pres-2')).toBe(false);
    });

    it('should return the next pending validation', () => {
      service.queueValidation(mockRequest);

      const next = service.getNextValidation('pres-1');
      expect(next).not.toBeNull();
      expect(next!.slideId).toBe('slide-1');
    });

    it('should return null when no pending validations', () => {
      expect(service.getNextValidation('pres-1')).toBeNull();
    });
  });

  describe('processValidation — accept', () => {
    it('should accept a slide without DB changes', async () => {
      service.queueValidation(mockRequest);

      const result = await service.processValidation('u1', 'pres-1', 'slide-1', {
        action: 'accept',
        slideId: 'slide-1',
      });

      expect(result.message).toContain('accepted');
      expect(result.slideUpdated).toBe(false);
      expect(prisma.slide.update).not.toHaveBeenCalled();
    });
  });

  describe('processValidation — edit', () => {
    it('should update slide and log correction', async () => {
      service.queueValidation(mockRequest);

      const result = await service.processValidation('u1', 'pres-1', 'slide-1', {
        action: 'edit',
        slideId: 'slide-1',
        editedContent: {
          title: 'Updated Market Size',
          body: '- TAM: $12B',
        },
      });

      expect(result.slideUpdated).toBe(true);
      expect(prisma.slide.update).toHaveBeenCalledWith({
        where: { id: 'slide-1' },
        data: expect.objectContaining({
          title: 'Updated Market Size',
          body: '- TAM: $12B',
        }),
      });
      expect(feedbackLog.logCorrection).toHaveBeenCalled();
    });

    it('should reject edit without editedContent', async () => {
      service.queueValidation(mockRequest);

      const result = await service.processValidation('u1', 'pres-1', 'slide-1', {
        action: 'edit',
        slideId: 'slide-1',
      });

      expect(result.slideUpdated).toBe(false);
      expect(result.message).toContain('editedContent');
    });
  });

  describe('processValidation — reject', () => {
    it('should delete slide and log rejection with nuanced reason', async () => {
      service.queueValidation(mockRequest);

      const result = await service.processValidation('u1', 'pres-1', 'slide-1', {
        action: 'reject',
        slideId: 'slide-1',
      });

      expect(result.slideUpdated).toBe(true);
      expect(result.message).toContain('removed');
      expect(prisma.$transaction).toHaveBeenCalled();

      expect(feedbackLog.logFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CORRECTION',
          category: 'concept',
          correctedContent: expect.stringContaining('[REJECTED]'),
        }),
      );
      const call = feedbackLog.logFeedback.mock.calls[0][0];
      expect(call.correctedContent).toContain('DATA_METRICS');
      expect(call.correctedContent).toContain('Market Size');
    });
  });

  describe('processValidation — no pending', () => {
    it('should return message when no pending validation', async () => {
      const result = await service.processValidation('u1', 'pres-1', 'slide-1', {
        action: 'accept',
        slideId: 'slide-1',
      });
      expect(result.message).toContain('No pending');
      expect(result.slideUpdated).toBe(false);
    });
  });

  describe('auto-approve settings', () => {
    it('should toggle auto-approve', () => {
      expect(service.isAutoApproveEnabled('pres-1')).toBe(false);

      service.setAutoApprove('pres-1', true);
      expect(service.isAutoApproveEnabled('pres-1')).toBe(true);

      service.setAutoApprove('pres-1', false);
      expect(service.isAutoApproveEnabled('pres-1')).toBe(false);
    });
  });

  describe('clearPendingValidations', () => {
    it('should clear all validations for a presentation', () => {
      service.queueValidation(mockRequest);
      service.queueValidation({ ...mockRequest, slideId: 'slide-2', slideNumber: 3 });

      expect(service.hasPendingValidation('pres-1')).toBe(true);

      service.clearPendingValidations('pres-1');

      expect(service.hasPendingValidation('pres-1')).toBe(false);
    });
  });

  describe('inferCategory', () => {
    it('should infer style for title changes', async () => {
      service.queueValidation(mockRequest);

      await service.processValidation('u1', 'pres-1', 'slide-1', {
        action: 'edit',
        slideId: 'slide-1',
        editedContent: { title: 'Different Title' },
      });

      const call = feedbackLog.logCorrection.mock.calls[0];
      expect(call[3]).toBe('style');
    });

    it('should infer density when body is significantly shortened', async () => {
      const verboseRequest = {
        ...mockRequest,
        body: 'Word '.repeat(50),
      };
      service.queueValidation(verboseRequest);

      await service.processValidation('u1', 'pres-1', 'slide-1', {
        action: 'edit',
        slideId: 'slide-1',
        editedContent: { body: 'Short body' },
      });

      const call = feedbackLog.logCorrection.mock.calls[0];
      expect(call[3]).toBe('density');
    });

    it('should infer tone when only speaker notes changed', async () => {
      service.queueValidation(mockRequest);

      await service.processValidation('u1', 'pres-1', 'slide-1', {
        action: 'edit',
        slideId: 'slide-1',
        editedContent: { speakerNotes: 'New notes only' },
      });

      const call = feedbackLog.logCorrection.mock.calls[0];
      expect(call[3]).toBe('tone');
    });
  });
});
