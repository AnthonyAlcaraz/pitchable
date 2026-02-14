/* eslint-disable @typescript-eslint/no-explicit-any */

// Mock pptxgenjs to avoid dynamic import() crash in Jest CJS mode
const mockAddText = jest.fn();
const mockAddImage = jest.fn();
const mockAddNotes = jest.fn();
const mockAddSlide = jest.fn(() => ({
  addText: mockAddText,
  addImage: mockAddImage,
  addNotes: mockAddNotes,
}));
const mockDefineSlideMaster = jest.fn();
const mockWrite = jest.fn().mockResolvedValue(Buffer.from('fake-pptx'));

jest.mock('pptxgenjs', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      title: '',
      layout: '',
      addSlide: mockAddSlide,
      defineSlideMaster: mockDefineSlideMaster,
      write: mockWrite,
    })),
  };
});

import { PptxGenJsExporterService } from './pptxgenjs-exporter.service';

describe('PptxGenJsExporterService', () => {
  let service: PptxGenJsExporterService;

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
    body: '- Point one\n- Point two\n- Point three',
    speakerNotes: 'Talk about this',
    imageUrl: null,
    ...overrides,
  });

  beforeEach(() => {
    service = new PptxGenJsExporterService();
    jest.clearAllMocks();
    mockWrite.mockResolvedValue(Buffer.from('fake-pptx'));
  });

  describe('exportToPptx', () => {
    it('should return a Buffer', async () => {
      const result = await service.exportToPptx(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should call write with nodebuffer output type', async () => {
      await service.exportToPptx(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );
      expect(mockWrite).toHaveBeenCalledWith({ outputType: 'nodebuffer' });
    });

    it('should define a slide master with theme background', async () => {
      await service.exportToPptx(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );
      expect(mockDefineSlideMaster).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'PITCHABLE_MASTER',
          background: { color: '0F172A' },
        }),
      );
    });

    it('should add one slide per input slide', async () => {
      const slides = [
        makeSlide({ id: 's1', slideNumber: 1 }),
        makeSlide({ id: 's2', slideNumber: 2 }),
        makeSlide({ id: 's3', slideNumber: 3 }),
      ];
      await service.exportToPptx(
        mockPresentation as any, slides as any, mockTheme as any,
      );
      expect(mockAddSlide).toHaveBeenCalledTimes(3);
    });

    it('should add title text with heading font and primary color', async () => {
      await service.exportToPptx(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );
      expect(mockAddText).toHaveBeenCalledWith(
        'Introduction',
        expect.objectContaining({
          fontFace: 'Inter',
          color: '3B82F6',
          bold: true,
        }),
      );
    });

    it('should add body text with bullet elements', async () => {
      await service.exportToPptx(
        mockPresentation as any, [makeSlide()] as any, mockTheme as any,
      );

      // Body is the second addText call (first is title)
      const bodyCalls = mockAddText.mock.calls.filter(
        (call: any[]) => Array.isArray(call[0]),
      );
      expect(bodyCalls.length).toBeGreaterThan(0);

      const bodyElements = bodyCalls[0][0];
      expect(bodyElements).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: 'Point one' }),
        ]),
      );
    });

    it('should add speaker notes when present', async () => {
      await service.exportToPptx(
        mockPresentation as any,
        [makeSlide({ speakerNotes: 'Important note' })] as any,
        mockTheme as any,
      );
      expect(mockAddNotes).toHaveBeenCalledWith('Important note');
    });

    it('should not add speaker notes when null', async () => {
      await service.exportToPptx(
        mockPresentation as any,
        [makeSlide({ speakerNotes: null })] as any,
        mockTheme as any,
      );
      expect(mockAddNotes).not.toHaveBeenCalled();
    });

    it('should add image when imageUrl is present', async () => {
      await service.exportToPptx(
        mockPresentation as any,
        [makeSlide({ imageUrl: 'https://example.com/img.png' })] as any,
        mockTheme as any,
      );
      expect(mockAddImage).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'https://example.com/img.png',
        }),
      );
    });

    it('should not add image when imageUrl is null', async () => {
      await service.exportToPptx(
        mockPresentation as any,
        [makeSlide({ imageUrl: null })] as any,
        mockTheme as any,
      );
      expect(mockAddImage).not.toHaveBeenCalled();
    });

    it('should use narrower content width when image is present', async () => {
      await service.exportToPptx(
        mockPresentation as any,
        [makeSlide({ imageUrl: 'https://example.com/img.png' })] as any,
        mockTheme as any,
      );

      // Title call should use 58% width
      const titleCall = mockAddText.mock.calls.find(
        (call: any[]) => call[0] === 'Introduction',
      );
      expect(titleCall).toBeDefined();
      expect(titleCall![1]).toEqual(expect.objectContaining({ w: '58%' }));
    });

    it('should use full content width when no image', async () => {
      await service.exportToPptx(
        mockPresentation as any,
        [makeSlide({ imageUrl: null })] as any,
        mockTheme as any,
      );

      const titleCall = mockAddText.mock.calls.find(
        (call: any[]) => call[0] === 'Introduction',
      );
      expect(titleCall).toBeDefined();
      expect(titleCall![1]).toEqual(expect.objectContaining({ w: '90%' }));
    });

    it('should handle empty slides array', async () => {
      const result = await service.exportToPptx(
        mockPresentation as any, [] as any, mockTheme as any,
      );
      expect(result).toBeInstanceOf(Buffer);
      expect(mockAddSlide).not.toHaveBeenCalled();
    });

    it('should not add title text when title is empty', async () => {
      await service.exportToPptx(
        mockPresentation as any,
        [makeSlide({ title: '' })] as any,
        mockTheme as any,
      );

      const titleCalls = mockAddText.mock.calls.filter(
        (call: any[]) => typeof call[0] === 'string' && !Array.isArray(call[0]),
      );
      expect(titleCalls).toHaveLength(0);
    });

    it('should handle nested bullets', async () => {
      const slides = [makeSlide({
        body: '- Top bullet\n  - Nested bullet\n- Second top',
      })];
      await service.exportToPptx(
        mockPresentation as any, slides as any, mockTheme as any,
      );

      const bodyCalls = mockAddText.mock.calls.filter(
        (call: any[]) => Array.isArray(call[0]),
      );
      expect(bodyCalls.length).toBeGreaterThan(0);

      const elements = bodyCalls[0][0];
      const nestedElement = elements.find(
        (el: any) => el.text === 'Nested bullet',
      );
      expect(nestedElement).toBeDefined();
      expect(nestedElement.options.indentLevel).toBe(1);
    });

    it('should sort slides by slideNumber before processing', async () => {
      const callOrder: number[] = [];
      mockAddSlide.mockImplementation(() => {
        return {
          addText: (...args: any[]) => {
            if (typeof args[0] === 'string') {
              callOrder.push(
                args[0] === 'First' ? 1 : args[0] === 'Second' ? 2 : 3,
              );
            }
          },
          addImage: jest.fn(),
          addNotes: jest.fn(),
        };
      });

      const slides = [
        makeSlide({ id: 's2', slideNumber: 2, title: 'Second', speakerNotes: null }),
        makeSlide({ id: 's1', slideNumber: 1, title: 'First', speakerNotes: null }),
      ];
      await service.exportToPptx(
        mockPresentation as any, slides as any, mockTheme as any,
      );

      expect(callOrder[0]).toBe(1);
      expect(callOrder[1]).toBe(2);
    });
  });
});
