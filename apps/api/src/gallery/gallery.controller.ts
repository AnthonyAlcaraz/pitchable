import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Body,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator.js';
import { GalleryService } from './gallery.service.js';
import { GalleryQueryDto } from './dto/gallery-query.dto.js';

@Controller('gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get('presentations')
  async listPublicPresentations(@Query() query: GalleryQueryDto) {
    return this.galleryService.listPublicPresentations({
      page: query.page ?? 1,
      limit: query.limit ?? 12,
      search: query.search,
      type: query.type,
      theme: query.theme,
      sort: query.sort === 'trending' ? 'trending' : 'recent',
    });
  }

  @Get('presentations/:id')
  async getPublicPresentation(@Param('id', ParseUUIDPipe) id: string) {
    return this.galleryService.getPublicPresentation(id);
  }

  @Get('lenses')
  async listPublicLenses(@Query() query: GalleryQueryDto) {
    return this.galleryService.listPublicLenses({
      page: query.page ?? 1,
      limit: query.limit ?? 12,
    });
  }

  @Get('stats')
  async getStats() {
    return this.galleryService.getStats();
  }

  @Post('presentations/:id/fork')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async forkPublicPresentation(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.galleryService.forkPublicPresentation(id, user.userId);
  }
  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seedGallery(
    @Body() body: Record<string, Record<string, { title: string; body: string }>>,
  ) {
    return this.galleryService.seedGallery(body);
  }
}
