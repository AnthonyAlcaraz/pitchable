import { buildFeedbackInjection } from './feedback-injection.prompt';

describe('buildFeedbackInjection', () => {
  it('should return empty string when no rules or corrections', () => {
    expect(buildFeedbackInjection([], [])).toBe('');
  });

  it('should include rules section when rules exist', () => {
    const result = buildFeedbackInjection(
      [{ category: 'style', rule: 'User prefers concise bullets' }],
      [],
    );
    expect(result).toContain('### Rules');
    expect(result).toContain('[style] User prefers concise bullets');
    expect(result).toContain('User Preferences');
  });

  it('should include corrections section when corrections exist', () => {
    const result = buildFeedbackInjection(
      [],
      [
        {
          category: 'density',
          original: 'Too many words here and there',
          corrected: 'Concise point',
        },
      ],
    );
    expect(result).toContain('### Recent Corrections');
    expect(result).toContain('[density]');
    expect(result).toContain('Too many words');
    expect(result).toContain('Concise point');
  });

  it('should include both sections when both exist', () => {
    const result = buildFeedbackInjection(
      [{ category: 'tone', rule: 'Keep it professional' }],
      [
        {
          category: 'style',
          original: 'Long text',
          corrected: 'Short text',
        },
      ],
    );
    expect(result).toContain('### Rules');
    expect(result).toContain('### Recent Corrections');
  });

  it('should truncate long original/corrected text to 120 chars', () => {
    const longText = 'A'.repeat(200);
    const result = buildFeedbackInjection(
      [],
      [{ category: 'style', original: longText, corrected: 'Short' }],
    );
    // The snippet is sliced to 120 chars
    expect(result).not.toContain('A'.repeat(200));
    expect(result).toContain('A'.repeat(120));
  });

  it('should replace newlines in corrections with spaces', () => {
    const result = buildFeedbackInjection(
      [],
      [
        {
          category: 'style',
          original: 'Line 1\nLine 2',
          corrected: 'Fixed\nContent',
        },
      ],
    );
    // Newlines replaced with spaces in the snippet
    expect(result).toContain('Line 1 Line 2');
    expect(result).toContain('Fixed Content');
  });
});
