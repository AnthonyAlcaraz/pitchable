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

  @Post(':id/auto-map')
  async autoMapFrames(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.autoMapFrames(id, req.user.userId);
  }

  @Post(':id/refresh')
  async refreshThumbnails(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.refreshThumbnails(id, req.user.userId);
  }
}
