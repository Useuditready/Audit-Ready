/**
 * Scheduled handler: /api/scheduled/credential-reminders
 *
 * Triggered daily by the Manus Heartbeat cron.
 * Checks credentials expiring in 90, 60, and 30 days and sends
 * one reminder email per agency per threshold — idempotent (duplicate-safe).
 *
 * Core logic is exported as `runCredentialReminders()` so it can also be
 * invoked from the admin "Run Now" tRPC mutation without cron auth.
 *
 * No patient data or PHI is included in any email sent.
 */
import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  getCredentialsNeedingReminders,
  hasReminderBeenSent,
  recordReminderSent,
  logNotification,
} from "./db";
import { sendCredentialReminderEmail, type ReminderCredential } from "./email";

const THRESHOLDS = [90, 60, 30] as const;

export type CredentialRemindersResult = {
  [key: string]: { sent: number; failed: number; total: number };
};

/** Core credential reminders logic — callable from cron handler or admin Run Now. */
export async function runCredentialReminders(): Promise<CredentialRemindersResult> {
  const results: CredentialRemindersResult = {};

  for (const days of THRESHOLDS) {
    const rows = await getCredentialsNeedingReminders(days);

    // Group by userId (one email per agency per threshold)
    const byUser = new Map<
      number,
      {
        userEmail: string | null;
        agencyName: string | null;
        userName: string | null;
        credentials: ReminderCredential[];
        credentialIds: { id: number; expirationDate: string }[];
      }
    >();

    for (const row of rows) {
      if (!row.userEmail) continue;

      // Check duplicate — skip if already sent for this credential+days+expiry
      const alreadySent = await hasReminderBeenSent(
        row.credentialId,
        days,
        row.expirationDate ?? ""
      );
      if (alreadySent) continue;

      if (!byUser.has(row.userId)) {
        byUser.set(row.userId, {
          userEmail: row.userEmail,
          agencyName: row.agencyName,
          userName: row.userName,
          credentials: [],
          credentialIds: [],
        });
      }

      const entry = byUser.get(row.userId)!;
      const today = new Date();
      const expiry = new Date(row.expirationDate ?? "");
      const daysUntilExpiry = Math.ceil(
        (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      entry.credentials.push({
        staffFirstName: row.staffFirstName,
        staffLastName: row.staffLastName,
        credentialType: row.credentialType,
        expirationDate: row.expirationDate ?? "",
        daysUntilExpiry,
      });
      entry.credentialIds.push({
        id: row.credentialId,
        expirationDate: row.expirationDate ?? "",
      });
    }

    let sent = 0;
    let failed = 0;

    for (const [userId, entry] of Array.from(byUser.entries())) {
      if (!entry.userEmail || entry.credentials.length === 0) continue;

      const result = await sendCredentialReminderEmail({
        toEmail: entry.userEmail,
        agencyName: entry.agencyName || entry.userName || "Your Agency",
        credentials: entry.credentials,
        daysBeforeExpiry: days,
      });

      if (result.success) {
        for (const cred of entry.credentialIds) {
          await recordReminderSent({
            credentialId: cred.id,
            userId,
            daysBeforeExpiry: days,
            expirationDate: cred.expirationDate,
            recipientEmail: entry.userEmail,
          });
          await logNotification({
            recipientType: "agency",
            recipientEmail: entry.userEmail!,
            eventType: `credential_expiry_${days}d`,
            deliveryStatus: "sent",
            agencyId: userId,
            credentialId: cred.id,
            metadata: { daysBeforeExpiry: days, expirationDate: cred.expirationDate },
          });
        }
        sent++;
      } else {
        console.error(
          `[reminders] Failed to send ${days}d reminder to user ${userId}:`,
          result.error
        );
        failed++;
      }
    }

    results[`${days}d`] = { sent, failed, total: byUser.size };
  }

  return results;
}

/** Express handler — validates cron auth then delegates to runCredentialReminders(). */
export async function credentialRemindersHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }
    const results = await runCredentialReminders();
    console.log("[reminders] Run complete:", results);
    return res.json({ ok: true, results });
  } catch (err: any) {
    console.error("[reminders] Handler error:", err);
    return res.status(500).json({
      error: err?.message ?? "Unknown error",
      stack: err?.stack,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}
