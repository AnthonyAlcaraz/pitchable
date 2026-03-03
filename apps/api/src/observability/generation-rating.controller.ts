import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { GenerationRatingService } from './generation-rating.service.js';

interface SubmitRatingDto {
  rating: number;
  comment?: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class GenerationRatingController {
  constructor(private readonly ratingService: GenerationRatingService) {}

  @Post('presentations/:id/rating')
  async submitRating(
    @Param('id') presentationId: string,
    @Body() body: SubmitRatingDto,
    @Request() req: { user: { sub: string } },
  ) {
    const { rating, comment } = body;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be an integer between 1 and 5');
    }
    return this.ratingService.submitRating(req.user.sub, presentationId, rating, comment);
  }

  @Get('presentations/:id/rating')
  async getRating(@Param('id') presentationId: string) {
    return this.ratingService.getRating(presentationId);
  }

  @Get('observability/insights')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getInsights(@Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 30;
    return this.ratingService.getInsights(isNaN(d) ? 30 : d);
  }
}
