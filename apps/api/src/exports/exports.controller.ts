import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import * as express from 'express';
import { ExportsService } from './exports.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ExportFormat } from '../../generated/prisma/enums.js';

interface CreateExportBody {
  format: ExportFormat;
  renderEngine?: 'marp' | 'figma';
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
    const { url } = await this.exportsService.getSignedDownloadUrl(jobId);
    res.redirect(302, url);
  }
}
