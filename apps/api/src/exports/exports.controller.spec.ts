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

// Mock PrismaService and S3Service to avoid ESM import.meta issues
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));
jest.mock('../knowledge-base/storage/s3.service', () => ({
  S3Service: class MockS3Service {},
}));
jest.mock('../observability/activity.service', () => ({
  ActivityService: class MockActivityService { track() {} },
}));
jest.mock('../observability/generation-rating.service', () => ({
  GenerationRatingService: class MockGenerationRatingService { markExported() {} },
}));
jest.mock('../figma/figma-renderer.service', () => ({
  FigmaRendererService: class MockFigmaRendererService {},
}));
jest.mock('../themes/themes.service', () => ({
  ThemesService: class MockThemesService {},
  getImageFrequencyForTheme: () => 0,
  getThemeCategoryByName: () => 'dark',
}));
jest.mock('../events/events.gateway', () => ({
  EventsGateway: class MockEventsGateway { emitExportProgress() {} },
}));

import { ExportsController } from './exports.controller';

describe('ExportsController', () => {
  let controller: ExportsController;
  let exportsService: {
    createExportJob: jest.Mock;
    processExport: jest.Mock;
    getExportStatus: jest.Mock;
    getSignedDownloadUrl: jest.Mock;
  };

  beforeEach(() => {
    exportsService = {
      createExportJob: jest.fn().mockResolvedValue({
        id: 'job-1',
        status: 'QUEUED',
        format: 'PPTX',
      }),
      processExport: jest.fn().mockResolvedValue(undefined),
      getExportStatus: jest.fn().mockResolvedValue({
        id: 'job-1',
        status: 'COMPLETED',
        format: 'PPTX',
        fileUrl: 'exports/job-1/deck.pptx',
      }),
      getSignedDownloadUrl: jest.fn().mockResolvedValue({
        url: 'https://s3.example.com/signed-url',
        filename: 'deck.pptx',
      }),
    };

    controller = new ExportsController(exportsService as any);
  });

  describe('createExport', () => {
    it('should create jobs and fire-and-forget processExport', async () => {
      const result = await controller.createExport('pres-1', { formats: ['PPTX' as any] });

      expect(result).toEqual([{
        id: 'job-1',
        status: 'QUEUED',
        format: 'PPTX',
      }]);
      expect(exportsService.createExportJob).toHaveBeenCalledWith('pres-1', 'PPTX');
      expect(exportsService.processExport).toHaveBeenCalledWith('job-1', undefined);
    });
  });

  describe('getExportStatus', () => {
    it('should delegate to service with userId', async () => {
      const user = { userId: 'user-1', email: 'test@test.com', role: 'USER' };
      const result = await controller.getExportStatus('job-1', user as any);
      expect(result.status).toBe('COMPLETED');
      expect(exportsService.getExportStatus).toHaveBeenCalledWith('job-1', 'user-1');
    });
  });

  describe('downloadExport', () => {
    it('should redirect to signed S3 URL', async () => {
      const user = { userId: 'user-1', email: 'test@test.com', role: 'USER' };
      const res = { redirect: jest.fn(), setHeader: jest.fn(), send: jest.fn() } as any;

      await controller.downloadExport('job-1', user as any, res);

      expect(exportsService.getSignedDownloadUrl).toHaveBeenCalledWith('job-1', 'user-1');
      expect(res.redirect).toHaveBeenCalledWith('https://s3.example.com/signed-url');
    });
  });
});
