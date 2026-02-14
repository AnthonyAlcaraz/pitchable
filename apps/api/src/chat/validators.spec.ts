import {
  isValidOutline,
  isValidSlideContent,
  isValidModifiedSlideContent,
  isValidReviewResult,
} from './validators';

describe('isValidOutline', () => {
  it('should accept a valid outline', () => {
    expect(
      isValidOutline({
        title: 'My Deck',
        slides: [
          {
            slideNumber: 1,
            title: 'Intro',
            bulletPoints: ['Point 1'],
            slideType: 'TITLE',
          },
        ],
      }),
    ).toBe(true);
  });

  it('should reject null/undefined', () => {
    expect(isValidOutline(null)).toBe(false);
    expect(isValidOutline(undefined)).toBe(false);
  });

  it('should reject empty title', () => {
    expect(
      isValidOutline({
        title: '',
        slides: [{ slideNumber: 1, title: 'Intro', bulletPoints: ['P1'], slideType: 'TITLE' }],
      }),
    ).toBe(false);
  });

  it('should reject empty slides array', () => {
    expect(isValidOutline({ title: 'Deck', slides: [] })).toBe(false);
  });

  it('should reject slides without required fields', () => {
    expect(
      isValidOutline({
        title: 'Deck',
        slides: [{ slideNumber: 1, title: 'Intro' }], // missing bulletPoints, slideType
      }),
    ).toBe(false);
  });

  it('should reject slide with empty bulletPoints', () => {
    expect(
      isValidOutline({
        title: 'Deck',
        slides: [{ slideNumber: 1, title: 'Intro', bulletPoints: [], slideType: 'TITLE' }],
      }),
    ).toBe(false);
  });

  it('should reject non-number slideNumber', () => {
    expect(
      isValidOutline({
        title: 'Deck',
        slides: [{ slideNumber: '1', title: 'Intro', bulletPoints: ['P'], slideType: 'TITLE' }],
      }),
    ).toBe(false);
  });
});

describe('isValidSlideContent', () => {
  it('should accept valid slide content', () => {
    expect(
      isValidSlideContent({
        title: 'Slide Title',
        body: '- Bullet 1\n- Bullet 2',
        speakerNotes: 'Some notes',
        imagePromptHint: 'A professional chart',
      }),
    ).toBe(true);
  });

  it('should reject missing title', () => {
    expect(
      isValidSlideContent({
        body: '- Bullet',
        speakerNotes: 'Notes',
        imagePromptHint: 'Hint',
      }),
    ).toBe(false);
  });

  it('should reject empty title', () => {
    expect(
      isValidSlideContent({
        title: '',
        body: '- Bullet',
        speakerNotes: 'Notes',
        imagePromptHint: 'Hint',
      }),
    ).toBe(false);
  });

  it('should reject missing imagePromptHint', () => {
    expect(
      isValidSlideContent({
        title: 'Title',
        body: '- Bullet',
        speakerNotes: 'Notes',
      }),
    ).toBe(false);
  });

  it('should accept empty body (some slides may have no body)', () => {
    expect(
      isValidSlideContent({
        title: 'Title Slide',
        body: '',
        speakerNotes: '',
        imagePromptHint: '',
      }),
    ).toBe(true);
  });
});

describe('isValidModifiedSlideContent', () => {
  it('should accept valid modified content', () => {
    expect(
      isValidModifiedSlideContent({
        title: 'Updated Title',
        body: '- New bullet',
        speakerNotes: 'Updated notes',
      }),
    ).toBe(true);
  });

  it('should reject missing speakerNotes', () => {
    expect(
      isValidModifiedSlideContent({
        title: 'Title',
        body: 'Body',
      }),
    ).toBe(false);
  });

  it('should reject non-object input', () => {
    expect(isValidModifiedSlideContent('string')).toBe(false);
    expect(isValidModifiedSlideContent(42)).toBe(false);
    expect(isValidModifiedSlideContent([])).toBe(false);
  });
});

describe('isValidReviewResult', () => {
  it('should accept a valid PASS result', () => {
    expect(
      isValidReviewResult({
        verdict: 'PASS',
        score: 0.9,
        issues: [],
      }),
    ).toBe(true);
  });

  it('should accept a valid NEEDS_SPLIT result with issues', () => {
    expect(
      isValidReviewResult({
        verdict: 'NEEDS_SPLIT',
        score: 0.4,
        issues: [
          { rule: 'density', severity: 'error', message: 'Too many bullets' },
        ],
        suggestedSplits: [
          { title: 'Part 1', body: '- A\n- B' },
          { title: 'Part 2', body: '- C\n- D' },
        ],
      }),
    ).toBe(true);
  });

  it('should reject invalid verdict', () => {
    expect(
      isValidReviewResult({
        verdict: 'FAIL',
        score: 0.5,
        issues: [],
      }),
    ).toBe(false);
  });

  it('should reject score out of range', () => {
    expect(
      isValidReviewResult({ verdict: 'PASS', score: 1.5, issues: [] }),
    ).toBe(false);
    expect(
      isValidReviewResult({ verdict: 'PASS', score: -0.1, issues: [] }),
    ).toBe(false);
  });

  it('should reject non-array issues', () => {
    expect(
      isValidReviewResult({ verdict: 'PASS', score: 1.0, issues: 'none' }),
    ).toBe(false);
  });

  it('should reject issues with invalid severity', () => {
    expect(
      isValidReviewResult({
        verdict: 'PASS',
        score: 0.8,
        issues: [{ rule: 'density', severity: 'critical', message: 'Bad' }],
      }),
    ).toBe(false);
  });

  it('should reject issues with missing message', () => {
    expect(
      isValidReviewResult({
        verdict: 'PASS',
        score: 0.8,
        issues: [{ rule: 'density', severity: 'warning' }],
      }),
    ).toBe(false);
  });
});
