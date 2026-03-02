import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(private readonly analytics: AdminAnalyticsService) {}

  @Get('overview')
  getOverview(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analytics.getOverview(days);
  }

  @Get('users')
  getUsers(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analytics.getUsers(days);
  }

  @Get('features')
  getFeatures(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analytics.getFeatures(days);
  }

  @Get('generations')
  getGenerations(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analytics.getGenerations(days);
  }

  @Get('api-keys')
  getApiKeys(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analytics.getApiKeys(days);
  }

  @Get('funnel')
  getFunnel(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.analytics.getFunnel(days);
  }
}
