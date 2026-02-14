import {
  validateSlideContent,
  suggestSplit,
  DENSITY_LIMITS,
  MAX_WORDS_PER_BULLET,
} from './density-validator';

describe('validateSlideContent', () => {
  it('should pass a valid slide', () => {
    const result = validateSlideContent({
      title: 'Key Findings',
      body: '- Revenue grew 20%\n- Users increased\n- Costs reduced',
    });
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should fail when too many bullets', () => {
    const bullets = Array.from({ length: 8 }, (_, i) => `- Point ${i + 1}`).join('\n');
    const result = validateSlideContent({ title: 'Title', body: bullets });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('bullets'))).toBe(true);
  });

  it('should fail when too many words', () => {
    const words = Array.from({ length: 90 }, (_, i) => `word${i}`).join(' ');
    const result = validateSlideContent({ title: 'Title', body: words });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('words'))).toBe(true);
  });

  it('should fail on long bullet text', () => {
    const longBullet = `- ${Array.from({ length: 15 }, (_, i) => `word${i}`).join(' ')}`;
    const result = validateSlideContent({ title: 'T', body: longBullet });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('Bullet'))).toBe(true);
  });

  it('should fail on deep nesting', () => {
    const nested = '- Top\n    - Sub-sub level';
    const result = validateSlideContent({ title: 'T', body: nested });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('nesting'))).toBe(true);
  });

  it('should fail on too many table rows', () => {
    const result = validateSlideContent({
      title: 'Data',
      body: 'Table content',
      hasTable: true,
      tableRows: 10,
    });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('Table'))).toBe(true);
  });

  it('should pass on valid table rows', () => {
    const result = validateSlideContent({
      title: 'Data',
      body: 'Summary',
      hasTable: true,
      tableRows: 4,
    });
    expect(result.valid).toBe(true);
  });

  it('should include actionable suggestions for every violation', () => {
    const bullets = Array.from({ length: 10 }, (_, i) => `- Point ${i + 1}`).join('\n');
    const result = validateSlideContent({ title: 'Title', body: bullets });
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it('should count words in title + body combined', () => {
    // Title with many words + body pushes over limit
    const longTitle = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    const body = Array.from({ length: 45 }, (_, i) => `w${i}`).join(' ');
    const result = validateSlideContent({ title: longTitle, body });
    expect(result.valid).toBe(false);
    expect(result.violations.some((v) => v.includes('words'))).toBe(true);
  });

  it('should handle empty body gracefully', () => {
    const result = validateSlideContent({ title: 'Title', body: '' });
    expect(result.valid).toBe(true);
  });
});

describe('suggestSplit', () => {
  it('should not split a valid slide', () => {
    const result = suggestSplit({
      title: 'Valid',
      body: '- Point 1\n- Point 2\n- Point 3',
    });
    expect(result.shouldSplit).toBe(false);
    expect(result.newSlides).toHaveLength(1);
  });

  it('should split slide with too many bullets', () => {
    const bullets = Array.from({ length: 10 }, (_, i) => `- Bullet ${i + 1}`).join('\n');
    const result = suggestSplit({ title: 'Dense Slide', body: bullets });
    expect(result.shouldSplit).toBe(true);
    expect(result.newSlides.length).toBeGreaterThan(1);
  });

  it('should distribute bullets evenly across splits', () => {
    const bullets = Array.from({ length: 12 }, (_, i) => `- B${i + 1}`).join('\n');
    const result = suggestSplit({ title: 'Big Slide', body: bullets });
    expect(result.shouldSplit).toBe(true);
    expect(result.newSlides).toHaveLength(2); // 12 / 6 = 2

    // Each split should have at most DENSITY_LIMITS.maxBulletsPerSlide bullets
    for (const slide of result.newSlides) {
      const bulletCount = slide.body.split('\n').filter((l) => /^\s*[-*]\s/.test(l)).length;
      expect(bulletCount).toBeLessThanOrEqual(DENSITY_LIMITS.maxBulletsPerSlide);
    }
  });

  it('should add numbering suffix to split titles', () => {
    const bullets = Array.from({ length: 12 }, (_, i) => `- B${i + 1}`).join('\n');
    const result = suggestSplit({ title: 'My Topic', body: bullets });
    expect(result.newSlides[0].title).toContain('(1/2)');
    expect(result.newSlides[1].title).toContain('(2/2)');
  });

  it('should split text by sentences when no bullets', () => {
    const sentences = 'First sentence. Second sentence. Third sentence. Fourth sentence.';
    // This has 8 words per sentence * 4 = 32, under limit, but let's make it long enough
    const longText = Array.from({ length: 20 }, (_, i) => `Sentence number ${i + 1} with extra words added.`).join(' ');
    const result = suggestSplit({ title: 'Text', body: longText });
    expect(result.shouldSplit).toBe(true);
    expect(result.newSlides.length).toBe(2);
  });

  it('should not split single sentence body even if long', () => {
    const longSentence = Array.from({ length: 100 }, (_, i) => `word${i}`).join(' ');
    const result = suggestSplit({ title: 'T', body: longSentence });
    // No sentence split possible
    expect(result.shouldSplit).toBe(false);
  });
});

describe('DENSITY_LIMITS constants', () => {
  it('should have expected default values', () => {
    expect(DENSITY_LIMITS.maxBulletsPerSlide).toBe(6);
    expect(DENSITY_LIMITS.maxWordsPerSlide).toBe(80);
    expect(DENSITY_LIMITS.maxConceptsPerSlide).toBe(1);
    expect(DENSITY_LIMITS.maxNestedListDepth).toBe(1);
    expect(DENSITY_LIMITS.maxTableRows).toBe(6);
  });

  it('MAX_WORDS_PER_BULLET should be 10', () => {
    expect(MAX_WORDS_PER_BULLET).toBe(10);
  });
});
