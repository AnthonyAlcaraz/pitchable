import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ImagesService } from './images.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { ImageJobModel } from '../../generated/prisma/models.js';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Get('jobs/:presentationId')
  async getJobsForPresentation(
    @Param('presentationId', ParseUUIDPipe) presentationId: string,
  ): Promise<ImageJobModel[]> {
    return this.imagesService.getJobsForPresentation(presentationId);
  }

  @Get('jobs/:jobId/status')
  async getJobStatus(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<ImageJobModel> {
    return this.imagesService.getJobStatus(jobId);
  }

  @Post('jobs/:jobId/retry')
  async retryJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<ImageJobModel> {
    return this.imagesService.retryJob(jobId);
  }
}
