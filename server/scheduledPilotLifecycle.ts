/**
 * Scheduled handler: pilot lifecycle jobs.
 *
 * Runs daily and handles:
 *   - Day 11 warning email
 *   - Day 13 warning email
 *   - Day 14 → read_only transition + expiry email + admin notification
 *   - Day 17 → locked transition (grace period over)
 *
 * Mounted at: POST /api/scheduled/pilot-lifecycle
 * Auth: sdk.authenticateRequest — must be isCron
 *
 * Core logic is exported as `runPilotLifecycle()` so it can also be
 * invoked from the admin "Run Now" tRPC mutation without cron auth.
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  getPilotsNeedingDay11Warning,
  getPilotsNeedingDay13Warning,
  getExpiredActivePilots,
  getExpiredGracePeriodPilots,
  setUserReadOnly,
  setUserLocked,
  logPilotEmail,
  logNotification,
} from "./db";
import {
  sendPilotWarningEmail,
  sendPilotExpiredEmail,
  sendAdminPilotExpiredNotification,
  sendAgencyPilotEndingEmail,
} from "./email";

export type PilotLifecycleResult = {
  day11Sent: number;
  day13Sent: number;
  expiredToReadOnly: number;
  lockedAfterGrace: number;
  errors: string[];
};

/** Core pilot lifecycle logic — callable from cron handler or admin Run Now. */
export async function runPilotLifecycle(): Promise<PilotLifecycleResult> {
  const results: PilotLifecycleResult = {
    day11Sent: 0,
    day13Sent: 0,
    expiredToReadOnly: 0,
    lockedAfterGrace: 0,
    errors: [],
  };

  // ── Day 11 warnings ──────────────────────────────────────
  const day11Users = await getPilotsNeedingDay11Warning();
  for (const u of day11Users) {
    if (!u.email) continue;
    try {
      await sendPilotWarningEmail({
        toEmail: u.email,
        name: u.name ?? "there",
        agencyName: u.agencyName ?? "your agency",
        daysLeft: 3,
        warningType: "day11",
      });
      // Also send the agency-facing pilot ending email (subscribe CTA)
      await sendAgencyPilotEndingEmail({
        agencyEmail: u.email,
        agencyName: u.agencyName ?? null,
        daysRemaining: 3,
      }).catch(() => {/* non-blocking */});
      await logPilotEmail(u.id, "day11_warning", u.email);
      await logNotification({
        recipientType: "agency",
        recipientEmail: u.email,
        eventType: "pilot_ending_3d",
        deliveryStatus: "sent",
        agencyId: u.id,
      });
      results.day11Sent++;
    } catch (err) {
      results.errors.push(`day11 user ${u.id}: ${(err as Error).message}`);
    }
  }

  // ── Day 13 warnings ──────────────────────────────────────
  const day13Users = await getPilotsNeedingDay13Warning();
  for (const u of day13Users) {
    if (!u.email) continue;
    try {
      await sendPilotWarningEmail({
        toEmail: u.email,
        name: u.name ?? "there",
        agencyName: u.agencyName ?? "your agency",
        daysLeft: 1,
        warningType: "day13",
      });
      // Also send the agency-facing pilot ending email (subscribe CTA)
      await sendAgencyPilotEndingEmail({
        agencyEmail: u.email,
        agencyName: u.agencyName ?? null,
        daysRemaining: 1,
      }).catch(() => {/* non-blocking */});
      await logPilotEmail(u.id, "day13_warning", u.email);
      await logNotification({
        recipientType: "agency",
        recipientEmail: u.email,
        eventType: "pilot_ending_1d",
        deliveryStatus: "sent",
        agencyId: u.id,
      });
      results.day13Sent++;
    } catch (err) {
      results.errors.push(`day13 user ${u.id}: ${(err as Error).message}`);
    }
  }

  // ── Day 14 → read_only ───────────────────────────────────
  const expiredPilots = await getExpiredActivePilots();
  for (const u of expiredPilots) {
    if (!u.email) continue;
    try {
      await setUserReadOnly(u.id);
      await sendPilotExpiredEmail({
        toEmail: u.email,
        name: u.name ?? "there",
        agencyName: u.agencyName ?? "your agency",
      });
      await logPilotEmail(u.id, "day14_expired", u.email);
      await logNotification({
        recipientType: "agency",
        recipientEmail: u.email,
        eventType: "pilot_expired",
        deliveryStatus: "sent",
        agencyId: u.id,
      });
      // Notify admin of pilot expiry
      const adminResult = await sendAdminPilotExpiredNotification({
        agencyId: u.id,
        name: u.name ?? null,
        email: u.email,
        agencyName: u.agencyName ?? null,
      });
      await logNotification({
        recipientType: "admin",
        recipientEmail: "support@useauditready.com",
        eventType: "pilot_expired",
        deliveryStatus: adminResult.success ? "sent" : "failed",
        agencyId: u.id,
      });
      results.expiredToReadOnly++;
    } catch (err) {
      results.errors.push(`day14 user ${u.id}: ${(err as Error).message}`);
    }
  }

  // ── Day 17 → locked ──────────────────────────────────────
  const gracePeriodOver = await getExpiredGracePeriodPilots();
  for (const u of gracePeriodOver) {
    try {
      await setUserLocked(u.id);
      await logNotification({
        recipientType: "admin",
        recipientEmail: "support@useauditready.com",
        eventType: "pilot_locked",
        deliveryStatus: "skipped",
        agencyId: u.id,
      });
      results.lockedAfterGrace++;
    } catch (err) {
      results.errors.push(`day17 user ${u.id}: ${(err as Error).message}`);
    }
  }

  return results;
}

/** Express handler — validates cron auth then delegates to runPilotLifecycle(). */
export async function pilotLifecycleHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }
    const results = await runPilotLifecycle();
    console.log("[pilot-lifecycle]", results);
    return res.json({ ok: true, ...results });
  } catch (err) {
    console.error("[pilot-lifecycle] Fatal error:", err);
    return res.status(500).json({
      error: (err as Error).message,
      stack: (err as Error).stack,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
