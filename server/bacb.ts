/**
 * BACB Certification & Supervision DB Helpers
 * ─────────────────────────────────────────────
 * Handles BACB certifications (BCBA/BCaBA/RBT), CEU records,
 * and RBT supervision ratio logs.
 *
 * No patient data, PHI, or clinical information is stored or returned.
 * All data is staff-side only: credentials, hours, ratios.
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  bacbCertifications,
  ceuRecords,
  supervisionLogs,
  staff,
  type InsertBacbCertification,
  type InsertCeuRecord,
} from "../drizzle/schema";

// ── BACB Certifications ───────────────────────────────────────────

export async function getBacbCertifications(userId: number, staffId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = staffId
    ? and(eq(bacbCertifications.userId, userId), eq(bacbCertifications.staffId, staffId))
    : eq(bacbCertifications.userId, userId);
  return db
    .select({
      cert: bacbCertifications,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      staffRole: staff.role,
    })
    .from(bacbCertifications)
    .leftJoin(staff, eq(bacbCertifications.staffId, staff.id))
    .where(conditions)
    .orderBy(desc(bacbCertifications.expirationDate));
}

export async function getBacbCertificationById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(bacbCertifications)
    .where(and(eq(bacbCertifications.id, id), eq(bacbCertifications.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createBacbCertification(data: InsertBacbCertification) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(bacbCertifications).values(data);
  return result[0];
}

export async function updateBacbCertification(
  id: number,
  userId: number,
  data: Partial<InsertBacbCertification>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(bacbCertifications)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(bacbCertifications.id, id), eq(bacbCertifications.userId, userId)));
}

export async function deleteBacbCertification(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  // Delete associated CEU records first
  await db.delete(ceuRecords).where(eq(ceuRecords.bacbCertId, id));
  await db
    .delete(bacbCertifications)
    .where(and(eq(bacbCertifications.id, id), eq(bacbCertifications.userId, userId)));
}

// ── CEU Records ───────────────────────────────────────────────────

export async function getCeuRecords(userId: number, bacbCertId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ceuRecords)
    .where(and(eq(ceuRecords.userId, userId), eq(ceuRecords.bacbCertId, bacbCertId)))
    .orderBy(desc(ceuRecords.completedDate));
}

export async function createCeuRecord(data: InsertCeuRecord) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(ceuRecords).values(data);
  // Recalculate totals on the parent certification
  await recalcCeuTotals(data.bacbCertId, data.userId);
  return result[0];
}

export async function deleteCeuRecord(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  // Get the record first to know which cert to recalculate
  const rows = await db
    .select()
    .from(ceuRecords)
    .where(and(eq(ceuRecords.id, id), eq(ceuRecords.userId, userId)))
    .limit(1);
  if (!rows[0]) return;
  await db
    .delete(ceuRecords)
    .where(and(eq(ceuRecords.id, id), eq(ceuRecords.userId, userId)));
  await recalcCeuTotals(rows[0].bacbCertId, userId);
}

async function recalcCeuTotals(bacbCertId: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const records = await db
    .select()
    .from(ceuRecords)
    .where(and(eq(ceuRecords.bacbCertId, bacbCertId), eq(ceuRecords.userId, userId)));

  // hours stored as tenths*10 (e.g. 15 = 1.5 hrs), display as X.X
  const totalHours = records.reduce((sum, r) => sum + r.hours, 0);
  const ethicsHours = records.filter((r) => r.isEthics).reduce((sum, r) => sum + r.hours, 0);

  await db
    .update(bacbCertifications)
    .set({
      ceuCompleted: totalHours,
      ceuEthicsCompleted: ethicsHours,
      updatedAt: new Date(),
    })
    .where(
      and(eq(bacbCertifications.id, bacbCertId), eq(bacbCertifications.userId, userId))
    );
}

// ── Supervision Logs ──────────────────────────────────────────────

export async function getSupervisionLogs(userId: number, staffId?: number, monthYear?: string) {
  const db = await getDb();
  if (!db) return [];

  let conditions: any = eq(supervisionLogs.userId, userId);
  if (staffId) conditions = and(conditions, eq(supervisionLogs.staffId, staffId));
  if (monthYear) conditions = and(conditions, eq(supervisionLogs.monthYear, monthYear));

  return db
    .select({
      log: supervisionLogs,
      rbtFirstName: staff.firstName,
      rbtLastName: staff.lastName,
      rbtRole: staff.role,
    })
    .from(supervisionLogs)
    .leftJoin(staff, eq(supervisionLogs.staffId, staff.id))
    .where(conditions)
    .orderBy(desc(supervisionLogs.monthYear));
}

export async function getSupervisionSummary(userId: number, monthYear: string) {
  const db = await getDb();
  if (!db) return { total: 0, compliant: 0, nonCompliant: 0, monthYear };
  const logs = await db
    .select()
    .from(supervisionLogs)
    .where(and(eq(supervisionLogs.userId, userId), eq(supervisionLogs.monthYear, monthYear)));

  const total = logs.length;
  const compliant = logs.filter((l) => l.isCompliant).length;
  const nonCompliant = total - compliant;
  return { total, compliant, nonCompliant, monthYear };
}

export async function upsertSupervisionLog(
  userId: number,
  data: {
    staffId: number;
    supervisorStaffId?: number;
    monthYear: string;
    totalHoursWorked: number;
    supervisionHoursLogged: number;
    notes?: string;
  }
) {
  const db = await getDb();
  if (!db) return null;

  // Calculate ratio and compliance (hours stored as tenths*10 so ratio is direct)
  const ratioPercent =
    data.totalHoursWorked > 0
      ? Math.round((data.supervisionHoursLogged / data.totalHoursWorked) * 100)
      : 0;
  const isCompliant = ratioPercent >= 5;

  // Check for existing record for this RBT + month
  const existing = await db
    .select()
    .from(supervisionLogs)
    .where(
      and(
        eq(supervisionLogs.userId, userId),
        eq(supervisionLogs.staffId, data.staffId),
        eq(supervisionLogs.monthYear, data.monthYear)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(supervisionLogs)
      .set({
        supervisorStaffId: data.supervisorStaffId ?? null,
        totalHoursWorked: data.totalHoursWorked,
        supervisionHoursLogged: data.supervisionHoursLogged,
        ratioPercent,
        isCompliant,
        notes: data.notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(supervisionLogs.id, existing[0].id));
    return { ...existing[0], ratioPercent, isCompliant };
  } else {
    await db.insert(supervisionLogs).values({
      userId,
      staffId: data.staffId,
      supervisorStaffId: data.supervisorStaffId ?? null,
      monthYear: data.monthYear,
      totalHoursWorked: data.totalHoursWorked,
      supervisionHoursLogged: data.supervisionHoursLogged,
      ratioPercent,
      isCompliant,
      notes: data.notes ?? null,
    });
    return { ratioPercent, isCompliant };
  }
}

export async function deleteSupervisionLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(supervisionLogs)
    .where(and(eq(supervisionLogs.id, id), eq(supervisionLogs.userId, userId)));
}

// ── OIG LEIE Batch Exclusion Checks ─────────────────────────────────────────

import { oigBatchChecks, type OigBatchCheck } from "../drizzle/schema";
import { checkOIGLEIE } from "./verificationService";
import { ne } from "drizzle-orm";

export async function getOigBatchChecks(userId: number, limit: number = 12): Promise<OigBatchCheck[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(oigBatchChecks)
    .where(eq(oigBatchChecks.userId, userId))
    .orderBy(desc(oigBatchChecks.runAt))
    .limit(limit);
}

export async function getOigBatchCheckById(id: number, userId: number): Promise<OigBatchCheck | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(oigBatchChecks)
    .where(and(eq(oigBatchChecks.id, id), eq(oigBatchChecks.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Run an OIG LEIE exclusion check for a single agency (user).
 * Checks all active staff and stores the results as a batch record.
 */
export async function runOigCheckForUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get active staff for this agency
  const activeStaff = await db
    .select()
    .from(staff)
    .where(
      and(
        eq(staff.userId, userId),
        ne(staff.status, "inactive"),
        ne(staff.status, "terminated")
      )
    );

  if (activeStaff.length === 0) {
    // Still record the check with 0 staff
    await db.insert(oigBatchChecks).values({
      userId,
      totalStaff: 0,
      cleared: 0,
      flagged: 0,
      errors: 0,
      results: [],
    });
    return { totalStaff: 0, cleared: 0, flagged: 0, errors: 0, results: [] };
  }

  const results: Array<{
    staffId: number;
    staffName: string;
    status: "cleared" | "flagged" | "error";
    matchCount?: number;
    details?: string;
  }> = [];
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

  // Save batch check record
  await db.insert(oigBatchChecks).values({
    userId,
    totalStaff: activeStaff.length,
    cleared,
    flagged,
    errors,
    results: results as any,
  });

  return { totalStaff: activeStaff.length, cleared, flagged, errors, results };
}
