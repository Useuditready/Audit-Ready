/**
 * Scheduled handler: /api/scheduled/deletion-deadline-alert
 *
 * Triggered daily by the Manus Heartbeat cron (runs at 08:00 UTC).
 * Finds any account deletion requests that are 28+ days old and
 * still unprocessed, then sends an owner notification so the GDPR/CCPA
 * 30-day deadline is never breached.
 *
 * Core logic is exported as `runDeletionDeadlineAlert()` so it can also
 * be invoked from the admin "Run Now" tRPC mutation without cron auth.
 *
 * Idempotent: safe to call multiple times per day.
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { lt } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

const DEADLINE_DAYS = 30;
const ALERT_DAYS = 28; // alert 2 days before the hard deadline

export type DeletionDeadlineAlertResult = {
  alertsSent: number;
  urgentCount: number;
  details: Array<{ userId: number; email: string | null; agencyName: string | null; daysSince: number }>;
};

/** Core logic — callable from cron handler or admin Run Now. */
export async function runDeletionDeadlineAlert(): Promise<DeletionDeadlineAlertResult> {
  const db = await getDb();
  if (!db) {
    console.error("[deletion-deadline-alert] DB not available");
    return { alertsSent: 0, urgentCount: 0, details: [] };
  }

  // Calculate the cutoff: requests older than ALERT_DAYS are approaching the deadline
  const cutoff = new Date(Date.now() - ALERT_DAYS * 24 * 60 * 60 * 1000);

  const pending = await db
    .select({
      id: users.id,
      email: users.email,
      agencyName: users.agencyName,
      deletionRequestedAt: users.deletionRequestedAt,
    })
    .from(users)
    .where(
      // deletionRequestedAt IS NOT NULL AND deletionRequestedAt < cutoff
      // (i.e. the request was made 28+ days ago)
      lt(users.deletionRequestedAt, cutoff)
    );

  // Filter to only those with a non-null deletionRequestedAt (lt() may include NULLs in some DB engines)
  const urgent = pending.filter((u): u is typeof u & { deletionRequestedAt: Date } => u.deletionRequestedAt != null);

  if (urgent.length === 0) {
    console.log("[deletion-deadline-alert] No urgent deletion requests found.");
    return { alertsSent: 0, urgentCount: 0, details: [] };
  }

  const details = urgent.map(u => {
    const daysSince = u.deletionRequestedAt
      ? Math.floor((Date.now() - new Date(u.deletionRequestedAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    return { userId: u.id, email: u.email ?? null, agencyName: u.agencyName ?? null, daysSince };
  });

  // Build a clear owner notification
  const lines = details.map(d =>
    `• ${d.email ?? "Unknown"} (${d.agencyName ?? "Unknown agency"}) — ${d.daysSince} days since request (deadline: ${DEADLINE_DAYS - d.daysSince} day${DEADLINE_DAYS - d.daysSince === 1 ? "" : "s"} remaining)`
  );

  const title = `⚠ GDPR/CCPA Deadline Alert — ${urgent.length} deletion request${urgent.length === 1 ? "" : "s"} approaching 30-day limit`;
  const content = [
    `${urgent.length} account deletion request${urgent.length === 1 ? " is" : "s are"} approaching the 30-day GDPR/CCPA processing deadline.`,
    "",
    "Accounts requiring immediate action:",
    ...lines,
    "",
    `Process these requests at: https://www.useauditready.com/admin/deletions`,
    "",
    `This alert fires daily when any request is ${ALERT_DAYS}+ days old. Once processed, the alert will stop.`,
  ].join("\n");

  const sent = await notifyOwner({ title, content });

  console.log(`[deletion-deadline-alert] Alert sent: ${sent}, urgent count: ${urgent.length}`);

  return {
    alertsSent: sent ? 1 : 0,
    urgentCount: urgent.length,
    details,
  };
}

/** Express handler — called by Manus Heartbeat cron. */
export async function deletionDeadlineAlertHandler(req: Request, res: Response): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      res.status(403).json({ error: "cron-only" });
      return;
    }

    const result = await runDeletionDeadlineAlert();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("[deletion-deadline-alert] Error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
