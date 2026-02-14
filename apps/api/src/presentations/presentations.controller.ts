import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator.js';
import { PresentationsService } from './presentations.service.js';
import { CreatePresentationDto } from './dto/create-presentation.dto.js';
import { UpdateSlideDto } from './dto/update-slide.dto.js';

// ── Export Request DTO ──────────────────────────────────────

import { IsString } from 'class-validator';

class ExportRequestDto {
  @IsString({ each: true })
  formats: string[];
}

// ── Controller ──────────────────────────────────────────────

@Controller('presentations')
@UseGuards(JwtAuthGuard)
export class PresentationsController {
  constructor(private readonly presentationsService: PresentationsService) {}

  /**
   * POST /presentations
   * Create a new presentation from raw content.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: RequestUser,
    @Body() dto: CreatePresentationDto,
  ) {
    return this.presentationsService.create(user.userId, dto);
  }

  /**
   * GET /presentations
   * List all presentations for the authenticated user.
   */
  @Get()
  async findAll(@CurrentUser() user: RequestUser) {
    return this.presentationsService.findAll(user.userId);
  }

  /**
   * GET /presentations/:id
   * Get a single presentation with all slides.
   */
  @Get(':id')
  async findOne(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.presentationsService.findOne(id, user.userId);
  }

  /**
   * PATCH /presentations/:id/slides/:slideId
   * Update an individual slide's content.
   */
  @Patch(':id/slides/:slideId')
  async updateSlide(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('slideId', ParseUUIDPipe) slideId: string,
    @Body() dto: UpdateSlideDto,
  ) {
    return this.presentationsService.updateSlide(slideId, user.userId, dto);
  }

  /**
   * POST /presentations/:id/slides/:slideId/regenerate-image
   * Regenerate the AI image for a specific slide.
   */
  @Post(':id/slides/:slideId/regenerate-image')
  @HttpCode(HttpStatus.ACCEPTED)
  async regenerateSlideImage(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) _id: string,
    @Param('slideId', ParseUUIDPipe) slideId: string,
  ) {
    return this.presentationsService.regenerateSlideImage(slideId, user.userId);
  }

  /**
   * DELETE /presentations/:id
   * Delete a presentation and all associated data.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.presentationsService.delete(id, user.userId);
  }

  /**
   * POST /presentations/:id/export
   * Trigger export in one or more formats.
   */
  @Post(':id/export')
  @HttpCode(HttpStatus.ACCEPTED)
  async exportPresentation(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExportRequestDto,
  ) {
    return this.presentationsService.queueExport(id, user.userId, dto.formats);
  }
}
