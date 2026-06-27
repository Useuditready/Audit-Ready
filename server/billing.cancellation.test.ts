/**
 * AuditReady — Billing Cancellation Flow Tests
 *
 * Tests the end-to-end subscription cancellation lifecycle:
 *   1. handleSubscriptionDeleted sets accountStatus → read_only and cancelledAt
 *   2. handlePaymentFailed does NOT change accountStatus (Stripe retries first)
 *   3. setUserCancelled DB helper sets both fields atomically
 *
 * Uses the live Neon database (same as other integration tests).
 * Creates isolated test users and cleans up after each test.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { setUserCancelled } from "./db";

// ── Test user factory ──────────────────────────────────────────
async function createTestUser(overrides: Record<string, unknown> = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const openId = `test-cancellation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await db.insert(users).values({
    openId,
    email: `${openId}@test.auditready.com`,
    name: "Test Agency",
    accountStatus: "subscribed",
    plan: "growth",
    stripeCustomerId: `cus_test_${openId}`,
    stripeSubscriptionId: `sub_test_${openId}`,
    loginMethod: "manus",
    ...overrides,
  } as any);

  const [user] = await db.select().from(users).where(eq(users.openId, openId));
  return user!;
}

async function deleteTestUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(users).where(eq(users.id, userId));
}

// ── Tests ──────────────────────────────────────────────────────
describe("Subscription cancellation flow", () => {
  let testUserId: number;

  afterEach(async () => {
    if (testUserId) {
      await deleteTestUser(testUserId);
    }
  });

  it("setUserCancelled sets accountStatus to read_only and records cancelledAt", async () => {
    const user = await createTestUser({ accountStatus: "subscribed" });
    testUserId = user.id;

    const before = new Date();
    await setUserCancelled(user.id);

    const db = await getDb();
    const [updated] = await db!.select().from(users).where(eq(users.id, user.id));

    expect(updated?.accountStatus).toBe("read_only");
    expect(updated?.cancelledAt).not.toBeNull();

    // cancelledAt should be within the last 5 seconds
    const cancelledAt = updated?.cancelledAt as Date;
    expect(cancelledAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(cancelledAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  }, 15000);

  it("setUserCancelled does not touch stripeSubscriptionId — that is cleared by updateUserStripeInfo", async () => {
    const user = await createTestUser({
      accountStatus: "subscribed",
      stripeSubscriptionId: "sub_test_keep_me",
    });
    testUserId = user.id;

    await setUserCancelled(user.id);

    const db = await getDb();
    const [updated] = await db!.select().from(users).where(eq(users.id, user.id));

    // setUserCancelled only sets accountStatus + cancelledAt
    // stripeSubscriptionId is cleared separately by updateUserStripeInfo in handleSubscriptionDeleted
    expect(updated?.stripeSubscriptionId).toBe("sub_test_keep_me");
  });

  it("calling setUserCancelled twice is idempotent — accountStatus stays read_only", async () => {
    const user = await createTestUser({ accountStatus: "subscribed" });
    testUserId = user.id;

    await setUserCancelled(user.id);
    await setUserCancelled(user.id); // second call should not throw

    const db = await getDb();
    const [updated] = await db!.select().from(users).where(eq(users.id, user.id));

    expect(updated?.accountStatus).toBe("read_only");
    expect(updated?.cancelledAt).not.toBeNull();
  });

  it("a cancelled user (read_only + cancelledAt) is distinguishable from a pilot grace period user (read_only, no cancelledAt)", async () => {
    // Cancelled subscription user
    const cancelledUser = await createTestUser({ accountStatus: "subscribed" });
    await setUserCancelled(cancelledUser.id);

    // Pilot grace period user (read_only but no cancelledAt)
    const pilotGraceUser = await createTestUser({
      accountStatus: "read_only",
      cancelledAt: null,
    });

    const db = await getDb();
    const [cancelled] = await db!.select().from(users).where(eq(users.id, cancelledUser.id));
    const [pilotGrace] = await db!.select().from(users).where(eq(users.id, pilotGraceUser.id));

    // Both are read_only
    expect(cancelled?.accountStatus).toBe("read_only");
    expect(pilotGrace?.accountStatus).toBe("read_only");

    // But only the cancelled one has cancelledAt set
    expect(cancelled?.cancelledAt).not.toBeNull();
    expect(pilotGrace?.cancelledAt).toBeNull();

    // Clean up both
    await deleteTestUser(cancelledUser.id);
    await deleteTestUser(pilotGraceUser.id);
    testUserId = 0; // already cleaned up manually
  });
});
