import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackLogService } from './feedback-log.service';

// Mock PrismaService at module level to avoid generated Prisma client ESM import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaService } = require('../prisma/prisma.service');

describe('FeedbackLogService', () => {
  let service: FeedbackLogService;
  let prisma: {
    feedbackEntry: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      feedbackEntry: {
        create: jest.fn().mockResolvedValue({ id: 'entry-1' }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({ id: 'entry-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackLogService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = (module as any).get(FeedbackLogService);
  });

  describe('logFeedback', () => {
    it('should create a feedback entry', async () => {
      const id = await service.logFeedback({
        userId: 'u1',
        type: 'VIOLATION',
        category: 'density',
        originalContent: 'Too many bullets',
      });

      expect(id).toBe('entry-1');
      expect(prisma.feedbackEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          type: 'VIOLATION',
          category: 'density',
        }),
      });
    });
  });

  describe('logViolation', () => {
    it('should create a VIOLATION entry', async () => {
      await service.logViolation('u1', 'p1', 's1', 'density', 'Too dense');

      expect(prisma.feedbackEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          type: 'VIOLATION',
          category: 'density',
          originalContent: 'Too dense',
        }),
      });
    });
  });

  describe('logCorrection', () => {
    it('should create a new correction when no similar exists', async () => {
      prisma.feedbackEntry.findFirst.mockResolvedValue(null);
      prisma.feedbackEntry.findMany.mockResolvedValue([]); // for rule check

      await service.logCorrection('u1', 'p1', 's1', 'style', 'original text', 'corrected text');

      expect(prisma.feedbackEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'CORRECTION',
          category: 'style',
          originalContent: 'original text',
          correctedContent: 'corrected text',
        }),
      });
    });

    it('should update existing correction when similar exists (60%+ overlap)', async () => {
      prisma.feedbackEntry.findFirst.mockResolvedValue({
        id: 'existing-1',
        originalContent: 'original similar text content here',
        correctedContent: 'old correction',
        category: 'style',
      });
      prisma.feedbackEntry.findMany.mockResolvedValue([]); // for rule check

      await service.logCorrection(
        'u1', 'p1', 's1', 'style',
        'original similar text content match',
        'new correction',
      );

      expect(prisma.feedbackEntry.update).toHaveBeenCalledWith({
        where: { id: 'existing-1' },
        data: expect.objectContaining({
          originalContent: 'original similar text content match',
          correctedContent: 'new correction',
        }),
      });
    });

    it('should create new entry when existing correction is dissimilar', async () => {
      prisma.feedbackEntry.findFirst.mockResolvedValue({
        id: 'existing-1',
        originalContent: 'completely different words in this sentence',
        correctedContent: 'old',
        category: 'style',
      });
      prisma.feedbackEntry.findMany.mockResolvedValue([]); // for rule check

      await service.logCorrection(
        'u1', 'p1', 's1', 'style',
        'totally new unrelated content',
        'new correction',
      );

      expect(prisma.feedbackEntry.create).toHaveBeenCalled();
      expect(prisma.feedbackEntry.update).not.toHaveBeenCalled();
    });
  });

  describe('getRules', () => {
    it('should return rules for a user', async () => {
      prisma.feedbackEntry.findMany.mockResolvedValue([
        { category: 'tone', rule: 'Keep it professional' },
        { category: 'style', rule: 'Use short bullets' },
        { category: 'density', rule: null },
      ]);

      const rules = await service.getRules('u1');
      expect(rules).toHaveLength(2);
      expect(rules[0]).toEqual({ category: 'tone', rule: 'Keep it professional' });
    });
  });

  describe('rule codification', () => {
    it('should create a rule after 3+ corrections in same category', async () => {
      prisma.feedbackEntry.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      prisma.feedbackEntry.findMany
        .mockResolvedValueOnce([
          { correctedContent: 'Short and punchy' },
          { correctedContent: 'Brief points only' },
          { correctedContent: 'Concise bullets' },
        ]);

      await service.logCorrection('u1', 'p1', 's1', 'style', 'orig', 'corrected');

      expect(prisma.feedbackEntry.create).toHaveBeenCalledTimes(2);
      const ruleCall = prisma.feedbackEntry.create.mock.calls[1][0];
      expect(ruleCall.data.type).toBe('RULE');
      expect(ruleCall.data.category).toBe('style');
    });
  });
});
