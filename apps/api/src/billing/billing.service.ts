import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreditsService } from '../credits/credits.service.js';
import { TierEnforcementService } from '../credits/tier-enforcement.service.js';
import { UserTier } from '../../generated/prisma/enums.js';
import type Stripe from 'stripe';

export interface SubscriptionDto {
  id: string;
  tier: string;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly tierEnforcement: TierEnforcementService,
  ) {}

  /**
   * Get current subscription for a user.
   */
  async getSubscription(userId: string): Promise<SubscriptionDto | null> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!sub) return null;

    return {
      id: sub.id,
      tier: sub.tier,
      status: sub.status,
      currentPeriodStart: sub.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }

  /**
   * Process a Stripe webhook event.
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(
          event.data.object as Stripe.Invoice,
        );
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice,
        );
        break;

      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutComplete(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const userId = session.metadata?.['userId'];
    const tierStr = session.metadata?.['tier'];

    if (!userId || !tierStr) {
      this.logger.warn('Checkout session missing userId or tier metadata');
      return;
    }

    const tier = tierStr as UserTier;
    const stripeSubscriptionId =
      typeof session.subscription === 'string'
        ? session.subscription
        : session.subscription?.id ?? null;
    const stripeCustomerId =
      typeof session.customer === 'string'
        ? session.customer
        : session.customer?.id ?? null;

    // Upsert subscription record
    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeSubscriptionId,
        tier,
        status: 'active',
      },
      update: {
        stripeSubscriptionId,
        tier,
        status: 'active',
      },
    });

    // Update user tier and Stripe customer ID
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tier,
        stripeCustomerId,
        decksThisMonth: 0,
        monthResetAt: new Date(),
      },
    });

    // Allocate monthly credits
    await this.tierEnforcement.allocateMonthlyCredits(userId, tier);

    this.logger.log(`Checkout complete: user ${userId} upgraded to ${tier}`);
  }

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!sub) {
      this.logger.warn(`Subscription ${subscription.id} not found in DB`);
      return;
    }

    const status = subscription.status === 'active'
      ? 'active'
      : subscription.status === 'past_due'
        ? 'past_due'
        : subscription.status;

    // In Stripe v20+, current_period_start/end moved to the Invoice object.
    // We update period from invoice.payment_succeeded instead.
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    this.logger.log(`Subscription ${subscription.id} updated: ${status}`);
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!sub) return;

    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'canceled' },
    });

    // Downgrade user to FREE
    await this.prisma.user.update({
      where: { id: sub.userId },
      data: { tier: UserTier.FREE },
    });

    this.logger.log(`Subscription ${subscription.id} canceled, user ${sub.userId} downgraded to FREE`);
  }

  private async handleInvoicePaymentSucceeded(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    // Only process subscription invoices (not one-time)
    const subRef = invoice.parent?.subscription_details?.subscription;
    if (!subRef) return;

    const subId = typeof subRef === 'string' ? subRef : subRef.id;

    const sub = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subId },
      include: { user: { select: { tier: true } } },
    });

    if (!sub) return;

    // Update period from the invoice (v20+: period lives on Invoice, not Subscription)
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
      },
    });

    // Allocate monthly credits on renewal
    await this.tierEnforcement.allocateMonthlyCredits(sub.userId, sub.user.tier);

    // Reset monthly deck count
    await this.prisma.user.update({
      where: { id: sub.userId },
      data: { decksThisMonth: 0, monthResetAt: new Date() },
    });

    this.logger.log(`Invoice paid for subscription ${subId}: monthly credits allocated`);
  }

  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice,
  ): Promise<void> {
    const subRef = invoice.parent?.subscription_details?.subscription;
    if (!subRef) return;

    const subId = typeof subRef === 'string' ? subRef : subRef.id;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subId },
      data: { status: 'past_due' },
    });

    this.logger.warn(`Invoice payment failed for subscription ${subId}`);
  }
}
