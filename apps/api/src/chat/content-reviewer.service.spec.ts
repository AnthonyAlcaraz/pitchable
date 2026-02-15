import { Test } from '@nestjs/testing';
import { ContentReviewerService } from './content-reviewer.service';
import { LlmService } from './llm.service';

describe('ContentReviewerService', () => {
  let service: ContentReviewerService;
  let llm: { completeJson: jest.Mock };

  beforeEach(async () => {
    llm = {
      completeJson: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        ContentReviewerService,
        { provide: LlmService, useValue: llm },
      ],
    }).compile();

    service = module.get(ContentReviewerService);
  });

  describe('reviewSlide', () => {
    it('should return PASS for a good slide', async () => {
      llm.completeJson.mockResolvedValue({
        verdict: 'PASS',
        score: 0.95,
        issues: [],
      });

      const result = await service.reviewSlide({
        title: 'Key Findings',
        body: '- Revenue grew 20%\n- Users doubled',
        speakerNotes: 'Discuss growth trends.',
        slideType: 'DATA_METRICS',
      });

      expect(result.verdict).toBe('PASS');
      expect(result.score).toBe(0.95);
      expect(result.issues).toHaveLength(0);
    });

    it('should return NEEDS_SPLIT with suggested splits', async () => {
      llm.completeJson.mockResolvedValue({
        verdict: 'NEEDS_SPLIT',
        score: 0.3,
        issues: [
          { rule: 'density', severity: 'error', message: 'Too many bullets' },
        ],
        suggestedSplits: [
          { title: 'Part 1', body: '- A\n- B\n- C' },
          { title: 'Part 2', body: '- D\n- E\n- F' },
        ],
      });

      const result = await service.reviewSlide({
        title: 'Overloaded',
        body: '- A\n- B\n- C\n- D\n- E\n- F\n- G\n- H',
        speakerNotes: 'Notes.',
        slideType: 'CONTENT',
      });

      expect(result.verdict).toBe('NEEDS_SPLIT');
      expect(result.suggestedSplits).toHaveLength(2);
    });

    it('should call LLM with Haiku model for cost efficiency', async () => {
      llm.completeJson.mockResolvedValue({
        verdict: 'PASS',
        score: 1.0,
        issues: [],
      });

      await service.reviewSlide({
        title: 'Title',
        body: 'Body',
        speakerNotes: 'Notes',
        slideType: 'CONTENT',
      });

      expect(llm.completeJson).toHaveBeenCalledWith(
        expect.any(Array),
        'claude-haiku-4-5-20251001',
        expect.any(Function), // isValidReviewResult validator
        2, // maxRetries
      );
    });

    it('should default to PASS on LLM failure', async () => {
      llm.completeJson.mockRejectedValue(new Error('API timeout'));

      const result = await service.reviewSlide({
        title: 'Title',
        body: 'Body',
        speakerNotes: 'Notes',
        slideType: 'CONTENT',
      });

      expect(result.verdict).toBe('PASS');
      expect(result.score).toBe(1.0);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle partial LLM response with defaults', async () => {
      llm.completeJson.mockResolvedValue({
        verdict: undefined,
        score: undefined,
        issues: undefined,
      });

      const result = await service.reviewSlide({
        title: 'Title',
        body: 'Body',
        speakerNotes: 'Notes',
        slideType: 'CONTENT',
      });

      // Should default safely
      expect(result.verdict).toBe('PASS');
      expect(result.score).toBe(1.0);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('reviewPresentation', () => {
    it('should review all slides and return aggregate results', async () => {
      llm.completeJson
        .mockResolvedValueOnce({ verdict: 'PASS', score: 0.9, issues: [] })
        .mockResolvedValueOnce({ verdict: 'PASS', score: 0.8, issues: [] })
        .mockResolvedValueOnce({
          verdict: 'NEEDS_SPLIT',
          score: 0.3,
          issues: [{ rule: 'density', severity: 'error', message: 'Dense' }],
        });

      const slides = [
        { title: 'S1', body: 'B1', speakerNotes: 'N1', slideType: 'TITLE' },
        { title: 'S2', body: 'B2', speakerNotes: 'N2', slideType: 'CONTENT' },
        { title: 'S3', body: 'B3', speakerNotes: 'N3', slideType: 'CONTENT' },
      ];

      const { results, passRate } = await service.reviewPresentation(slides);

      expect(results).toHaveLength(3);
      expect(results[0].review.verdict).toBe('PASS');
      expect(results[2].review.verdict).toBe('NEEDS_SPLIT');
      // 2 out of 3 passed
      expect(passRate).toBeCloseTo(2 / 3);
    });

    it('should return 100% pass rate for empty slides', async () => {
      const { results, passRate } = await service.reviewPresentation([]);
      expect(results).toHaveLength(0);
      expect(passRate).toBe(1.0);
    });
  });
});
