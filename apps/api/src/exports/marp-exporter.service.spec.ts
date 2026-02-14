import { MarpExporterService } from './marp-exporter.service';

describe('MarpExporterService', () => {
  let service: MarpExporterService;

  const mockTheme = {
    id: 'theme-1',
    name: 'dark-professional',
    headingFont: 'Inter',
    bodyFont: 'Open Sans',
    colorPalette: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#F59E0B',
      background: '#0F172A',
      text: '#E2E8F0',
      surface: '#1E293B',
      border: '#334155',
      success: '#22C55E',
      warning: '#F59E0B',
      error: '#EF4444',
    },
  };

  const mockPresentation = {
    id: 'pres-1',
    title: 'Test Deck',
  };

  const makeSlide = (overrides: Record<string, unknown> = {}) => ({
    id: 'slide-1',
    slideNumber: 1,
    title: 'Introduction',
    body: '- Point one\n- Point two',
    speakerNotes: null,
    imageUrl: null,
    ...overrides,
  });

  beforeEach(() => {
    service = new MarpExporterService();
  });

  describe('generateMarpMarkdown', () => {
    it('should produce valid Marp frontmatter', () => {
      const result = service.generateMarpMarkdown(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('---');
      expect(result).toContain('marp: true');
      expect(result).toContain('theme: uncover');
    });

    it('should include theme colors in style block', () => {
      const result = service.generateMarpMarkdown(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('#0F172A'); // background
      expect(result).toContain('#E2E8F0'); // text
      expect(result).toContain('#3B82F6'); // primary
      expect(result).toContain('Inter'); // heading font
      expect(result).toContain('Open Sans'); // body font
    });

    it('should render slide title as h1', () => {
      const result = service.generateMarpMarkdown(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('# Introduction');
    });

    it('should include body content', () => {
      const result = service.generateMarpMarkdown(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('- Point one');
      expect(result).toContain('- Point two');
    });

    it('should include speaker notes as HTML comments', () => {
      const slides = [makeSlide({ speakerNotes: 'Remember to pause here' })];
      const result = service.generateMarpMarkdown(
        mockPresentation as any, slides as any, mockTheme as any,
      );

      expect(result).toContain('<!--');
      expect(result).toContain('Remember to pause here');
      expect(result).toContain('-->');
    });

    it('should include image as Marp bg directive', () => {
      const slides = [makeSlide({ imageUrl: 'https://example.com/img.png' })];
      const result = service.generateMarpMarkdown(
        mockPresentation as any, slides as any, mockTheme as any,
      );

      expect(result).toContain('![bg right:35%](https://example.com/img.png)');
    });

    it('should separate slides with --- divider', () => {
      const slides = [
        makeSlide({ slideNumber: 1, title: 'First' }),
        makeSlide({ id: 's2', slideNumber: 2, title: 'Second' }),
      ];
      const result = service.generateMarpMarkdown(
        mockPresentation as any, slides as any, mockTheme as any,
      );

      expect(result).toContain('---\n\n# First');
      expect(result).toContain('---\n\n# Second');
    });

    it('should sort slides by slideNumber', () => {
      const slides = [
        makeSlide({ id: 's2', slideNumber: 2, title: 'Second' }),
        makeSlide({ slideNumber: 1, title: 'First' }),
      ];
      const result = service.generateMarpMarkdown(
        mockPresentation as any, slides as any, mockTheme as any,
      );

      const firstIdx = result.indexOf('# First');
      const secondIdx = result.indexOf('# Second');
      expect(firstIdx).toBeLessThan(secondIdx);
    });

    it('should handle empty slides array', () => {
      const result = service.generateMarpMarkdown(
        mockPresentation as any, [] as any, mockTheme as any,
      );

      // Should still have frontmatter
      expect(result).toContain('marp: true');
    });
  });
});
