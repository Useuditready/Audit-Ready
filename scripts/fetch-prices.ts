import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-04-30.basil' });
const prices = await stripe.prices.list({ limit: 20, expand: ['data.product'] });
prices.data.forEach(p => {
  const prod = p.product as Stripe.Product;
  console.log(JSON.stringify({
    priceId: p.id,
    product: prod.name,
    amount: p.unit_amount,
    currency: p.currency,
    interval: p.recurring?.interval,
    interval_count: p.recurring?.interval_count,
    active: p.active
  }));
});
