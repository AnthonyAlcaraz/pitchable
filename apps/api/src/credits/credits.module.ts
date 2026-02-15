import { Module } from '@nestjs/common';
import { CreditsService } from './credits.service.js';
import { CreditReservationService } from './credit-reservation.service.js';
import { TierEnforcementService } from './tier-enforcement.service.js';
import { CreditsController } from './credits.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CreditsController],
  providers: [CreditsService, CreditReservationService, TierEnforcementService],
  exports: [CreditsService, CreditReservationService, TierEnforcementService],
})
export class CreditsModule {}
