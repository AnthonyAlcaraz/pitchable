import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { IsInt, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser, type RequestUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { GenerationRatingService } from './generation-rating.service.js';


export class SubmitRatingDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
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
    @CurrentUser() user: RequestUser,
  ) {
    return this.ratingService.submitRating(user.userId, presentationId, body.rating, body.comment);
  }

  @Get('presentations/:id/rating')
  async getRating(@Param('id') presentationId: string) {
    return this.ratingService.getRating(presentationId);
  }

  @Get('observability/insights')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async getInsights(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const bounded = Math.min(Math.max(days, 1), 365);
    return this.ratingService.getInsights(bounded);
  }

}
