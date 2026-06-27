import { describe, it, expect } from 'vitest';
import Stripe from 'stripe';

describe('Stripe connection', () => {
  it('should connect and list products using the secret key', async () => {
    const key = process.env.STRIPE_SECRET_KEY;
    expect(key, 'STRIPE_SECRET_KEY must be set').toBeTruthy();

    const stripe = new Stripe(key!, { apiVersion: '2025-04-30.basil' });
    const products = await stripe.products.list({ limit: 3 });
    expect(products.data.length).toBeGreaterThan(0);
    console.log('[stripe] connected — products:', products.data.map(p => p.name));
  }, 15000);
});
