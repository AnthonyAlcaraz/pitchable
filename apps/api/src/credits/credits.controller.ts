import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreditsService } from './credits.service.js';
import { TierEnforcementService } from './tier-enforcement.service.js';
import { CreditReservationService } from './credit-reservation.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import * as CurrentUserModule from '../auth/decorators/current-user.decorator.js';
import { CreditReason } from '../../generated/prisma/enums.js';

interface PurchaseCreditsBody {
  amount: number;
}

@UseGuards(JwtAuthGuard)
@Controller('credits')
export class CreditsController {
  constructor(
    private readonly creditsService: CreditsService,
    private readonly tierEnforcement: TierEnforcementService,
    private readonly reservations: CreditReservationService,
  ) {}

  @Get('balance')
  async getBalance(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
  ): Promise<{ balance: number }> {
    const balance = await this.creditsService.getBalance(user.userId);
    return { balance };
  }

  @Get('history')
  async getHistory(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.creditsService.getHistory(user.userId, parsedLimit);
  }

  @Get('tier-status')
  async getTierStatus(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
  ) {
    const status = await this.tierEnforcement.getTierStatus(user.userId);
    const reserved = await this.reservations.getReservedAmount(user.userId);
    return { ...status, creditsReserved: reserved };
  }

  @Post('purchase')
  async purchaseCredits(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
    @Body() body: PurchaseCreditsBody,
  ) {
    return this.creditsService.addCredits(
      user.userId,
      body.amount,
      CreditReason.PURCHASE,
    );
  }
}
