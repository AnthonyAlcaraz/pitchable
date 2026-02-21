import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { FigmaTemplateService } from './figma-template.service.js';
import { CreateFigmaTemplateDto } from './dto/create-figma-template.dto.js';
import { MapFrameDto } from './dto/map-frame.dto.js';
import { CreateFromUrlDto } from './dto/create-from-url.dto.js';

interface AuthRequest {
  user: { userId: string };
}

@Controller('figma/templates')
@UseGuards(JwtAuthGuard)
export class FigmaTemplateController {
  constructor(
    private readonly templateService: FigmaTemplateService,
  ) {}

  @Post()
  async createTemplate(
    @Request() req: AuthRequest,
    @Body() dto: CreateFigmaTemplateDto,
  ) {
    return this.templateService.createTemplate(req.user.userId, dto);
  }

  @Get()
  async listTemplates(@Request() req: AuthRequest) {
    return this.templateService.listTemplates(req.user.userId);
  }

  /** Create template from Figma URL and auto-map with AI in one step. */
  @Post('from-url')
  async createFromUrl(
    @Request() req: AuthRequest,
    @Body() dto: CreateFromUrlDto,
  ) {
    return this.templateService.createFromUrl(req.user.userId, dto.figmaUrl, dto.name);
  }

  @Get(':id')
  async getTemplate(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.getTemplate(id, req.user.userId);
  }

  @Delete(':id')
  async deleteTemplate(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.deleteTemplate(id, req.user.userId);
  }

  @Post(':id/map')
  async mapFrame(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: MapFrameDto,
  ) {
    return this.templateService.mapFrame(id, req.user.userId, dto);
  }

  @Delete(':id/map/:slideType')
  async unmapSlideType(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Param('slideType') slideType: string,
  ) {
    return this.templateService.unmapSlideType(id, slideType, req.user.userId);
  }

  /** Remove a single frame from a multi-frame mapping. */
  @Delete(':id/map/:slideType/:nodeId')
  async unmapSingleFrame(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Param('slideType') slideType: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.templateService.unmapSingleFrame(id, req.user.userId, slideType, nodeId);
  }

  @Post(':id/auto-map')
  async autoMapFrames(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.autoMapFrames(id, req.user.userId);
  }

  /** AI-powered auto-map: uses Sonnet 4.6 vision to classify frames by visual layout. */
  @Post(':id/auto-map-ai')
  async autoMapFramesAi(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.autoMapFrames(id, req.user.userId, true);
  }

  @Post(':id/refresh')
  async refreshThumbnails(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.refreshThumbnails(id, req.user.userId);
  }
}
