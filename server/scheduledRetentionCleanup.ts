/**
 * Scheduled handler: /api/scheduled/retention-cleanup
 *
 * Triggered daily by the Manus Heartbeat cron.
 * Finds inactive staff whose 2-year retention period has passed and
 * sends one digest email per agency admin — idempotent (only sends
 * when there are newly eligible records not yet notified).
 *
 * Core logic is exported as `runRetentionCleanup()` so it can also be
 * invoked from the admin "Run Now" tRPC mutation without cron auth.
 *
 * No patient data or PHI is included in any email sent.
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getStaffEligibleForDeletion } from "./db";
import { sendRetentionCleanupEmail, type EligibleStaffRecord } from "./email";

export type RetentionCleanupResult = {
  notified: number;
  failed: number;
  total: number;
};

/** Core retention cleanup logic — callable from cron handler or admin Run Now. */
export async function runRetentionCleanup(): Promise<RetentionCleanupResult> {
  const eligible = await getStaffEligibleForDeletion();

  if (eligible.length === 0) {
    console.log("[retention-cleanup] No eligible staff records found.");
    return { notified: 0, failed: 0, total: 0 };
  }

  // Group by userId so each admin gets one digest email
  const byUser = new Map<
    number,
    { userEmail: string; agencyName: string; staffList: EligibleStaffRecord[] }
  >();

  for (const row of eligible) {
    if (!row.userEmail) continue;
    if (!byUser.has(row.userId)) {
      byUser.set(row.userId, {
        userEmail: row.userEmail,
        agencyName: row.userName || "Your Agency",
        staffList: [],
      });
    }
    byUser.get(row.userId)!.staffList.push({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      inactivatedAt: row.inactivatedAt,
      retentionExpiresAt: row.retentionExpiresAt,
    });
  }

  let notified = 0;
  let failed = 0;

  for (const [userId, entry] of Array.from(byUser.entries())) {
    const result = await sendRetentionCleanupEmail({
      toEmail: entry.userEmail,
      agencyName: entry.agencyName,
      staffList: entry.staffList,
    });

    if (result.success) {
      notified++;
      console.log(
        `[retention-cleanup] Notified user ${userId} about ${entry.staffList.length} eligible records.`
      );
    } else {
      failed++;
      console.error(
        `[retention-cleanup] Failed to notify user ${userId}:`,
        result.error
      );
    }
  }

  return { notified, failed, total: eligible.length };
}

/** Express handler — validates cron auth then delegates to runRetentionCleanup(). */
export async function retentionCleanupHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }
    const result = await runRetentionCleanup();
    console.log(`[retention-cleanup] Run complete:`, result);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[retention-cleanup] Handler error:", err);
    return res.status(500).json({
      error: err?.message ?? "Unknown error",
      stack: err?.stack,
      timestamp: new Date().toISOString(),
    });
  }
}
