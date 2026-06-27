/**
 * AuditReady — Billing Sidebar Badge Logic Tests
 *
 * Tests the logic that drives the "Ending" and "Failed" badges
 * shown next to the Billing nav item in the sidebar.
 *
 * The badge conditions are:
 *   - showPaymentBadge: stripeStatus === "past_due" || stripeStatus === "unpaid"
 *   - showCancelBadge: cancelAtPeriodEnd === true && !showPaymentBadge
 *
 * These are pure logic tests — no DB or network calls needed.
 */

import { describe, it, expect } from "vitest";

// Mirror the badge logic from DashboardLayout.tsx so we can unit-test it
function getBadgeState(billingStatus: {
  cancelAtPeriodEnd?: boolean;
  stripeStatus?: string | null;
} | null | undefined) {
  const isCancellationScheduled = billingStatus?.cancelAtPeriodEnd === true;
  const isPaymentFailed =
    billingStatus?.stripeStatus === "past_due" ||
    billingStatus?.stripeStatus === "unpaid";

  const showPaymentBadge = isPaymentFailed;
  const showCancelBadge = isCancellationScheduled && !isPaymentFailed;

  return { showPaymentBadge, showCancelBadge };
}

describe("Billing sidebar badge logic", () => {
  it("shows no badge for a healthy active subscription", () => {
    const { showPaymentBadge, showCancelBadge } = getBadgeState({
      cancelAtPeriodEnd: false,
      stripeStatus: "active",
    });
    expect(showPaymentBadge).toBe(false);
    expect(showCancelBadge).toBe(false);
  });

  it("shows 'Ending' badge when customer has scheduled cancellation (cancelAtPeriodEnd = true)", () => {
    const { showPaymentBadge, showCancelBadge } = getBadgeState({
      cancelAtPeriodEnd: true,
      stripeStatus: "active",
    });
    expect(showPaymentBadge).toBe(false);
    expect(showCancelBadge).toBe(true);
  });

  it("shows 'Failed' badge when stripeStatus is past_due", () => {
    const { showPaymentBadge, showCancelBadge } = getBadgeState({
      cancelAtPeriodEnd: false,
      stripeStatus: "past_due",
    });
    expect(showPaymentBadge).toBe(true);
    expect(showCancelBadge).toBe(false);
  });

  it("shows 'Failed' badge when stripeStatus is unpaid", () => {
    const { showPaymentBadge, showCancelBadge } = getBadgeState({
      cancelAtPeriodEnd: false,
      stripeStatus: "unpaid",
    });
    expect(showPaymentBadge).toBe(true);
    expect(showCancelBadge).toBe(false);
  });

  it("payment failed badge takes priority over cancellation scheduled badge", () => {
    // Edge case: subscription is both past_due AND scheduled to cancel
    const { showPaymentBadge, showCancelBadge } = getBadgeState({
      cancelAtPeriodEnd: true,
      stripeStatus: "past_due",
    });
    expect(showPaymentBadge).toBe(true);
    expect(showCancelBadge).toBe(false); // payment badge wins
  });

  it("shows no badge when billingStatus is null (not yet loaded)", () => {
    const { showPaymentBadge, showCancelBadge } = getBadgeState(null);
    expect(showPaymentBadge).toBe(false);
    expect(showCancelBadge).toBe(false);
  });

  it("shows no badge when billingStatus is undefined", () => {
    const { showPaymentBadge, showCancelBadge } = getBadgeState(undefined);
    expect(showPaymentBadge).toBe(false);
    expect(showCancelBadge).toBe(false);
  });

  it("shows no badge for a non-subscribed user (stripeStatus null)", () => {
    const { showPaymentBadge, showCancelBadge } = getBadgeState({
      cancelAtPeriodEnd: false,
      stripeStatus: null,
    });
    expect(showPaymentBadge).toBe(false);
    expect(showCancelBadge).toBe(false);
  });
});
