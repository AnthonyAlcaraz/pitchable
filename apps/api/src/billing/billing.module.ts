import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service.js';
import { BillingService } from './billing.service.js';
import { BillingController } from './billing.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CreditsModule } from '../credits/credits.module.js';

@Module({
  imports: [PrismaModule, CreditsModule, ConfigModule],
  controllers: [BillingController],
  providers: [StripeService, BillingService],
  exports: [StripeService, BillingService],
})
export class BillingModule {}
