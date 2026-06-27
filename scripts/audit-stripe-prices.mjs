import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });

const prices = await stripe.prices.list({ active: true, limit: 50, expand: ['data.product'] });

console.log('=== ALL ACTIVE PRICES ===');
prices.data.forEach(p => {
  const prod = p.product;
  console.log(JSON.stringify({
    id: p.id,
    product: prod?.name || prod?.id,
    amount_cents: p.unit_amount,
    amount_dollars: (p.unit_amount / 100).toFixed(2),
    currency: p.currency,
    interval: p.recurring?.interval || 'one_time',
    nickname: p.nickname,
  }));
});
