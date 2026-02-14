import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import * as express from 'express';
import { createReadStream, existsSync } from 'fs';
import { ExportsService } from './exports.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ExportFormat, JobStatus } from '../../generated/prisma/enums.js';

interface CreateExportBody {
  format: ExportFormat;
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
    void this.exportsService.processExport(job.id);

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
    @Res() res: express.Response,
  ) {
    const job = await this.exportsService.getExportStatus(jobId);

    if (job.status !== JobStatus.COMPLETED) {
      throw new NotFoundException(
        `Export job "${jobId}" is not completed. Current status: ${job.status}`,
      );
    }

    if (!job.fileUrl || !existsSync(job.fileUrl)) {
      throw new NotFoundException(
        `Export file not found for job "${jobId}"`,
      );
    }

    const contentTypeMap: Record<string, string> = {
      [ExportFormat.PPTX]:
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      [ExportFormat.PDF]: 'application/pdf',
      [ExportFormat.REVEAL_JS]: 'text/html',
      [ExportFormat.GOOGLE_SLIDES]: 'application/json',
    };

    const extensionMap: Record<string, string> = {
      [ExportFormat.PPTX]: 'pptx',
      [ExportFormat.PDF]: 'pdf',
      [ExportFormat.REVEAL_JS]: 'html',
      [ExportFormat.GOOGLE_SLIDES]: 'json',
    };

    const contentType = contentTypeMap[job.format] ?? 'application/octet-stream';
    const extension = extensionMap[job.format] ?? 'bin';

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="presentation.${extension}"`,
    );

    const stream = createReadStream(job.fileUrl);
    stream.pipe(res);
  }
}
