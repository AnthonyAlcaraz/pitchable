import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { HttpResponse } from '../types/express.js';
import { ExportsService } from './exports.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ExportFormat } from '../../generated/prisma/enums.js';

interface CreateExportBody {
  format?: ExportFormat;
  formats?: ExportFormat[];
  renderEngine?: 'auto' | 'marp' | 'figma';
}

@Controller()
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('presentations/:id/export')
  async createExport(
    @Param('id') presentationId: string,
    @Body() body: CreateExportBody,
  ) {
    // Support both { format: 'PDF' } and { formats: ['PDF'] } from frontend
    const requestedFormats = body.formats ?? (body.format ? [body.format] : []);
    if (requestedFormats.length === 0) {
      throw new BadRequestException('No export format specified');
    }

    const jobs = await Promise.all(
      requestedFormats.map(async (fmt) => {
        const job = await this.exportsService.createExportJob(presentationId, fmt);
        this.exportsService.processExport(job.id, body.renderEngine).catch(() => {
          // Error already logged and persisted in processExport's catch block
        });
        return { id: job.id, status: job.status, format: job.format };
      }),
    );

    return jobs;
  }

  @UseGuards(JwtAuthGuard)
  @Get('exports/:jobId')
  async getExportStatus(@Param('jobId') jobId: string) {
    return this.exportsService.getExportStatus(jobId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('exports/:jobId/download-url')
  async getDownloadUrl(@Param('jobId') jobId: string) {
    return this.exportsService.getSignedDownloadUrl(jobId);
  }


  @UseGuards(JwtAuthGuard)
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

  @Post('presentations/:id/generate-previews')
  async generatePreviews(@Param('id') presentationId: string) {
    this.exportsService.generatePreviewsForPresentation(presentationId).catch(() => {
      // Best-effort, errors logged internally
    });
    return { status: 'started' };
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
