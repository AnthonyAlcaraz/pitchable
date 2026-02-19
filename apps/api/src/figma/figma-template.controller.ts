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
  user: { sub: string };
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
    return this.templateService.createTemplate(req.user.sub, dto);
  }

  @Get()
  async listTemplates(@Request() req: AuthRequest) {
    return this.templateService.listTemplates(req.user.sub);
  }

  @Get(':id')
  async getTemplate(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.getTemplate(id, req.user.sub);
  }

  @Delete(':id')
  async deleteTemplate(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.deleteTemplate(id, req.user.sub);
  }

  @Post(':id/map')
  async mapFrame(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Body() dto: MapFrameDto,
  ) {
    return this.templateService.mapFrame(id, req.user.sub, dto);
  }

  @Delete(':id/map/:slideType')
  async unmapSlideType(
    @Request() req: AuthRequest,
    @Param('id') id: string,
    @Param('slideType') slideType: string,
  ) {
    return this.templateService.unmapSlideType(id, slideType, req.user.sub);
  }

  @Post(':id/auto-map')
  async autoMapFrames(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.autoMapFrames(id, req.user.sub);
  }

  @Post(':id/refresh')
  async refreshThumbnails(
    @Request() req: AuthRequest,
    @Param('id') id: string,
  ) {
    return this.templateService.refreshThumbnails(id, req.user.sub);
  }
}
