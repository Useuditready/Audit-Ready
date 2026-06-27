/**
 * AuditReady — Billing tRPC Router
 * Handles Stripe checkout session creation, portal access, and subscription status.
 */

import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { createCheckoutSession, getOrCreateStripeCustomer, getStripe, PRICE_IDS } from "../billing";
import { getUserById } from "../db";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";
import { isAllowedOrigin } from "../_core/env";

function validateOrigin(origin: string): void {
  if (!isAllowedOrigin(origin)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid redirect origin.",
    });
  }
}

const PLAN_NAMES = ["starter", "growth", "enterprise"] as const;
const BILLING_INTERVALS = ["monthly", "annual"] as const;

export const billingRouter = router({
  /**
   * Create a Stripe Checkout Session for the given plan and billing interval.
   * Includes the one-time $199 setup fee as a second line item.
   * Returns the Stripe-hosted checkout URL to redirect the user to.
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        plan: z.enum(PLAN_NAMES),
        interval: z.enum(BILLING_INTERVALS),
        origin: z.string().url(),
        repCode: z.string().max(32).optional(), // optional rep attribution code
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { plan, interval, origin, repCode } = input;
      validateOrigin(origin);

      const priceId = PRICE_IDS[plan]?.[interval];
      if (!priceId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No price found for plan "${plan}" with interval "${interval}"`,
        });
      }

      // Include the one-time $199 setup fee for all plans
      const setupFeePriceId = PRICE_IDS[plan]?.setupFee;

      try {
        const url = await createCheckoutSession({
          userId: ctx.user.id,
          priceId,
          setupFeePriceId,
          successUrl: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/billing/cancel`,
          repCode: repCode ?? undefined,
        });
        return { url };
      } catch (err) {
        console.error("[Billing] createCheckoutSession error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session. Please try again.",
        });
      }
    }),

  /**
   * Create a Stripe Customer Portal session.
   * Allows subscribed users to manage their subscription, update payment methods,
   * view invoices, and cancel their plan.
   */
  createPortalSession: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();

      validateOrigin(input.origin);
      // Ensure the user has a Stripe customer ID (creates one if missing)
      const customerId = await getOrCreateStripeCustomer(ctx.user.id);

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${input.origin}/billing`,
        });
        return { url: session.url };
      } catch (err) {
        console.error("[Billing] createPortalSession error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to open billing portal. Please try again.",
        });
      }
    }),

  /**
   * Create a Stripe Customer Portal session pre-configured to the payment method update flow.
   * Skips the portal home and lands directly on the "Update payment method" screen.
   */
  createPaymentMethodUpdateSession: protectedProcedure
    .input(z.object({ origin: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const stripe = getStripe();
      validateOrigin(input.origin);
      const customerId = await getOrCreateStripeCustomer(ctx.user.id);

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${input.origin}/billing`,
          flow_data: {
            type: "payment_method_update",
          },
        });
        return { url: session.url };
      } catch (err) {
        console.error("[Billing] createPaymentMethodUpdateSession error:", err);
        // Fall back to generic portal if flow_data isn't supported in this Stripe config
        try {
          const fallback = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${input.origin}/billing`,
          });
          return { url: fallback.url };
        } catch (fallbackErr) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to open payment update portal. Please try again.",
          });
        }
      }
    }),

  /**
   * Cancel subscription at period end (not immediately).
   * Sets cancel_at_period_end = true on the Stripe subscription.
   * The user retains access until the current billing period ends.
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id) as any;
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    if (!user.stripeSubscriptionId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found." });
    }
    try {
      const stripe = getStripe();
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      // Notify owner immediately (in-app Manus notification)
      const agencyName = (user as any).agencyName ?? (user as any).name ?? user.email ?? "Unknown agency";
      await notifyOwner({
        title: `Cancellation scheduled — ${agencyName}`,
        content: `Agency "${agencyName}" (${user.email}) has scheduled their subscription to cancel at the end of their current billing period. Their account will remain active until then. Consider reaching out to retain them.`,
      }).catch((e) => console.warn("[Billing] notifyOwner failed:", e));
      return { success: true };
    } catch (err) {
      console.error("[Billing] cancelSubscription error:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to schedule cancellation. Please try again or contact support.",
      });
    }
  }),

  /**
   * Undo a scheduled cancellation (cancel_at_period_end = false).
   */
  reactivateSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id) as any;
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    if (!user.stripeSubscriptionId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No active subscription found." });
    }
    try {
      const stripe = getStripe();
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });
      return { success: true };
    } catch (err) {
      console.error("[Billing] reactivateSubscription error:", err);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to reactivate subscription. Please try again or contact support.",
      });
    }
  }),

  /**
   * Get the current subscription status for the logged-in user.
   * Returns plan, billing interval, next billing date, and subscription status.
   */
  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id) as any;
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

    // If not subscribed, return basic info
    if (!user.stripeSubscriptionId || user.accountStatus !== "subscribed") {
      return {
        accountStatus: (user.accountStatus ?? "pending") as string,
        plan: (user.plan ?? "starter") as string,
        stripeSubscriptionId: null as string | null,
        currentPeriodEnd: null as Date | null,
        cancelAtPeriodEnd: false,
        interval: null as string | null,
      };
    }

    // Fetch live subscription data from Stripe
    try {
      const stripe = getStripe();
      const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId) as any;
      const interval = subscription.items?.data?.[0]?.price?.recurring?.interval ?? null;
      const periodEnd = subscription.current_period_end ?? null;
      return {
        accountStatus: (user.accountStatus ?? "subscribed") as string,
        plan: (user.plan ?? "starter") as string,
        stripeSubscriptionId: user.stripeSubscriptionId as string,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        interval: interval as string | null,
        stripeStatus: (subscription.status ?? null) as string | null, // e.g. "active", "past_due", "unpaid"
      };
    } catch (err) {
      console.error("[Billing] getSubscriptionStatus Stripe error:", err);
      // Fall back to DB data if Stripe call fails
      return {
        accountStatus: (user.accountStatus ?? "subscribed") as string,
        plan: (user.plan ?? "starter") as string,
        stripeSubscriptionId: user.stripeSubscriptionId as string | null,
        currentPeriodEnd: null as Date | null,
        cancelAtPeriodEnd: false,
        interval: null as string | null,
        stripeStatus: null as string | null,
      };
    }
  }),
});
