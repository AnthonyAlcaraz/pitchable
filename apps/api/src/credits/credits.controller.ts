import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { CreditsService } from './credits.service.js';
import { TierEnforcementService } from './tier-enforcement.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import * as CurrentUserModule from '../auth/decorators/current-user.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreditReason, UserTier } from '../../generated/prisma/enums.js';

@Controller('credits')
export class CreditsController {
  constructor(
    private readonly creditsService: CreditsService,
    private readonly tierEnforcement: TierEnforcementService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('balance')
  async getBalance(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
  ): Promise<{ balance: number }> {
    const balance = await this.creditsService.getBalance(user.userId);
    return { balance };
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.creditsService.getHistory(user.userId, parsedLimit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('tier-status')
  async getTierStatus(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
  ) {
    return this.tierEnforcement.getTierStatus(user.userId);
  }

  @Post('admin/grant')
  async adminGrant(
    @Headers('x-admin-secret') secret: string,
    @Body() body: { email: string; credits?: number; tier?: string },
  ) {
    if (secret !== process.env['ADMIN_SECRET']) {
      throw new ForbiddenException('Invalid admin secret');
    }
    const user = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) throw new ForbiddenException('User not found');

    const updates: Record<string, unknown> = {};
    if (body.tier && Object.values(UserTier).includes(body.tier as UserTier)) {
      updates['tier'] = body.tier;
    }
    if (body.credits && body.credits > 0) {
      await this.creditsService.addCredits(user.id, body.credits, CreditReason.ADMIN_GRANT);
    }
    if (Object.keys(updates).length > 0) {
      await this.prisma.user.update({ where: { id: user.id }, data: updates });
    }

    const updated = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { email: true, tier: true, creditBalance: true },
    });
    return updated;
  }
}
