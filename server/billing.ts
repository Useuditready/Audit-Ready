/**
 * AuditReady — Stripe Billing Helpers
 * Wraps Stripe SDK calls for checkout session creation and webhook handling.
 */

import Stripe from "stripe";
import { getStripeUserById, getUserByStripeCustomerId, updateUserStripeInfo, setUserSubscribed, setUserCancelled, getUserById, getSalesRepByCode, setUserAcquisitionSource, createCommission, logNotification } from "./db";
import {
  sendOwnerSubscriptionNotification,
  sendAdminSetupFeePaidNotification,
  sendAdminCommissionEarnedNotification,
  sendAdminSubscriptionFailedNotification,
  sendAdminSubscriptionCancelledNotification,
  sendRepCommissionEarnedEmail,
  sendAgencyPaymentFailedEmail,
  sendAgencySubscriptionRenewalEmail,
  sendCancellationWinbackEmail,
  sendAgencySubscriptionEndedEmail,
} from "./email";

// ── Stripe client (lazy init) ──────────────────────────────────
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2025-04-30.basil" as any });
  }
  return _stripe;
}

// ── Price ID map ───────────────────────────────────────────────
export const PRICE_IDS: Record<string, Record<string, string>> = {
  starter: {
    monthly: "price_1TXR2WLvSgVYha1rsBB2jUdI",
    annual: "price_1TXV9WLvSgVYha1rYTgdX3uq",
    setupFee: "price_1TXVANLvSgVYha1rs6J20Ivx",
  },
  growth: {
    monthly: "price_1TXVCfLvSgVYha1rJpRpNgV2",
    annual: "price_1TXVEsLvSgVYha1rWDu4g8bP",
    setupFee: "price_1TXVFVLvSgVYha1rgIL6FIif",
  },
  enterprise: {
    monthly: "price_1TXVIYLvSgVYha1rUjzQSgUm",
    annual: "price_1TXVJELvSgVYha1retWZOsE5",
    setupFee: "price_1TXVJcLvSgVYha1rRDweasXB",
  },
  managed: {
    monthly: "price_1TXrdALvSgVYha1rYaln9PfL",
  },
};

// ── Plan name from price ID ────────────────────────────────────
export function getPlanFromPriceId(priceId: string): "starter" | "growth" | "enterprise" | null {
  for (const [plan, intervals] of Object.entries(PRICE_IDS)) {
    for (const [key, pid] of Object.entries(intervals)) {
      // Skip setup fee entries when resolving plan name
      if (key === "setupFee") continue;
      if (pid === priceId) {
        if (plan === "managed") return "enterprise";
        return plan as "starter" | "growth" | "enterprise";
      }
    }
  }
  return null;
}

// ── Get or create a Stripe Customer for a user ─────────────────
export async function getOrCreateStripeCustomer(userId: number): Promise<string> {
  const stripe = getStripe();
  const user = await getStripeUserById(userId);
  if (!user) throw new Error("User not found");

  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { userId: String(userId) },
  });

  await updateUserStripeInfo(userId, { stripeCustomerId: customer.id });
  return customer.id;
}

// ── Create a Stripe Checkout Session ──────────────────────────
export async function createCheckoutSession(opts: {
  userId: number;
  priceId: string;
  setupFeePriceId?: string;
  successUrl: string;
  cancelUrl: string;
  repCode?: string; // optional rep code for attribution
}): Promise<string> {
  const stripe = getStripe();
  const customerId = await getOrCreateStripeCustomer(opts.userId);

  const lineItems: Array<{ price: string; quantity: number }> = [
    { price: opts.priceId, quantity: 1 },
  ];

  // Add the one-time $199 setup fee if provided
  if (opts.setupFeePriceId) {
    lineItems.push({ price: opts.setupFeePriceId, quantity: 1 });
  }

  // Build session metadata — include repCode if provided for attribution in webhook
  const sessionMetadata: Record<string, string> = {
    userId: String(opts.userId),
  };
  if (opts.repCode) {
    sessionMetadata.repCode = opts.repCode.toUpperCase();
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "subscription",
    line_items: lineItems,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    allow_promotion_codes: true,
    metadata: sessionMetadata,
    subscription_data: {
      metadata: sessionMetadata,
    },
  });

  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

// ── Handle Stripe Webhook Events ──────────────────────────────
export async function handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    // In production, a missing webhook secret is a misconfiguration — reject the request.
    // In development (NODE_ENV !== 'production') we allow unsigned payloads for local testing.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[Stripe] STRIPE_WEBHOOK_SECRET is not set. Cannot verify webhook signature in production.');
    }
    console.warn('[Stripe] STRIPE_WEBHOOK_SECRET not set — skipping signature verification (dev only)');
    event = JSON.parse(rawBody.toString()) as Stripe.Event;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(invoice);
      break;
    }
    default:
      // Unhandled event type — ignore
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!customerId) return;

  const user = await getUserByStripeCustomerId(customerId);
  if (!user) {
    console.warn(`[Stripe] No user found for customer ${customerId}`);
    return;
  }

  // Determine plan from the subscription's price
  let plan: "starter" | "growth" | "enterprise" | null = null;
  if (subscriptionId) {
    try {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price?.id;
      if (priceId) plan = getPlanFromPriceId(priceId);
    } catch (err) {
      console.error("[Stripe] Failed to retrieve subscription:", err);
    }
  }

  await updateUserStripeInfo(user.id, {
    stripeSubscriptionId: subscriptionId ?? undefined,
    ...(plan ? { plan } : {}),
  });

  // Unlock the account — transition from any pilot/locked state to subscribed
  await setUserSubscribed(user.id);

  // Handle acquisition attribution — rep code or direct
  const repCode = session.metadata?.repCode ?? null;
  if (repCode) {
    try {
      const rep = await getSalesRepByCode(repCode);
      if (rep) {
        await setUserAcquisitionSource(user.id, "rep", rep.id, repCode);
        await createCommission({
          repId: rep.id,
          userId: user.id,
          repCode,
          stripeSessionId: session.id,
        });
        console.log(`[Stripe] Commission created for rep ${rep.name} (${repCode}), user ${user.id}`);
      } else {
        // Rep code in metadata but rep not found (deactivated?) — treat as direct
        await setUserAcquisitionSource(user.id, "direct");
        console.warn(`[Stripe] Rep code "${repCode}" not found at checkout completion — attributed as direct`);
      }
    } catch (repErr) {
      console.error("[Stripe] Failed to process rep attribution:", repErr);
      await setUserAcquisitionSource(user.id, "direct");
    }
  } else {
    await setUserAcquisitionSource(user.id, "direct");
  }

  // Fire all notifications
  try {
    const fullUser = await getUserById(user.id);
    const isRepAttributed = !!(repCode);

    // 1. Legacy owner notification (backward compat)
    await sendOwnerSubscriptionNotification({
      userId: user.id,
      email: fullUser?.email ?? null,
      name: fullUser?.name ?? null,
      agencyName: fullUser?.agencyName ?? null,
      plan: plan ?? "starter",
    });

    // 2. Admin: setup fee paid notification
    const setupFeeResult = await sendAdminSetupFeePaidNotification({
      agencyId: user.id,
      name: fullUser?.name ?? null,
      email: fullUser?.email ?? null,
      agencyName: fullUser?.agencyName ?? null,
      plan: plan ?? "starter",
      amountCents: 19900,
      acquisitionSource: isRepAttributed ? "rep" : "direct",
    });
    await logNotification({
      recipientType: "admin",
      recipientEmail: "support@useauditready.com",
      eventType: "setup_fee_paid",
      deliveryStatus: setupFeeResult.success ? "sent" : "failed",
      agencyId: user.id,
      metadata: { plan: plan ?? "starter", amountCents: 19900 },
    });

    // 3. If rep-attributed: notify admin + rep of commission
    if (isRepAttributed && repCode) {
      const rep = await getSalesRepByCode(repCode);
      if (rep) {
        const commissionCents = 3980; // 20% of $199
        const adminCommResult = await sendAdminCommissionEarnedNotification({
          repName: rep.name,
          repEmail: rep.email,
          agencyName: fullUser?.agencyName ?? null,
          plan: plan ?? "starter",
          commissionCents,
          repCode,
        });
        await logNotification({
          recipientType: "admin",
          recipientEmail: "support@useauditready.com",
          eventType: "commission_earned",
          deliveryStatus: adminCommResult.success ? "sent" : "failed",
          agencyId: user.id,
          repId: rep.id,
          metadata: { commissionCents, repCode },
        });

        const repCommResult = await sendRepCommissionEarnedEmail({
          repName: rep.name,
          repEmail: rep.email,
          agencyName: fullUser?.agencyName ?? null,
          plan: plan ?? "starter",
          setupFeeCents: 19900,
          commissionCents,
          repCode,
        });
        await logNotification({
          recipientType: "rep",
          recipientEmail: rep.email,
          eventType: "commission_earned",
          deliveryStatus: repCommResult.success ? "sent" : "failed",
          agencyId: user.id,
          repId: rep.id,
          metadata: { commissionCents, repCode },
        });
      }
    }
  } catch (notifyErr) {
    console.error("[Stripe] Failed to send notifications:", notifyErr);
  }

  console.log(`[Stripe] Checkout completed for user ${user.id}, plan: ${plan ?? "unknown"} — account unlocked`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) return;

  const priceId = subscription.items.data[0]?.price?.id;
  const plan = priceId ? getPlanFromPriceId(priceId) : null;
  const status = subscription.status;

  // ── Bug fix: Billing leak — only keep stripeSubscriptionId for statuses that
  // represent active access. Statuses like 'incomplete', 'incomplete_expired',
  // 'paused', 'canceled', and 'expired' must clear the ID so auth.ts does not
  // grant paid access to lapsed customers.
  // Grace period (past_due) retains the ID so customers in their retry window
  // keep access; plan tier is also derived for past_due.
  const ACTIVE_STATUSES = ["active", "trialing", "past_due"] as const;
  const isActiveStatus = (ACTIVE_STATUSES as readonly string[]).includes(status);

  await updateUserStripeInfo(user.id, {
    stripeSubscriptionId: isActiveStatus ? subscription.id : null,
    // Derive plan for active + trialing + past_due (grace period), not for lapsed
    ...(plan && isActiveStatus ? { plan } : {}),
  });

  console.log(`[Stripe] Subscription updated for user ${user.id}: status=${status}, subscriptionId=${isActiveStatus ? subscription.id : "cleared"}`);

  // ── Win-back email: fires when user first schedules cancellation ──
  // cancelAtPeriodEnd transitions to true when they click "Cancel" in Stripe portal
  const previousCancelAtPeriodEnd = (subscription as any).previous_attributes?.cancel_at_period_end;
  const nowCancelAtPeriodEnd = subscription.cancel_at_period_end;
  if (previousCancelAtPeriodEnd === false && nowCancelAtPeriodEnd === true) {
    try {
      const fullUser = await getUserById(user.id);
      const agencyEmail = fullUser?.contactEmail ?? fullUser?.email;
      if (agencyEmail) {
        const periodEndTs = subscription.items?.data?.[0]?.current_period_end ?? subscription.cancel_at ?? null;
        const periodEnd = periodEndTs
          ? new Date(periodEndTs * 1000).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
            })
          : "the end of your billing period";

        const result = await sendCancellationWinbackEmail({
          agencyEmail,
          agencyName: fullUser?.agencyName ?? null,
          plan: plan ?? fullUser?.plan ?? "starter",
          periodEndDate: periodEnd,
        });

        await logNotification({
          recipientType: "agency",
          recipientEmail: agencyEmail,
          eventType: "cancellation_winback",
          deliveryStatus: result.success ? "sent" : "failed",
          agencyId: user.id,
          metadata: { periodEndDate: periodEnd, plan: plan ?? fullUser?.plan ?? "starter" },
        });

        console.log(`[Stripe] Win-back email sent to ${agencyEmail} (user ${user.id}) — period ends ${periodEnd}`);
      }
    } catch (winbackErr) {
      console.error("[Stripe] Failed to send win-back email:", winbackErr);
    }
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) return;

  // Clear the subscription ID and downgrade plan
  await updateUserStripeInfo(user.id, {
    stripeSubscriptionId: null,
    plan: "starter",
  });

  // Set account to read_only (data preserved, editing paused)
  // This is distinct from the pilot grace period — it's a cancelled subscription.
  // The 90-day retention cleanup job will eventually delete data if they don't resubscribe.
  await setUserCancelled(user.id);

  // Notify admin and agency
  try {
    const fullUser = await getUserById(user.id);
    const agencyEmail = fullUser?.contactEmail ?? fullUser?.email;

    // 1. Admin notification
    const adminResult = await sendAdminSubscriptionCancelledNotification({
      agencyId: user.id,
      name: fullUser?.name ?? null,
      email: fullUser?.email ?? null,
      agencyName: fullUser?.agencyName ?? null,
      plan: fullUser?.plan ?? "starter",
    });
    await logNotification({
      recipientType: "admin",
      recipientEmail: "support@useauditready.com",
      eventType: "subscription_cancelled",
      deliveryStatus: adminResult.success ? "sent" : "failed",
      agencyId: user.id,
    });

    // 2. Agency confirmation email (data preserved 90 days message)
    if (agencyEmail) {
      const agencyResult = await sendAgencySubscriptionEndedEmail({
        agencyEmail,
        agencyName: fullUser?.agencyName ?? null,
        plan: fullUser?.plan ?? "starter",
      });
      await logNotification({
        recipientType: "agency",
        recipientEmail: agencyEmail,
        eventType: "subscription_ended",
        deliveryStatus: agencyResult.success ? "sent" : "failed",
        agencyId: user.id,
      });
    }
  } catch (err) {
    console.error("[Stripe] Failed to send cancellation notifications:", err);
  }

  console.log(`[Stripe] Subscription deleted for user ${user.id} — account set to read_only, data preserved 90 days`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) return;

  try {
    const fullUser = await getUserById(user.id);
    const agencyEmail = fullUser?.contactEmail ?? fullUser?.email;

    // Notify admin
    const adminResult = await sendAdminSubscriptionFailedNotification({
      agencyId: user.id,
      name: fullUser?.name ?? null,
      email: fullUser?.email ?? null,
      agencyName: fullUser?.agencyName ?? null,
      plan: fullUser?.plan ?? "starter",
    });
    await logNotification({
      recipientType: "admin",
      recipientEmail: "support@useauditready.com",
      eventType: "payment_failed",
      deliveryStatus: adminResult.success ? "sent" : "failed",
      agencyId: user.id,
    });

    // Notify agency
    if (agencyEmail) {
      const agencyResult = await sendAgencyPaymentFailedEmail({
        agencyEmail,
        agencyName: fullUser?.agencyName ?? null,
        plan: fullUser?.plan ?? "starter",
      });
      await logNotification({
        recipientType: "agency",
        recipientEmail: agencyEmail,
        eventType: "payment_failed",
        deliveryStatus: agencyResult.success ? "sent" : "failed",
        agencyId: user.id,
      });
    }
  } catch (err) {
    console.error("[Stripe] Failed to send payment failed notifications:", err);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  // Only send renewal notification for recurring invoices (not the first payment)
  if ((invoice as any).billing_reason !== "subscription_cycle") return;

  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const user = await getUserByStripeCustomerId(customerId);
  if (!user) return;

  try {
    const fullUser = await getUserById(user.id);
    const agencyEmail = fullUser?.contactEmail ?? fullUser?.email;
    if (!agencyEmail) return;

    // Format next billing date
    const nextBillingTs = (invoice as any).lines?.data?.[0]?.period?.end;
    const nextBillingDate = nextBillingTs
      ? new Date(nextBillingTs * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : "your next billing date";

    const result = await sendAgencySubscriptionRenewalEmail({
      agencyEmail,
      agencyName: fullUser?.agencyName ?? null,
      plan: fullUser?.plan ?? "starter",
      nextBillingDate,
      amountCents: invoice.amount_paid ?? 0,
    });
    await logNotification({
      recipientType: "agency",
      recipientEmail: agencyEmail,
      eventType: "subscription_renewed",
      deliveryStatus: result.success ? "sent" : "failed",
      agencyId: user.id,
      metadata: { amountCents: invoice.amount_paid ?? 0 },
    });
  } catch (err) {
    console.error("[Stripe] Failed to send renewal notification:", err);
  }
}
