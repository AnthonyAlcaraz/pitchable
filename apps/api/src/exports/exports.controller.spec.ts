// Mock PrismaService and S3Service to avoid ESM import.meta issues
jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class MockPrismaService {},
}));
jest.mock('../knowledge-base/storage/s3.service', () => ({
  S3Service: class MockS3Service {},
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
    it('should create job and fire-and-forget processExport', async () => {
      const result = await controller.createExport('pres-1', { format: 'PPTX' as any });

      expect(result).toEqual({
        jobId: 'job-1',
        status: 'QUEUED',
        format: 'PPTX',
      });
      expect(exportsService.createExportJob).toHaveBeenCalledWith('pres-1', 'PPTX');
      expect(exportsService.processExport).toHaveBeenCalledWith('job-1');
    });
  });

  describe('getExportStatus', () => {
    it('should delegate to service', async () => {
      const result = await controller.getExportStatus('job-1');
      expect(result.status).toBe('COMPLETED');
      expect(exportsService.getExportStatus).toHaveBeenCalledWith('job-1');
    });
  });

  describe('downloadExport', () => {
    it('should redirect to signed S3 URL', async () => {
      const res = { redirect: jest.fn() } as any;

      await controller.downloadExport('job-1', res);

      expect(exportsService.getSignedDownloadUrl).toHaveBeenCalledWith('job-1');
      expect(res.redirect).toHaveBeenCalledWith(302, 'https://s3.example.com/signed-url');
    });
  });
});
