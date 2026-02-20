import { Controller, Post, Get, Param, Req, UseGuards } from '@nestjs/common';
import type { HttpRequest } from '../types/express.js';
import { AnalyticsService } from './analytics.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('view/:presentationId')
  async recordView(
    @Param('presentationId') presentationId: string,
    @Req() req: HttpRequest,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
    const referrer = req.headers['referer'] as string | undefined;
    await this.analyticsService.recordView(presentationId, ip, undefined, referrer);
    return { ok: true };
  }

  @Get('creator-stats')
  @UseGuards(JwtAuthGuard)
  async getCreatorStats(@Req() req: HttpRequest) {
    const user = req.user as unknown as { userId: string };
    return this.analyticsService.getCreatorStats(user.userId);
  }
}
