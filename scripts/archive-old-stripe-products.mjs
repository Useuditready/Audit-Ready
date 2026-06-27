import 'dotenv/config';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil' });

// Old/unused prices to archive
const OLD_PRICE_IDS = [
  'price_1TXrdALvSgVYha1r2C8pRzkt', // Standard $129/mo
  'price_1TXrdALvSgVYha1rixExsSI5', // Pro $299/mo
  'price_1TXrdALvSgVYha1rYaln9PfL', // Done For You $649/mo
  'price_1TXrd9LvSgVYha1rocgZUjLG', // AuditReady DFY Setup Fee $299
];

console.log('=== Archiving old Stripe prices ===\n');

const productIds = new Set();

for (const priceId of OLD_PRICE_IDS) {
  try {
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    const productId = typeof price.product === 'string' ? price.product : price.product?.id;
    if (productId) productIds.add(productId);

    await stripe.prices.update(priceId, { active: false });
    console.log(`✓ Archived price: ${priceId} (${price.product?.name || productId})`);
  } catch (err) {
    console.error(`✗ Failed to archive price ${priceId}:`, err.message);
  }
}

console.log('\n=== Archiving old Stripe products ===\n');

for (const productId of productIds) {
  try {
    const product = await stripe.products.update(productId, { active: false });
    console.log(`✓ Archived product: ${productId} (${product.name})`);
  } catch (err) {
    console.error(`✗ Failed to archive product ${productId}:`, err.message);
  }
}

console.log('\n=== Verifying remaining active prices ===\n');
const remaining = await stripe.prices.list({ active: true, limit: 50, expand: ['data.product'] });
remaining.data.forEach(p => {
  const prod = p.product;
  console.log(`  ${p.id} | ${prod?.name || prod?.id} | $${(p.unit_amount / 100).toFixed(2)} | ${p.recurring?.interval || 'one_time'}`);
});

console.log('\nDone.');
