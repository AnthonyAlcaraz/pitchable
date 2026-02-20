import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { CREDIT_PACKS } from '../credits/tier-config.js';
import type { CreditPack } from '../credits/tier-config.js';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe | null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY');
    this.stripe = secretKey
      ? new Stripe(secretKey)
      : null;
  }

  get isConfigured(): boolean {
    return this.stripe !== null;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY env var.');
    }
    return this.stripe;
  }

  /**
   * Get or create a Stripe customer for a user.
   */
  async getOrCreateCustomer(
    userId: string,
    email: string,
    name: string,
  ): Promise<string> {
    // Check if user already has a Stripe customer ID
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const stripe = this.requireStripe();
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { userId },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    this.logger.log(`Created Stripe customer ${customer.id} for user ${userId}`);
    return customer.id;
  }

  /**
   * Create a Stripe Checkout Session for subscription.
   */
  async createCheckoutSession(
    userId: string,
    email: string,
    name: string,
    tier: 'STARTER' | 'PRO',
  ): Promise<{ sessionId: string; url: string }> {
    const stripe = this.requireStripe();
    const customerId = await this.getOrCreateCustomer(userId, email, name);

    const priceId = tier === 'STARTER'
      ? this.config.get<string>('STRIPE_STARTER_PRICE_ID')
      : this.config.get<string>('STRIPE_PRO_PRICE_ID');

    if (!priceId) {
      throw new Error(`No Stripe price ID configured for ${tier} tier`);
    }

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/billing?status=success`,
      cancel_url: `${frontendUrl}/billing?status=cancel`,
      metadata: { userId, tier },
    });

    this.logger.log(`Created checkout session ${session.id} for user ${userId} (${tier})`);
    return { sessionId: session.id, url: session.url! };
  }

  /**
   * Create a Stripe Checkout Session for a one-time credit pack purchase.
   */
  async createTopUpCheckoutSession(
    userId: string,
    email: string,
    name: string,
    pack: CreditPack,
  ): Promise<{ sessionId: string; url: string }> {
    const stripe = this.requireStripe();
    const customerId = await this.getOrCreateCustomer(userId, email, name);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Pitchable ${pack.label}` },
            unit_amount: pack.priceCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/billing?status=success`,
      cancel_url: `${frontendUrl}/billing?status=cancel`,
      metadata: { userId, packId: pack.id },
    });

    this.logger.log(`Created top-up checkout ${session.id} for user ${userId} (${pack.id})`);
    return { sessionId: session.id, url: session.url! };
  }

  /**
   * Create a Stripe Customer Portal session.
   */
  async createPortalSession(stripeCustomerId: string): Promise<{ url: string }> {
    const stripe = this.requireStripe();
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${frontendUrl}/billing`,
    });

    return { url: session.url };
  }

  /**
   * Construct and verify a webhook event from Stripe.
   */
  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const stripe = this.requireStripe();
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }
}
