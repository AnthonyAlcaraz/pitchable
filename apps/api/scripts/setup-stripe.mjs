#!/usr/bin/env node
/**
 * One-time Stripe product/price setup for Pitchable.
 *
 * Creates:
 *   - Pitchable Starter subscription ($19/mo)
 *   - Pitchable Pro subscription ($49/mo)
 *   - Credit pack: 10 credits ($7.99 one-time)
 *   - Credit pack: 25 credits ($14.99 one-time)
 *   - Credit pack: 50 credits ($24.99 one-time)
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe.mjs
 *
 * Output: env vars to add to .env
 */

import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Set STRIPE_SECRET_KEY env var first.');
  process.exit(1);
}

const stripe = new Stripe(key);

async function createProduct(name, metadata) {
  const existing = await stripe.products.search({
    query: `name:"${name}" AND active:"true"`,
  });
  if (existing.data.length > 0) {
    console.log(`  Product "${name}" already exists: ${existing.data[0].id}`);
    return existing.data[0];
  }
  const product = await stripe.products.create({ name, metadata });
  console.log(`  Created product "${name}": ${product.id}`);
  return product;
}

async function createPrice(productId, unitAmount, currency, recurring, nickname) {
  const params = { product: productId, unit_amount: unitAmount, currency, nickname };
  if (recurring) params.recurring = recurring;

  // Check for existing price with same amount on this product
  const existing = await stripe.prices.list({ product: productId, active: true, limit: 10 });
  const match = existing.data.find(
    (p) => p.unit_amount === unitAmount && p.nickname === nickname,
  );
  if (match) {
    console.log(`  Price "${nickname}" already exists: ${match.id}`);
    return match;
  }

  const price = await stripe.prices.create(params);
  console.log(`  Created price "${nickname}": ${price.id}`);
  return price;
}

async function main() {
  console.log('\n=== Pitchable Stripe Setup ===\n');

  // --- Subscriptions ---
  console.log('1. Subscription products:');
  const starter = await createProduct('Pitchable Starter', { tier: 'STARTER' });
  const starterPrice = await createPrice(
    starter.id, 1900, 'usd', { interval: 'month' }, 'Starter Monthly',
  );

  const pro = await createProduct('Pitchable Pro', { tier: 'PRO' });
  const proPrice = await createPrice(
    pro.id, 4900, 'usd', { interval: 'month' }, 'Pro Monthly',
  );

  // --- Credit Packs ---
  console.log('\n2. Credit pack products:');
  const creditsProduct = await createProduct('Pitchable Credits', { type: 'credits' });

  const pack10 = await createPrice(creditsProduct.id, 799, 'usd', null, '10 Credits');
  const pack25 = await createPrice(creditsProduct.id, 1499, 'usd', null, '25 Credits');
  const pack50 = await createPrice(creditsProduct.id, 2499, 'usd', null, '50 Credits');

  // --- Output ---
  console.log('\n=== Add these to your .env ===\n');
  console.log(`STRIPE_STARTER_PRICE_ID=${starterPrice.id}`);
  console.log(`STRIPE_PRO_PRICE_ID=${proPrice.id}`);
  console.log(`STRIPE_PACK_10_PRICE_ID=${pack10.id}`);
  console.log(`STRIPE_PACK_25_PRICE_ID=${pack25.id}`);
  console.log(`STRIPE_PACK_50_PRICE_ID=${pack50.id}`);
  console.log('\nDone! Also set up a webhook at https://dashboard.stripe.com/webhooks');
  console.log('Events to listen for:');
  console.log('  - checkout.session.completed');
  console.log('  - customer.subscription.updated');
  console.log('  - customer.subscription.deleted');
  console.log('  - invoice.payment_succeeded');
  console.log('  - invoice.payment_failed');
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
