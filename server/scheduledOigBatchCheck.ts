/**
 * Scheduled handler: /api/scheduled/oig-batch-check
 *
 * Triggered monthly by the Manus Heartbeat cron.
 * Iterates all active staff for all active agencies and runs OIG LEIE
 * exclusion checks against the federal exclusion database.
 *
 * Stores a dated audit log proving the check was run (required by federal law
 * for any Medicaid-billing agency).
 *
 * Sends owner notification if any staff member is flagged.
 *
 * No patient data or PHI is involved — staff names only.
 */
import type { Request, Response } from "express";
import { eq, and, ne } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { getDb } from "./db";
import { staff, users, oigBatchChecks } from "../drizzle/schema";
import { checkOIGLEIE } from "./verificationService";
import { notifyOwner } from "./_core/notification";

export type OigBatchResult = {
  staffId: number;
  staffName: string;
  status: "cleared" | "flagged" | "error";
  matchCount?: number;
  details?: string;
};

export type OigBatchCheckResult = {
  totalStaff: number;
  cleared: number;
  flagged: number;
  errors: number;
  flaggedNames: string[];
};

/**
 * Core OIG batch check logic — callable from cron handler or admin "Run Now".
 * Runs for ALL agencies (all users with active staff).
 */
export async function runOigBatchCheck(): Promise<OigBatchCheckResult> {
  const db = await getDb();
  if (!db) {
    console.error("[oig-batch-check] Database not available");
    return { totalStaff: 0, cleared: 0, flagged: 0, errors: 0, flaggedNames: [] };
  }

  // Get all users who have active staff (i.e., agencies that need checking)
  const allUsers = await db.select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(
      and(
        ne(users.accountStatus, "locked"),
        ne(users.accountStatus, "pending")
      )
    );

  let totalChecked = 0;
  let totalCleared = 0;
  let totalFlagged = 0;
  let totalErrors = 0;
  const allFlaggedNames: string[] = [];

  for (const user of allUsers) {
    // Get active staff for this user/agency
    const activeStaff = await db.select()
      .from(staff)
      .where(
        and(
          eq(staff.userId, user.id),
          ne(staff.status, "inactive"),
          ne(staff.status, "terminated")
        )
      );

    if (activeStaff.length === 0) continue;

    const results: OigBatchResult[] = [];
    let cleared = 0;
    let flagged = 0;
    let errors = 0;

    for (const member of activeStaff) {
      const firstName = member.firstName || "";
      const lastName = member.lastName || "";

      if (!firstName || !lastName) {
        results.push({
          staffId: member.id,
          staffName: `${firstName} ${lastName}`.trim() || "Unknown",
          status: "error",
          details: "Missing first or last name — cannot check OIG",
        });
        errors++;
        continue;
      }

      try {
        const oigResult = await checkOIGLEIE(firstName, lastName);

        if (oigResult.found && oigResult.matchCount > 0) {
          results.push({
            staffId: member.id,
            staffName: `${firstName} ${lastName}`,
            status: "flagged",
            matchCount: oigResult.matchCount,
            details: `${oigResult.matchCount} potential exclusion match(es) found`,
          });
          flagged++;
          allFlaggedNames.push(`${firstName} ${lastName}`);
        } else {
          results.push({
            staffId: member.id,
            staffName: `${firstName} ${lastName}`,
            status: "cleared",
            matchCount: 0,
          });
          cleared++;
        }
      } catch (err: any) {
        results.push({
          staffId: member.id,
          staffName: `${firstName} ${lastName}`,
          status: "error",
          details: err?.message ?? "Unknown error during OIG check",
        });
        errors++;
      }

      // Small delay between API calls to be respectful of the OIG server
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Save batch check record for this agency
    await db.insert(oigBatchChecks).values({
      userId: user.id,
      totalStaff: activeStaff.length,
      cleared,
      flagged,
      errors,
      results: results as any,
    });

    totalChecked += activeStaff.length;
    totalCleared += cleared;
    totalFlagged += flagged;
    totalErrors += errors;

    // If any staff were flagged, notify the owner
    if (flagged > 0) {
      try {
        await notifyOwner({
          title: `⚠️ OIG Exclusion Alert: ${flagged} staff member(s) flagged`,
          content: `Monthly OIG LEIE exclusion screening found ${flagged} potential match(es) for agency "${user.name || user.email}".\n\n` +
            `Flagged staff: ${results.filter(r => r.status === "flagged").map(r => r.staffName).join(", ")}\n\n` +
            `Please review immediately in AuditReady → OIG Exclusion Checks.\n\n` +
            `Total staff checked: ${activeStaff.length}\n` +
            `Cleared: ${cleared} | Flagged: ${flagged} | Errors: ${errors}`,
        });
      } catch (notifyErr) {
        console.error(`[oig-batch-check] Failed to notify owner for user ${user.id}:`, notifyErr);
      }
    }
  }

  console.log(`[oig-batch-check] Complete: ${totalChecked} staff, ${totalCleared} cleared, ${totalFlagged} flagged, ${totalErrors} errors`);

  return {
    totalStaff: totalChecked,
    cleared: totalCleared,
    flagged: totalFlagged,
    errors: totalErrors,
    flaggedNames: allFlaggedNames,
  };
}

/** Express handler — validates cron auth then delegates to runOigBatchCheck(). */
export async function oigBatchCheckHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only endpoint" });
    }
    const result = await runOigBatchCheck();
    console.log(`[oig-batch-check] Run complete:`, result);
    return res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error("[oig-batch-check] Handler error:", err);
    return res.status(500).json({
      error: err?.message ?? "Unknown error",
      stack: err?.stack,
      timestamp: new Date().toISOString(),
    });
  }
}
