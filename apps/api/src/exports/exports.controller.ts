import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { HttpResponse } from '../types/express.js';
import { ExportsService } from './exports.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ExportFormat } from '../../generated/prisma/enums.js';

interface CreateExportBody {
  format: ExportFormat;
  renderEngine?: 'auto' | 'marp' | 'figma';
}

@UseGuards(JwtAuthGuard)
@Controller()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('presentations/:id/export')
  async createExport(
    @Param('id') presentationId: string,
    @Body() body: CreateExportBody,
  ) {
    const job = await this.exportsService.createExportJob(
      presentationId,
      body.format,
    );

    // Process the export immediately (in production, this would be a queue job)
    void this.exportsService.processExport(job.id, body.renderEngine);

    return {
      jobId: job.id,
      status: job.status,
      format: job.format,
    };
  }

  @Get('exports/:jobId')
  async getExportStatus(@Param('jobId') jobId: string) {
    return this.exportsService.getExportStatus(jobId);
  }

  @Get('exports/:jobId/download')
  async downloadExport(
    @Param('jobId') jobId: string,
    @Res() res: HttpResponse,
  ) {
    const { url } = await this.exportsService.getSignedDownloadUrl(jobId);

    // If URL is a local path (S3 unavailable), serve the file directly
    if (url.startsWith('/exports/')) {
      const { buffer, filename, contentType } =
        await this.exportsService.getExportBuffer(jobId);
      res.setHeader('Content-Type', contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(filename)}"`,
      );
      res.send(buffer);
      return;
    }

    // S3 presigned URL — redirect
    res.redirect(url);
  }

  @Get('slides/:slideId/preview')
  async getSlidePreview(
    @Param('slideId') slideId: string,
    @Res() res: HttpResponse,
  ) {
    const result = await this.exportsService.getSlidePreviewImage(slideId);
    if (!result) {
      res.status(404).json({ message: 'No preview available' });
      return;
    }

    if ('url' in result) {
      res.redirect(result.url);
      return;
    }

    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(result.buffer);
  }
}
