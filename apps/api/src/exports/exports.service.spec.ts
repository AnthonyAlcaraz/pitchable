import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { MarpExporterService } from './marp-exporter.service';
import { RevealJsExporterService } from './revealjs-exporter.service';
import { PptxGenJsExporterService } from './pptxgenjs-exporter.service';
import { TemplateSelectorService } from './template-selector.service';
import { RendererChooserService } from './renderer-chooser.service';

// Mock ESM modules that break Jest
jest.mock('marked', () => ({ marked: (s: string) => s }));
jest.mock('../../generated/prisma/enums', () => ({
  ExportFormat: { PPTX: 'PPTX', PDF: 'PDF', GOOGLE_SLIDES: 'GOOGLE_SLIDES', REVEAL_JS: 'REVEAL_JS', FIGMA: 'FIGMA' },
  JobStatus: { QUEUED: 'QUEUED', PROCESSING: 'PROCESSING', COMPLETED: 'COMPLETED', FAILED: 'FAILED', PENDING_RETRY: 'PENDING_RETRY' },
  SlideType: { TITLE: 'TITLE', CONTENT: 'CONTENT' },
  ImageSource: { AI_GENERATED: 'AI_GENERATED', FIGMA: 'FIGMA', UPLOADED: 'UPLOADED' },
}));
jest.mock('../constraints/index', () => ({
  sampleImageLuminance: jest.fn().mockResolvedValue(0.5),
}));
jest.mock('./slide-visual-theme', () => ({}));

// Mock PrismaService to avoid generated client ESM import
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaService } = require('../prisma/prisma.service');

// Mock S3Service to avoid KnowledgeBase module ESM import
jest.mock('../knowledge-base/storage/s3.service', () => ({
  S3Service: class MockS3Service {},
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { S3Service } = require('../knowledge-base/storage/s3.service');

// Mock ActivityService (global module)
jest.mock('../observability/activity.service', () => ({
  ActivityService: class MockActivityService { track() {} },
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ActivityService } = require('../observability/activity.service');

// Mock GenerationRatingService (global module)
jest.mock('../observability/generation-rating.service', () => ({
  GenerationRatingService: class MockGenerationRatingService { markExported() {} },
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GenerationRatingService } = require('../observability/generation-rating.service');

// Mock FigmaRendererService
jest.mock('../figma/figma-renderer.service', () => ({
  FigmaRendererService: class MockFigmaRendererService {},
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { FigmaRendererService } = require('../figma/figma-renderer.service');

// Mock ThemesService
jest.mock('../themes/themes.service', () => ({
  ThemesService: class MockThemesService {},
  getImageFrequencyForTheme: () => 0,
  getThemeCategoryByName: () => 'dark',
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ThemesService } = require('../themes/themes.service');

// Mock EventsGateway
jest.mock('../events/events.gateway', () => ({
  EventsGateway: class MockEventsGateway { emitExportProgress() {} },
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { EventsGateway } = require('../events/events.gateway');

describe('ExportsService', () => {
  let service: ExportsService;
  let prisma: Record<string, any>;
  let s3: { upload: jest.Mock; getSignedDownloadUrl: jest.Mock };
  let pptxExporter: { exportToPptx: jest.Mock };
  let marpExporter: { generateMarpMarkdown: jest.Mock; exportToPdf: jest.Mock };
  let revealExporter: { generateRevealHtml: jest.Mock };

  const mockPresentation = {
    id: 'pres-1',
    title: 'Test Deck',
    themeId: 'theme-1',
  };

  const mockTheme = {
    id: 'theme-1',
    name: 'dark-professional',
    colorPalette: { background: '#0F172A', text: '#E2E8F0', primary: '#3B82F6' },
  };

  const mockSlides = [
    { id: 'slide-1', slideNumber: 1, title: 'Intro', body: '- Point', presentationId: 'pres-1' },
  ];

  const mockJob = {
    id: 'job-1',
    presentationId: 'pres-1',
    format: 'PPTX',
    status: 'QUEUED',
    fileUrl: null,
    errorMessage: null,
    createdAt: new Date(),
    completedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      presentation: {
        findUnique: jest.fn().mockResolvedValue(mockPresentation),
      },
      exportJob: {
        create: jest.fn().mockResolvedValue(mockJob),
        findUnique: jest.fn().mockResolvedValue(mockJob),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ ...mockJob, status: 'PROCESSING' }),
        findMany: jest.fn().mockResolvedValue([mockJob]),
      },
      slide: {
        findMany: jest.fn().mockResolvedValue(mockSlides),
      },
      theme: {
        findUnique: jest.fn().mockResolvedValue(mockTheme),
      },
      imageJob: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    s3 = {
      upload: jest.fn().mockResolvedValue('exports/job-1/Test Deck.pptx'),
      getSignedDownloadUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
      isAvailable: jest.fn().mockReturnValue(true),
    } as any;

    pptxExporter = {
      exportToPptx: jest.fn().mockResolvedValue(Buffer.from('fake-pptx')),
    };

    marpExporter = {
      generateMarpMarkdown: jest.fn().mockReturnValue('---\nmarp: true\n---\n# Slide'),
      exportToPdf: jest.fn().mockResolvedValue('/tmp/out.pdf'),
    };

    revealExporter = {
      generateRevealHtml: jest.fn().mockReturnValue('<html>reveal</html>'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: S3Service, useValue: s3 },
        { provide: PptxGenJsExporterService, useValue: pptxExporter },
        { provide: MarpExporterService, useValue: marpExporter },
        { provide: RevealJsExporterService, useValue: revealExporter },
        { provide: TemplateSelectorService, useValue: {} },
        { provide: RendererChooserService, useValue: { chooseRenderer: jest.fn().mockReturnValue('marp') } },
        { provide: ActivityService, useValue: { track: jest.fn() } },
        { provide: GenerationRatingService, useValue: { markExported: jest.fn() } },
        { provide: FigmaRendererService, useValue: {} },
        { provide: ThemesService, useValue: {} },
        { provide: EventsGateway, useValue: { emitExportProgress: jest.fn() } },
      ],
    }).compile();

    service = (module as any).get(ExportsService);
  });

  describe('createExportJob', () => {
    it('should create a QUEUED export job', async () => {
      const result = await service.createExportJob('pres-1', 'PPTX' as any);

      expect(result).toEqual(mockJob);
      expect(prisma.presentation.findUnique).toHaveBeenCalledWith({
        where: { id: 'pres-1' },
      });
    });

    it('should throw NotFoundException for missing presentation', async () => {
      prisma.presentation.findUnique.mockResolvedValue(null);
      await expect(service.createExportJob('nope', 'PPTX' as any))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid format', async () => {
      await expect(service.createExportJob('pres-1', 'INVALID' as any))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getSignedDownloadUrl', () => {
    it('should return signed URL and filename', async () => {
      prisma.exportJob.findUnique.mockResolvedValue({
        ...mockJob,
        status: 'COMPLETED',
        fileUrl: 'exports/job-1/Test Deck.pptx',
        presentation: { title: 'Test Deck' },
      });

      const result = await service.getSignedDownloadUrl('job-1');

      expect(result.url).toBe('https://s3.example.com/signed-url');
      expect(result.filename).toBe('Test Deck.pptx');
      expect(s3.getSignedDownloadUrl).toHaveBeenCalledWith(
        'exports/job-1/Test Deck.pptx', 3600,
      );
    });

    it('should throw for missing job', async () => {
      prisma.exportJob.findUnique.mockResolvedValue(null);
      await expect(service.getSignedDownloadUrl('nope')).rejects.toThrow(NotFoundException);
    });

    it('should throw for incomplete job', async () => {
      prisma.exportJob.findUnique.mockResolvedValue({
        ...mockJob,
        status: 'PROCESSING',
        fileUrl: null,
      });
      await expect(service.getSignedDownloadUrl('job-1')).rejects.toThrow(NotFoundException);
    });

    it('should use "presentation" as fallback title', async () => {
      prisma.exportJob.findUnique.mockResolvedValue({
        ...mockJob,
        status: 'COMPLETED',
        format: 'PDF',
        fileUrl: 'exports/job-1/file.pdf',
        presentation: null,
      });

      const result = await service.getSignedDownloadUrl('job-1');
      expect(result.filename).toBe('presentation.pdf');
    });
  });

  describe('getExportStatus', () => {
    it('should return the job', async () => {
      const result = await service.getExportStatus('job-1');
      expect(result).toEqual(mockJob);
    });

    it('should throw for missing job', async () => {
      prisma.exportJob.findUnique.mockResolvedValue(null);
      await expect(service.getExportStatus('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getExportsByPresentation', () => {
    it('should return jobs ordered by createdAt desc', async () => {
      await service.getExportsByPresentation('pres-1');
      expect(prisma.exportJob.findMany).toHaveBeenCalledWith({
        where: { presentationId: 'pres-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
