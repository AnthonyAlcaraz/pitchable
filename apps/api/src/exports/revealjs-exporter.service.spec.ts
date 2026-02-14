import { RevealJsExporterService } from './revealjs-exporter.service';

describe('RevealJsExporterService', () => {
  let service: RevealJsExporterService;

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
    service = new RevealJsExporterService();
  });

  describe('generateRevealHtml', () => {
    it('should produce valid HTML', () => {
      const result = service.generateRevealHtml(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('</html>');
      expect(result).toContain('<div class="reveal">');
    });

    it('should include presentation title in <title>', () => {
      const result = service.generateRevealHtml(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('<title>Test Deck</title>');
    });

    it('should apply theme colors as CSS variables', () => {
      const result = service.generateRevealHtml(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('--r-background-color: #0F172A');
      expect(result).toContain('--r-main-color: #E2E8F0');
      expect(result).toContain('--r-heading-color: #3B82F6');
    });

    it('should include theme fonts', () => {
      const result = service.generateRevealHtml(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain("'Inter'");
      expect(result).toContain("'Open Sans'");
    });

    it('should render slide title as h2', () => {
      const result = service.generateRevealHtml(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('<h2>Introduction</h2>');
    });

    it('should convert bullets to HTML list', () => {
      const result = service.generateRevealHtml(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Point one</li>');
      expect(result).toContain('<li>Point two</li>');
      expect(result).toContain('</ul>');
    });

    it('should include speaker notes as aside', () => {
      const slides = [makeSlide({ speakerNotes: 'Presenter note here' })];
      const result = service.generateRevealHtml(
        mockPresentation as any, slides as any, mockTheme as any,
      );

      expect(result).toContain('<aside class="notes">');
      expect(result).toContain('Presenter note here');
    });

    it('should include image when present', () => {
      const slides = [makeSlide({ imageUrl: 'https://example.com/img.png' })];
      const result = service.generateRevealHtml(
        mockPresentation as any, slides as any, mockTheme as any,
      );

      expect(result).toContain('class="slide-bg-image"');
      expect(result).toContain('src="https://example.com/img.png"');
    });

    it('should escape HTML in title', () => {
      const pres = { ...mockPresentation, title: 'Test <script>alert(1)</script>' };
      const result = service.generateRevealHtml(
        pres as any, [makeSlide()] as any, mockTheme as any,
      );

      // Title tag should contain escaped version
      expect(result).toContain('<title>Test &lt;script&gt;alert(1)&lt;/script&gt;</title>');
    });

    it('should include Reveal.js CDN links', () => {
      const result = service.generateRevealHtml(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      expect(result).toContain('reveal.min.css');
      expect(result).toContain('reveal.min.js');
      expect(result).toContain('Reveal.initialize');
    });

    it('should sort slides by slideNumber', () => {
      const slides = [
        makeSlide({ id: 's2', slideNumber: 2, title: 'Second' }),
        makeSlide({ slideNumber: 1, title: 'First' }),
      ];
      const result = service.generateRevealHtml(
        mockPresentation as any, slides as any, mockTheme as any,
      );

      const firstIdx = result.indexOf('First');
      const secondIdx = result.indexOf('Second');
      expect(firstIdx).toBeLessThan(secondIdx);
    });
  });
});
