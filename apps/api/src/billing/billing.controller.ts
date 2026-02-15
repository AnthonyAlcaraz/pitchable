import {
  Controller,
  Post,
  Get,
  Req,
  Headers,
  Body,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { StripeService } from './stripe.service.js';
import { BillingService } from './billing.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import * as CurrentUserModule from '../auth/decorators/current-user.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

interface CreateCheckoutBody {
  tier: 'STARTER' | 'PRO';
}

@Controller('billing')
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly billing: BillingService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Create a Stripe Checkout Session for subscription.
   */
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
    @Body() body: CreateCheckoutBody,
  ): Promise<{ sessionId: string; url: string }> {
    if (!this.stripe.isConfigured) {
      throw new BadRequestException('Billing is not configured');
    }

    if (!['STARTER', 'PRO'].includes(body.tier)) {
      throw new BadRequestException('Invalid tier. Must be STARTER or PRO.');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { email: true, name: true },
    });

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    return this.stripe.createCheckoutSession(
      user.userId,
      dbUser.email,
      dbUser.name,
      body.tier,
    );
  }

  /**
   * Create a Stripe Customer Portal session.
   */
  @Post('portal')
  @UseGuards(JwtAuthGuard)
  async createPortal(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
  ): Promise<{ url: string }> {
    if (!this.stripe.isConfigured) {
      throw new BadRequestException('Billing is not configured');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { stripeCustomerId: true },
    });

    if (!dbUser?.stripeCustomerId) {
      throw new BadRequestException('No active subscription found');
    }

    return this.stripe.createPortalSession(dbUser.stripeCustomerId);
  }

  /**
   * Get current subscription status.
   */
  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  async getSubscription(
    @CurrentUserModule.CurrentUser() user: CurrentUserModule.RequestUser,
  ) {
    return this.billing.getSubscription(user.userId);
  }

  /**
   * Stripe webhook endpoint. Verifies signature, delegates to billing service.
   * No JWT auth — Stripe calls this directly.
   */
  @Post('webhook')
  @SkipThrottle()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body for webhook verification');
    }

    try {
      const event = this.stripe.constructWebhookEvent(req.rawBody, signature);
      await this.billing.handleWebhookEvent(event);
      return { received: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Webhook error: ${msg}`);
      throw new BadRequestException(`Webhook signature verification failed: ${msg}`);
    }
  }
}
