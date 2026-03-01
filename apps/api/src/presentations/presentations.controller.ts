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
import { RenamePresentationDto } from './dto/rename-presentation.dto.js';
import { ForkPresentationDto } from './dto/fork-presentation.dto.js';

// ── Export Request DTO ──────────────────────────────────────

import { IsString, IsOptional, IsUUID, IsBoolean, IsUrl } from 'class-validator';

class ExportRequestDto {
  @IsString({ each: true })
  formats: string[];

  @IsOptional()
  @IsString()
  emailTo?: string; // email address or "me" to send to authenticated user's email
}

class QuickCreateDto {
  @IsOptional()
  @IsUUID()
  briefId?: string;

  @IsOptional()
  @IsUUID()
  pitchLensId?: string;
}

class VisibilityDto {
  @IsBoolean()
  isPublic: boolean;
}

class LogoUrlDto {
  @IsUrl()
  logoUrl: string;
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
   * POST /presentations/quick-create
   * Create a blank DRAFT presentation, optionally linked to a brief and/or lens.
   */
  @Post('quick-create')
  @HttpCode(HttpStatus.CREATED)
  async quickCreate(
    @CurrentUser() user: RequestUser,
    @Body() dto: QuickCreateDto,
  ) {
    return this.presentationsService.quickCreate(user.userId, dto);
  }

  /**
   * GET /presentations/diag
   * Temporary diagnostic — surfaces actual error messages for debugging.
   */
  @Get('diag')
  async diag(@CurrentUser() user: RequestUser) {
    const results: Record<string, string> = {};
    try {
      const lenses = await this.presentationsService.diagPitchLens(user.userId);
      results['pitchLens'] = `OK: ${lenses} lenses`;
    } catch (e: unknown) {
      results['pitchLens'] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
    try {
      const count = await this.presentationsService.diagExport(user.userId);
      results['export'] = `OK: ${count}`;
    } catch (e: unknown) {
      results['export'] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
    return results;
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
   * PATCH /presentations/:id
   * Rename a presentation (title and/or description).
   */
  @Patch(':id')
  async rename(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RenamePresentationDto,
  ) {
    return this.presentationsService.rename(id, user.userId, dto);
  }

  /**
   * PATCH /presentations/:id/visibility
   * Toggle public visibility of a presentation.
   */
  @Patch(':id/visibility')
  async setVisibility(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VisibilityDto,
  ) {
    return this.presentationsService.setVisibility(id, user.userId, dto.isPublic);
  }

  /**
   * POST /presentations/:id/duplicate
   * Duplicate a presentation with all slides.
   */
  @Post(':id/duplicate')
  @HttpCode(HttpStatus.CREATED)
  async duplicate(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.presentationsService.duplicate(id, user.userId);
  }

  /**
   * POST /presentations/:id/fork
   * Fork a presentation with optional Brief/Lens overrides.
   */
  @Post(':id/fork')
  @HttpCode(HttpStatus.CREATED)
  async fork(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ForkPresentationDto,
  ) {
    return this.presentationsService.fork(id, user.userId, dto);
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
   * PATCH /presentations/:id/logo
   * Set the logo URL for a presentation.
   */
  @Patch(':id/logo')
  async updateLogo(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LogoUrlDto,
  ) {
    return this.presentationsService.updateLogoUrl(id, user.userId, dto.logoUrl);
  }

  /**
   * DELETE /presentations/:id/logo
   * Clear the logo from a presentation.
   */
  @Delete(':id/logo')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLogo(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.presentationsService.clearLogoUrl(id, user.userId);
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
    return this.presentationsService.queueExport(id, user.userId, dto.formats, dto.emailTo, user.email);
  }
}
