import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, staff, credentials, auditLog, emailReminders, importLogs, verificationChecks, InsertStaff, InsertCredential, InsertAuditLog, InsertImportLog, ImportLog, InsertVerificationCheck, VerificationCheck, demoRequests, InsertDemoRequest, pilotSignups, pilotEmailLog, salesReps, commissions, SalesRep, Commission, notificationLogs, notificationPreferences, NotificationLog, NotificationPreference, aiUsage, AiUsage, contactSubmissions, ContactSubmission, noteLogs, NoteLog, InsertNoteLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function dismissOnboarding(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ onboardingDismissed: true } as any).where(eq(users.id, userId));
}

export async function completeTour(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ tourCompleted: true } as any).where(eq(users.id, userId));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserOpenId(userId: number, openId: string): Promise<void> {
    const db = await getDb();
    if (!db) {
          console.warn("[Database] Cannot update user openId: database not available");
          return;
    }
    await db.update(users).set({ openId } as any).where(eq(users.id, userId));
}

// ── Email Verification Helpers ───────────────────────────────

export async function saveEmailVerificationToken(
  userId: number,
  token: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ emailVerificationToken: token, emailVerificationSentAt: new Date() } as any)
    .where(eq(users.id, userId));
}

export async function getUserByVerificationToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.emailVerificationToken, token))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markEmailVerified(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), emailVerificationToken: null } as any)
    .where(eq(users.id, userId));
}

// ── Single-Admin Enforcement ──────────────────────────────────

/**
 * Check if an admin already exists with the same email domain.
 * Used to enforce 1 agency = 1 admin subscription rule.
 */
export async function getAdminByEmailDomain(emailDomain: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(sql`${users.role} = 'admin' AND ${users.email} LIKE ${`%@${emailDomain}`}`)
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Staff Queries ─────────────────────────────────────────────

export async function getStaffByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staff).where(eq(staff.userId, userId));
}

export async function getStaffById(staffId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.userId, userId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createStaff(data: InsertStaff) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(staff).values(data);
  return result[0].insertId;
}

export async function updateStaff(staffId: number, userId: number, data: Partial<InsertStaff>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(staff)
    .set(data)
    .where(and(eq(staff.id, staffId), eq(staff.userId, userId)));
}

export async function deleteStaff(staffId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete associated credentials first
  await db.delete(credentials).where(and(eq(credentials.staffId, staffId), eq(credentials.userId, userId)));
  await db.delete(staff).where(and(eq(staff.id, staffId), eq(staff.userId, userId)));
}

// ── Credential Queries ────────────────────────────────────────

export async function getCredentialsByStaffId(staffId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(credentials)
    .where(and(eq(credentials.staffId, staffId), eq(credentials.userId, userId)));
}

export async function getAllCredentialsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(credentials).where(eq(credentials.userId, userId));
}

export async function getPendingCredentials(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: credentials.id,
      staffId: credentials.staffId,
      userId: credentials.userId,
      type: credentials.type,
      category: credentials.category,
      issuingBody: credentials.issuingBody,
      licenseNumber: credentials.licenseNumber,
      issueDate: credentials.issueDate,
      expirationDate: credentials.expirationDate,
      status: credentials.status,
      documentLink: credentials.documentLink,
      notes: credentials.notes,
      verificationStatus: credentials.verificationStatus,
      verifiedBy: credentials.verifiedBy,
      verificationDate: credentials.verificationDate,
      verificationNotes: credentials.verificationNotes,
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      staffRole: staff.role,
    })
    .from(credentials)
    .innerJoin(staff, eq(credentials.staffId, staff.id))
    .where(and(
      eq(credentials.userId, userId),
      inArray(credentials.verificationStatus, ["not_checked", "needs_review", "not_found", "manual_review_required"])
    ))
    .orderBy(desc(credentials.createdAt));
  return rows;
}

export async function createCredential(data: InsertCredential) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(credentials).values(data);
  return result[0].insertId;
}

export async function updateCredential(credentialId: number, userId: number, data: Partial<InsertCredential>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(credentials)
    .set(data)
    .where(and(eq(credentials.id, credentialId), eq(credentials.userId, userId)));
}

export async function deleteCredential(credentialId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(credentials).where(and(eq(credentials.id, credentialId), eq(credentials.userId, userId)));
}

// ── Dashboard Stats ───────────────────────────────────────────

export async function getDashboardStats(userId: number) {
  const db = await getDb();
  if (!db) return { totalStaff: 0, totalCredentials: 0, current: 0, expiringSoon: 0, expired: 0 };

  const staffCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(staff)
    .where(eq(staff.userId, userId));

  const credStats = await db
    .select({
      total: sql<number>`count(*)`,
      current: sql<number>`SUM(CASE WHEN status = 'current' THEN 1 ELSE 0 END)`,
      expiringSoon: sql<number>`SUM(CASE WHEN status = 'expiring_soon' THEN 1 ELSE 0 END)`,
      expired: sql<number>`SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END)`,
    })
    .from(credentials)
    .where(eq(credentials.userId, userId));

  return {
    totalStaff: staffCount[0]?.count ?? 0,
    totalCredentials: credStats[0]?.total ?? 0,
    current: credStats[0]?.current ?? 0,
    expiringSoon: credStats[0]?.expiringSoon ?? 0,
    expired: credStats[0]?.expired ?? 0,
  };
}

export async function getExpiringCredentials(userId: number, days: number = 90) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: credentials.id,
      type: credentials.type,
      expirationDate: credentials.expirationDate,
      status: credentials.status,
      staffId: credentials.staffId,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      staffRole: staff.role,
    })
    .from(credentials)
    .innerJoin(staff, eq(credentials.staffId, staff.id))
    .where(
      and(
        eq(credentials.userId, userId),
        sql`${credentials.expirationDate} IS NOT NULL`,
        sql`${credentials.expirationDate} <= DATE_ADD(CURDATE(), INTERVAL ${days} DAY)`,
        sql`${credentials.expirationDate} >= CURDATE()`
      )
    );
}

// ── Audit Log ─────────────────────────────────────────────────

export async function createAuditLogEntry(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return; // Silently skip if DB not available — audit log is non-blocking
  try {
    await db.insert(auditLog).values(data);
  } catch (err) {
    console.warn("[AuditLog] Failed to write entry:", err);
  }
}

export async function getAuditLogByEntity(
  entityType: "staff" | "credential",
  entityId: number,
  userId: number,
  limit = 50
) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditLog)
    .where(
      and(
        eq(auditLog.entityType, entityType),
        eq(auditLog.entityId, entityId),
        eq(auditLog.userId, userId)
      )
    )
    .orderBy(desc(auditLog.changedAt))
    .limit(limit);
}

export async function getAuditLogByStaff(staffId: number, userId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];
  // Get all credentials for this staff member first
  const staffCreds = await db
    .select({ id: credentials.id })
    .from(credentials)
    .where(and(eq(credentials.staffId, staffId), eq(credentials.userId, userId)));
  const credIds = staffCreds.map(c => c.id);

  // Fetch audit log entries for the staff entity itself
  const staffLogs = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entityType, "staff"), eq(auditLog.entityId, staffId), eq(auditLog.userId, userId)))
    .orderBy(desc(auditLog.changedAt))
    .limit(limit);

  // Fetch audit log entries for all credentials belonging to this staff member
  const credLogs = credIds.length > 0
    ? await db
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.entityType, "credential"), eq(auditLog.userId, userId)))
        .orderBy(desc(auditLog.changedAt))
        .limit(limit)
    : [];

  // Filter credLogs to only those belonging to this staff's credentials
  const filteredCredLogs = credLogs.filter(l => credIds.includes(l.entityId));

  // Merge and sort by changedAt descending
  const all = [...staffLogs, ...filteredCredLogs].sort((a, b) => {
    const ta = a.changedAt ? new Date(a.changedAt).getTime() : 0;
    const tb = b.changedAt ? new Date(b.changedAt).getTime() : 0;
    return tb - ta;
  });
  return all.slice(0, limit);
}

export async function getAuditLogByUser(userId: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.userId, userId))
    .orderBy(desc(auditLog.changedAt))
    .limit(limit);
}

// ── Email Reminder Helpers ─────────────────────────────────────────────────────

/**
 * Returns credentials expiring in a specific non-overlapping window around
 * the given threshold (daysBeforeExpiry).
 *
 * Windows (±3 days around each threshold, non-overlapping):
 *   90d: expirationDate in [today+87, today+90]
 *   60d: expirationDate in [today+57, today+60]
 *   30d: expirationDate in [today+27, today+30]
 *
 * This ensures a credential is only ever picked up by one threshold bucket
 * per expiration cycle. No patient data or PHI is included.
 */
export async function getCredentialsNeedingReminders(daysBeforeExpiry: number) {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();

  // Define the window: lower bound is exclusive, upper bound is inclusive
  let windowStart: Date;
  let windowEnd: Date;

  // 90/60/30 buckets: ±3 days around the threshold
  windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() + daysBeforeExpiry - 3);
  windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + daysBeforeExpiry);

  const windowStartStr = windowStart.toISOString().slice(0, 10);
  const windowEndStr = windowEnd.toISOString().slice(0, 10);

  const rows = await db
    .select({
      credentialId: credentials.id,
      credentialType: credentials.type,
      expirationDate: credentials.expirationDate,
      staffId: staff.id,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      userId: users.id,
      userEmail: users.email,
      agencyName: users.agencyName,
      userName: users.name,
    })
    .from(credentials)
    .innerJoin(staff, eq(credentials.staffId, staff.id))
    .innerJoin(users, eq(credentials.userId, users.id))
    .where(
      and(
        sql`${credentials.expirationDate} >= ${windowStartStr}`,
        sql`${credentials.expirationDate} <= ${windowEndStr}`,
        eq(credentials.status, "current"),
      )
    );

  return rows;
}

/**
 * Checks whether a reminder has already been sent for a given
 * (credentialId, daysBeforeExpiry, expirationDate) combination.
 * This prevents duplicate sends within the same expiration cycle.
 */
export async function hasReminderBeenSent(
  credentialId: number,
  daysBeforeExpiry: number,
  expirationDate: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const rows = await db
    .select({ id: emailReminders.id })
    .from(emailReminders)
    .where(
      and(
        eq(emailReminders.credentialId, credentialId),
        eq(emailReminders.daysBeforeExpiry, daysBeforeExpiry),
        eq(emailReminders.expirationDate, expirationDate)
      )
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Records that a reminder email was sent.
 */
export async function recordReminderSent(params: {
  credentialId: number;
  userId: number;
  daysBeforeExpiry: number;
  expirationDate: string;
  recipientEmail: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(emailReminders).values({
    credentialId: params.credentialId,
    userId: params.userId,
    daysBeforeExpiry: params.daysBeforeExpiry,
    expirationDate: params.expirationDate,
    recipientEmail: params.recipientEmail,
  });
}

// ── Settings helpers ───────────────────────────────────────────────────────

export interface NotificationPreferences {
  remind90: boolean;
  remind60: boolean;
  remind30: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  remind90: true,
  remind60: true,
  remind30: true,
};

export function parseNotificationPreferences(raw: string | null | undefined): NotificationPreferences {
  if (!raw) return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  try {
    const parsed = JSON.parse(raw);
    return {
      remind90: parsed.remind90 !== false,
      remind60: parsed.remind60 !== false,
      remind30: parsed.remind30 !== false,
    };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    phone: users.phone,
    agencyName: users.agencyName,
    agencyAddress: users.agencyAddress,
    agencyCity: users.agencyCity,
    agencyState: users.agencyState,
    agencyZip: users.agencyZip,
    agencyTaxId: users.agencyTaxId,
    agencyType: users.agencyType,
    contactEmail: users.contactEmail,
    billingContactName: users.billingContactName,
    billingContactEmail: users.billingContactEmail,
    role: users.role,
    plan: users.plan,
    notificationPreferences: users.notificationPreferences,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, userId)).limit(1);
  if (!rows[0]) return null;
  return {
    ...rows[0],
    notificationPreferences: parseNotificationPreferences(rows[0].notificationPreferences),
  };
}

export async function updateUserProfile(userId: number, data: {
  name?: string;
  phone?: string | null;
  agencyName?: string | null;
  agencyAddress?: string | null;
  agencyCity?: string | null;
  agencyState?: string | null;
  agencyZip?: string | null;
  agencyTaxId?: string | null;
  agencyType?: string | null;
  contactEmail?: string | null;
  billingContactName?: string | null;
  billingContactEmail?: string | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {};
  if (data.name !== undefined) updateSet.name = data.name;
  if (data.phone !== undefined) updateSet.phone = data.phone ?? null;
  if (data.agencyName !== undefined) updateSet.agencyName = data.agencyName ?? null;
  if (data.agencyAddress !== undefined) updateSet.agencyAddress = data.agencyAddress ?? null;
  if (data.agencyCity !== undefined) updateSet.agencyCity = data.agencyCity ?? null;
  if (data.agencyState !== undefined) updateSet.agencyState = data.agencyState ?? null;
  if (data.agencyZip !== undefined) updateSet.agencyZip = data.agencyZip ?? null;
  if (data.agencyTaxId !== undefined) updateSet.agencyTaxId = data.agencyTaxId ?? null;
  if (data.agencyType !== undefined) updateSet.agencyType = data.agencyType ?? null;
  if (data.contactEmail !== undefined) updateSet.contactEmail = data.contactEmail ?? null;
  if (data.billingContactName !== undefined) updateSet.billingContactName = data.billingContactName ?? null;
  if (data.billingContactEmail !== undefined) updateSet.billingContactEmail = data.billingContactEmail ?? null;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(users).set(updateSet as any).where(eq(users.id, userId));
}

export async function updateNotificationPreferences(userId: number, prefs: NotificationPreferences): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ notificationPreferences: JSON.stringify(prefs) } as any).where(eq(users.id, userId));
}

// ── CSV Staff Import ───────────────────────────────────────────
export async function bulkCreateStaff(rows: InsertStaff[]): Promise<{ inserted: number; errors: { row: number; message: string }[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let inserted = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      await db.insert(staff).values(rows[i]);
      inserted++;
    } catch (err: unknown) {
      errors.push({ row: i + 1, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  return { inserted, errors };
}

// ── CSV Credential Import ─────────────────────────────────────
export async function bulkCreateCredentials(rows: InsertCredential[]): Promise<{ inserted: number; errors: { row: number; message: string }[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  let inserted = 0;
  const errors: { row: number; message: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      await db.insert(credentials).values(rows[i]);
      inserted++;
    } catch (err: unknown) {
      errors.push({ row: i + 1, message: err instanceof Error ? err.message : "Unknown error" });
    }
  }
  return { inserted, errors };
}

// ── Import Logs ───────────────────────────────────────────────
export async function createImportLog(data: InsertImportLog): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(importLogs).values(data);
  } catch (err) {
    console.warn("[ImportLog] Failed to write entry:", err);
  }
}

export async function getImportLogs(userId: number): Promise<ImportLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(importLogs).where(eq(importLogs.userId, userId)).orderBy(desc(importLogs.createdAt)).limit(100);
}

// ── Staff Retention Helpers ─────────────────────────────────

/** Mark a staff member as inactive and record the inactivation timestamp. */
export async function markStaffInactive(id: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .update(staff)
    .set({ status: "inactive", inactivatedAt: new Date(), updatedAt: new Date() } as any)
    .where(and(eq(staff.id, id), eq(staff.userId, userId)));
  return (result[0] as any).affectedRows > 0;
}

/**
 * Returns retention info for a staff member:
 * - inactivatedAt: when they were marked inactive (null if never)
 * - retentionExpiresAt: 2 years after inactivatedAt (null if not inactive)
 * - isDeletionEligible: true if retention window has passed or staff was never inactivated
 */
export async function getStaffRetentionInfo(
  id: number,
  userId: number
): Promise<{ inactivatedAt: Date | null; retentionExpiresAt: Date | null; isDeletionEligible: boolean } | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(staff).where(and(eq(staff.id, id), eq(staff.userId, userId))).limit(1);
  if (rows.length === 0) return null;
  const s = rows[0];
  if (!s.inactivatedAt) {
    return { inactivatedAt: null, retentionExpiresAt: null, isDeletionEligible: true };
  }
  const twoYearsMs = 2 * 365 * 24 * 60 * 60 * 1000;
  const retentionExpiresAt = new Date(s.inactivatedAt.getTime() + twoYearsMs);
  const isDeletionEligible = Date.now() >= retentionExpiresAt.getTime();
  return { inactivatedAt: s.inactivatedAt, retentionExpiresAt, isDeletionEligible };
}

// ── Duplicate Staff Detection ─────────────────────────────────
export async function findDuplicateStaff(
  userId: number,
  candidates: { firstName: string; lastName: string; email?: string | null }[]
): Promise<{ index: number; matchedId: number; matchType: "name" | "email" }[]> {
  const db = await getDb();
  if (!db) return [];
  const existing = await db.select().from(staff).where(eq(staff.userId, userId));
  const dupes: { index: number; matchedId: number; matchType: "name" | "email" }[] = [];
  const normalize = (s: string) => s.trim().toLowerCase();
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    // Email match is a stronger signal — check first
    if (c.email && c.email.trim()) {
      const emailMatch = existing.find(e => e.email && e.email.toLowerCase() === c.email!.toLowerCase());
      if (emailMatch) { dupes.push({ index: i, matchedId: emailMatch.id, matchType: "email" }); continue; }
    }
    // Full name match
    const nameMatch = existing.find(
      e => normalize(e.firstName) === normalize(c.firstName) && normalize(e.lastName) === normalize(c.lastName)
    );
    if (nameMatch) dupes.push({ index: i, matchedId: nameMatch.id, matchType: "name" });
  }
  return dupes;
}

// ── Retention Cleanup ─────────────────────────────────────────
/**
 * Returns all inactive staff whose 2-year retention period has passed.
 * Used by the nightly retention-cleanup cron to notify admins.
 */
export async function getStaffEligibleForDeletion(): Promise<
  {
    id: number;
    userId: number;
    firstName: string;
    lastName: string;
    inactivatedAt: Date;
    retentionExpiresAt: Date;
    userEmail: string | null;
    userName: string | null;
  }[]
> {
  const db = await getDb();
  if (!db) return [];
  const twoYearsAgo = new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({
      id: staff.id,
      userId: staff.userId,
      firstName: staff.firstName,
      lastName: staff.lastName,
      inactivatedAt: staff.inactivatedAt,
    })
    .from(staff)
    .where(
      and(
        eq(staff.status, "inactive"),
        sql`${staff.inactivatedAt} IS NOT NULL`,
        sql`${staff.inactivatedAt} <= ${twoYearsAgo}`
      )
    );

  const results = [];
  for (const row of rows) {
    if (!row.inactivatedAt) continue;
    const userRows = await db
      .select({ email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);
    const u = userRows[0] ?? null;
    const retentionExpiresAt = new Date(row.inactivatedAt.getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000);
    results.push({
      id: row.id,
      userId: row.userId,
      firstName: row.firstName,
      lastName: row.lastName,
      inactivatedAt: row.inactivatedAt,
      retentionExpiresAt,
      userEmail: u?.email ?? null,
      userName: u?.name ?? null,
    });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification Checks
// ─────────────────────────────────────────────────────────────────────────────

export async function createVerificationCheck(
  data: InsertVerificationCheck
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.insert(verificationChecks).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateVerificationCheckStatus(
  id: number,
  status: VerificationCheck["status"],
  reviewedBy?: string,
  reviewNote?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db
    .update(verificationChecks)
    .set({
      status,
      reviewedBy: reviewedBy ?? null,
      reviewedAt: reviewedBy ? new Date() : null,
      reviewNote: reviewNote ?? null,
    })
    .where(eq(verificationChecks.id, id));
}

export async function getVerificationChecksByStaff(
  staffId: number,
  userId: number
): Promise<VerificationCheck[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(verificationChecks)
    .where(
      and(
        eq(verificationChecks.staffId, staffId),
        eq(verificationChecks.userId, userId)
      )
    )
    .orderBy(desc(verificationChecks.checkedAt));
}

export async function getVerificationCheckById(
  id: number,
  userId: number
): Promise<VerificationCheck | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(verificationChecks)
    .where(
      and(
        eq(verificationChecks.id, id),
        eq(verificationChecks.userId, userId)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider & Payer Credentialing
// ─────────────────────────────────────────────────────────────────────────────

import { providers, payerCredentialingStatuses, InsertProvider, InsertPayerCredentialingStatus, Provider, PayerCredentialingStatus } from "../drizzle/schema";

export async function getProvidersByUserId(userId: number): Promise<Provider[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(providers).where(eq(providers.userId, userId)).orderBy(providers.lastName, providers.firstName);
}

export async function getProviderById(providerId: number, userId: number): Promise<Provider | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(providers)
    .where(and(eq(providers.id, providerId), eq(providers.userId, userId)))
    .limit(1);
  return rows[0];
}

export async function createProvider(data: InsertProvider): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(providers).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateProvider(providerId: number, userId: number, data: Partial<InsertProvider>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(providers).set(data).where(and(eq(providers.id, providerId), eq(providers.userId, userId)));
}

export async function deleteProvider(providerId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(payerCredentialingStatuses).where(and(eq(payerCredentialingStatuses.providerId, providerId), eq(payerCredentialingStatuses.userId, userId)));
  await db.delete(providers).where(and(eq(providers.id, providerId), eq(providers.userId, userId)));
}

export async function getPayerStatusesForProvider(providerId: number, userId: number): Promise<PayerCredentialingStatus[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(payerCredentialingStatuses)
    .where(and(eq(payerCredentialingStatuses.providerId, providerId), eq(payerCredentialingStatuses.userId, userId)))
    .orderBy(payerCredentialingStatuses.payerName);
}

export async function upsertPayerStatus(data: InsertPayerCredentialingStatus): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(payerCredentialingStatuses).values(data).onDuplicateKeyUpdate({
    set: {
      status: data.status,
      payerDisplayName: data.payerDisplayName ?? null,
      submittedAt: data.submittedAt ?? null,
      approvedAt: data.approvedAt ?? null,
      expiresAt: data.expiresAt ?? null,
      notes: data.notes ?? null,
    },
  });
}

export async function deletePayerStatus(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(payerCredentialingStatuses).where(and(eq(payerCredentialingStatuses.id, id), eq(payerCredentialingStatuses.userId, userId)));
}

export async function getCredentialingDashboardStats(userId: number): Promise<{
  totalProviders: number;
  approved: number;
  needsUpdate: number;
  expired: number;
  inReview: number;
}> {
  const db = await getDb();
  if (!db) return { totalProviders: 0, approved: 0, needsUpdate: 0, expired: 0, inReview: 0 };

  const providerCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(providers)
    .where(eq(providers.userId, userId));

  const statusStats = await db
    .select({
      approved: sql<number>`SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)`,
      needsUpdate: sql<number>`SUM(CASE WHEN status = 'needs_update' THEN 1 ELSE 0 END)`,
      expired: sql<number>`SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END)`,
      inReview: sql<number>`SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END)`,
    })
    .from(payerCredentialingStatuses)
    .where(eq(payerCredentialingStatuses.userId, userId));

  return {
    totalProviders: providerCount[0]?.count ?? 0,
    approved: statusStats[0]?.approved ?? 0,
    needsUpdate: statusStats[0]?.needsUpdate ?? 0,
    expired: statusStats[0]?.expired ?? 0,
    inReview: statusStats[0]?.inReview ?? 0,
  };
}

// ── Stripe Billing Helpers ─────────────────────────────────────

export async function getStripeUserById(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    openId: users.openId,
    plan: users.plan,
    stripeCustomerId: users.stripeCustomerId,
    stripeSubscriptionId: users.stripeSubscriptionId,
  }).from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getUserByStripeCustomerId(customerId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select({
    id: users.id,
    email: users.email,
    plan: users.plan,
    stripeCustomerId: users.stripeCustomerId,
    stripeSubscriptionId: users.stripeSubscriptionId,
  }).from(users).where(eq(users.stripeCustomerId, customerId)).limit(1);
  return rows[0] ?? null;
}

export async function updateUserStripeInfo(userId: number, data: {
  stripeCustomerId?: string;
  /** Pass null to explicitly clear the subscription ID (e.g. on lapse/pause/incomplete) */
  stripeSubscriptionId?: string | null;
  plan?: "starter" | "growth" | "enterprise";
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const updateSet: Record<string, unknown> = {};
  if (data.stripeCustomerId !== undefined) updateSet.stripeCustomerId = data.stripeCustomerId;
  // Allow null to explicitly clear the subscription ID
  if (data.stripeSubscriptionId !== undefined) updateSet.stripeSubscriptionId = data.stripeSubscriptionId ?? null;
  if (data.plan !== undefined) updateSet.plan = data.plan;
  if (Object.keys(updateSet).length === 0) return;
  await db.update(users).set(updateSet as any).where(eq(users.id, userId));
}

export async function createPilotSignup(data: { name: string; email: string; agencyName: string; agencySize?: string; plan?: string }): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(pilotSignups).values(data);
}

export async function listPilotSignups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pilotSignups).orderBy(pilotSignups.createdAt);
}

export async function createDemoRequest(data: Omit<InsertDemoRequest, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(demoRequests).values(data);
}

export async function listDemoRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(demoRequests).orderBy(demoRequests.createdAt);
}

// ── Pilot Lifecycle Helpers ───────────────────────────────────

/**
 * Activate a pilot: set accountStatus to active_pilot, record timestamps.
 */
export async function activatePilot(pilotSignupId: number, userEmail: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const graceEndsAt = new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Update the pilot_signups row
  await db
    .update(pilotSignups)
    .set({ status: "approved", reviewedAt: now, reviewedBy: "admin" } as any)
    .where(eq(pilotSignups.id, pilotSignupId));

  // Update or create the user row
  const existingUser = await getUserByEmail(userEmail);
  if (existingUser) {
    await db
      .update(users)
      .set({
        accountStatus: "active_pilot",
        pilotActivatedAt: now,
        pilotExpiresAt: expiresAt,
        gracePeriodEndsAt: graceEndsAt,
        pilotSignupId,
      } as any)
      .where(eq(users.id, existingUser.id));
  }
}

/**
 * Get all pilot signups with pending status for admin review.
 */
export async function listPendingPilots() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(pilotSignups)
    .where(eq(pilotSignups.status, "pending"))
    .orderBy(pilotSignups.createdAt);
}

/**
 * Get all pilot signups (all statuses) for admin panel.
 */
export async function listAllPilots() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pilotSignups).orderBy(pilotSignups.createdAt);
}

/**
 * Reject a pilot signup.
 */
export async function rejectPilot(pilotSignupId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(pilotSignups)
    .set({ status: "rejected", reviewedAt: new Date(), reviewedBy: "admin" } as any)
    .where(eq(pilotSignups.id, pilotSignupId));
}

/**
 * Get all active pilots whose Day 11 warning hasn't been sent yet.
 */
export async function getPilotsNeedingDay11Warning() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const day11Threshold = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // expires within 3 days = day 11+

  const activeUsers = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.accountStatus, "active_pilot"),
        sql`${users.pilotExpiresAt} <= ${day11Threshold}`,
        sql`${users.pilotExpiresAt} > ${now}`
      )
    );

  // Filter out those who already got the day11 email
  const results = [];
  for (const u of activeUsers) {
    if (!u.email) continue;
    const existing = await db
      .select()
      .from(pilotEmailLog)
      .where(and(eq(pilotEmailLog.userId, u.id), eq(pilotEmailLog.emailType, "day11_warning")))
      .limit(1);
    if (existing.length === 0) results.push(u);
  }
  return results;
}

/**
 * Get all active pilots whose Day 13 warning hasn't been sent yet.
 */
export async function getPilotsNeedingDay13Warning() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const day13Threshold = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // expires within 1 day = day 13+

  const activeUsers = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.accountStatus, "active_pilot"),
        sql`${users.pilotExpiresAt} <= ${day13Threshold}`,
        sql`${users.pilotExpiresAt} > ${now}`
      )
    );

  const results = [];
  for (const u of activeUsers) {
    if (!u.email) continue;
    const existing = await db
      .select()
      .from(pilotEmailLog)
      .where(and(eq(pilotEmailLog.userId, u.id), eq(pilotEmailLog.emailType, "day13_warning")))
      .limit(1);
    if (existing.length === 0) results.push(u);
  }
  return results;
}

/**
 * Get all active pilots that have expired (pilotExpiresAt <= now) and not yet moved to read_only.
 */
export async function getExpiredActivePilots() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(users)
    .where(
      and(
        eq(users.accountStatus, "active_pilot"),
        sql`${users.pilotExpiresAt} <= ${now}`
      )
    );
}

/**
 * Get all read_only pilots whose grace period has ended.
 */
export async function getExpiredGracePeriodPilots() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db
    .select()
    .from(users)
    .where(
      and(
        eq(users.accountStatus, "read_only"),
        sql`${users.gracePeriodEndsAt} <= ${now}`
      )
    );
}

/**
 * Transition user to read_only (Day 14 — grace period starts).
 */
export async function setUserReadOnly(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ accountStatus: "read_only" } as any)
    .where(eq(users.id, userId));
}

/**
 * Transition user to locked (Day 17 — grace period over).
 */
export async function setUserLocked(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ accountStatus: "locked" } as any)
    .where(eq(users.id, userId));
}

/**
 * Mark user as subscribed.
 */
export async function setUserSubscribed(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ accountStatus: "subscribed", subscribedAt: new Date() } as any)
    .where(eq(users.id, userId));
}

/**
 * Mark user as cancelled (subscription ended via Stripe).
 * Sets accountStatus to read_only so they can view but not edit.
 * Data is preserved for 90 days per retention policy.
 */
export async function setUserCancelled(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ accountStatus: "read_only", cancelledAt: new Date() } as any)
    .where(eq(users.id, userId));
}

/**
 * Log a pilot lifecycle email to prevent duplicate sends.
 */
export async function logPilotEmail(userId: number, emailType: "activation" | "day11_warning" | "day13_warning" | "day14_expired", recipientEmail: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(pilotEmailLog).values({ userId, emailType, recipientEmail });
}

/**
 * Get user by ID (full row including pilot lifecycle fields).
 */
export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Sales Rep Helpers ─────────────────────────────────────────

/**
 * Find an active sales rep by their unique code (case-insensitive).
 * Returns the rep row if found and active, or undefined.
 */
export async function getSalesRepByCode(code: string): Promise<SalesRep | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(salesReps)
    .where(and(eq(salesReps.code, code.toUpperCase()), eq(salesReps.isActive, true)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get all sales reps (for admin listing).
 */
export async function getAllSalesReps(): Promise<SalesRep[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(salesReps).orderBy(desc(salesReps.createdAt));
}

/**
 * Create a new sales rep.
 */
export async function createSalesRep(data: { name: string; email: string; code: string; notes?: string }): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(salesReps).values({
    name: data.name,
    email: data.email,
    code: data.code.toUpperCase(),
    notes: data.notes ?? null,
    isActive: true,
  });
  return result[0].insertId;
}

/**
 * Set acquisition info on a user after checkout.
 * Called from the webhook when a rep code was used.
 */
export async function setUserAcquisitionSource(
  userId: number,
  source: "direct" | "rep",
  repId?: number,
  repCode?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({
    acquisitionSource: source,
    repId: repId ?? null,
    repCodeUsed: repCode ?? null,
  } as any).where(eq(users.id, userId));
}

// ── Commission Helpers ─────────────────────────────────────────

/**
 * Create a commission record after a rep-attributed setup fee payment.
 */
export async function createCommission(data: {
  repId: number;
  userId: number;
  repCode: string;
  stripeSessionId?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(commissions).values({
    repId: data.repId,
    userId: data.userId,
    repCode: data.repCode,
    setupFeeAmountCents: 19900,
    commissionAmountCents: 3980,
    status: "owed",
    stripeSessionId: data.stripeSessionId ?? null,
  });
  return result[0].insertId;
}

/**
 * Mark a commission as paid.
 */
export async function markCommissionPaid(commissionId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(commissions).set({ status: "paid", paidAt: new Date() }).where(eq(commissions.id, commissionId));
}

/**
 * Get all commissions with rep name and agency info (for admin reporting).
 */
export async function getAllCommissions(): Promise<Array<Commission & { repName: string; repEmail: string; agencyName: string | null; userEmail: string | null }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: commissions.id,
      repId: commissions.repId,
      userId: commissions.userId,
      repCode: commissions.repCode,
      setupFeeAmountCents: commissions.setupFeeAmountCents,
      commissionAmountCents: commissions.commissionAmountCents,
      status: commissions.status,
      paidAt: commissions.paidAt,
      stripeSessionId: commissions.stripeSessionId,
      createdAt: commissions.createdAt,
      updatedAt: commissions.updatedAt,
      repName: salesReps.name,
      repEmail: salesReps.email,
      agencyName: users.agencyName,
      userEmail: users.email,
    })
    .from(commissions)
    .innerJoin(salesReps, eq(commissions.repId, salesReps.id))
    .innerJoin(users, eq(commissions.userId, users.id))
    .orderBy(desc(commissions.createdAt));
  return rows;
}

/**
 * Get acquisition source summary for admin reporting.
 * Returns counts and setup fee revenue broken down by source.
 */
export async function getAcquisitionReport(): Promise<{
  directCount: number;
  repCount: number;
  directSetupFeeRevenueCents: number;
  repSetupFeeRevenueCents: number;
  commissionsOwedCents: number;
  commissionsPaidCents: number;
}> {
  const db = await getDb();
  if (!db) return { directCount: 0, repCount: 0, directSetupFeeRevenueCents: 0, repSetupFeeRevenueCents: 0, commissionsOwedCents: 0, commissionsPaidCents: 0 };

  // Count subscribed users by acquisition source
  const sourceCounts = await db
    .select({
      source: users.acquisitionSource,
      count: sql<number>`count(*)`,
    })
    .from(users)
    .where(eq(users.accountStatus, "subscribed"))
    .groupBy(users.acquisitionSource);

  const directCount = sourceCounts.find(r => r.source === "direct")?.count ?? 0;
  const repCount = sourceCounts.find(r => r.source === "rep")?.count ?? 0;

  // Setup fee revenue: $199 per subscribed user
  const directSetupFeeRevenueCents = directCount * 19900;
  const repSetupFeeRevenueCents = repCount * 19900;

  // Commission totals
  const commissionTotals = await db
    .select({
      status: commissions.status,
      total: sql<number>`SUM(commissionAmountCents)`,
    })
    .from(commissions)
    .groupBy(commissions.status);

  const commissionsOwedCents = commissionTotals.find(r => r.status === "owed")?.total ?? 0;
  const commissionsPaidCents = commissionTotals.find(r => r.status === "paid")?.total ?? 0;

  return {
    directCount: Number(directCount),
    repCount: Number(repCount),
    directSetupFeeRevenueCents: Number(directSetupFeeRevenueCents),
    repSetupFeeRevenueCents: Number(repSetupFeeRevenueCents),
    commissionsOwedCents: Number(commissionsOwedCents),
    commissionsPaidCents: Number(commissionsPaidCents),
  };
}

// ── Notification Helpers ──────────────────────────────────────

/**
 * Log a notification event to the audit trail.
 * Non-blocking — silently fails if DB is unavailable.
 */
export async function logNotification(data: {
  recipientType: "admin" | "rep" | "agency";
  recipientEmail: string;
  eventType: string;
  deliveryStatus?: "sent" | "failed" | "skipped";
  agencyId?: number;
  credentialId?: number;
  repId?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(notificationLogs).values({
      recipientType: data.recipientType,
      recipientEmail: data.recipientEmail,
      eventType: data.eventType,
      deliveryStatus: data.deliveryStatus ?? "sent",
      agencyId: data.agencyId ?? null,
      credentialId: data.credentialId ?? null,
      repId: data.repId ?? null,
      metadata: data.metadata ?? null,
    } as any);
  } catch (err) {
    console.warn("[NotificationLog] Failed to write entry:", err);
  }
}

/**
 * Get notification logs for admin view, ordered by most recent.
 */
export async function getNotificationLogs(limit = 200): Promise<NotificationLog[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(notificationLogs)
    .orderBy(desc(notificationLogs.sentAt))
    .limit(limit);
}

/**
 * Get or create notification preferences for a user.
 * Returns defaults if no row exists.
 */
export async function getNotificationPreferences(userId: number): Promise<NotificationPreference | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  if (rows.length > 0) return rows[0];
  // Return defaults without inserting
  return {
    id: 0,
    userId,
    emailEnabled: true,
    credentialReminderDays: 30,
    billingNotifications: true,
    repCommissionAlerts: true,
    updatedAt: new Date(),
  };
}

/**
 * Upsert notification preferences for a user.
 */
export async function upsertNotificationPreferences(
  userId: number,
  prefs: {
    emailEnabled?: boolean;
    credentialReminderDays?: number;
    billingNotifications?: boolean;
    repCommissionAlerts?: boolean;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(notificationPreferences)
    .values({ userId, ...prefs } as any)
    .onDuplicateKeyUpdate({ set: prefs as any });
}

// ── AI Usage Quota Helpers ────────────────────────────────────

/** Quota limits per plan (questions per period). */
export const AI_QUOTA: Record<string, number> = {
  pilot: 10,        // lifetime cap during free trial
  active_pilot: 10, // same — accountStatus variant
  starter: 25,
  growth: 75,
  enterprise: 150,
};

/** Returns the month key: "pilot" for trial users, "YYYY-MM" for subscribed. */
export function getAiMonthKey(accountStatus: string): string {
  if (accountStatus === "active_pilot" || accountStatus === "pending") return "pilot";
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Returns the ISO date string for the first of next month (reset date). */
export function getAiResetDate(): string {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString().slice(0, 10);
}

/**
 * Get or create the ai_usage row for this user in the current period.
 * Returns { questionCount, limit, resetDate, monthKey }.
 */
export async function getAiUsage(userId: number, plan: string, accountStatus: string): Promise<{
  questionCount: number;
  limit: number;
  resetDate: string | null;
  monthKey: string;
  rowId: number | null;
}> {
  const db = await getDb();
  const monthKey = getAiMonthKey(accountStatus);
  const limit = AI_QUOTA[plan] ?? AI_QUOTA[accountStatus] ?? 25;
  const resetDate = monthKey === "pilot" ? null : getAiResetDate();

  if (!db) return { questionCount: 0, limit, resetDate, monthKey, rowId: null };

  const rows = await db
    .select()
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), eq(aiUsage.monthKey, monthKey)))
    .limit(1);

  if (rows.length > 0) {
    return { questionCount: rows[0].questionCount, limit, resetDate, monthKey, rowId: rows[0].id };
  }

  // Create new row
  const result = await db.insert(aiUsage).values({
    userId,
    plan,
    monthKey,
    questionCount: 0,
    resetDate: resetDate ?? undefined,
  });
  return { questionCount: 0, limit, resetDate, monthKey, rowId: result[0].insertId };
}

/**
 * Increment the AI question count for this user in the current period.
 */
export async function incrementAiUsage(userId: number, plan: string, accountStatus: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const monthKey = getAiMonthKey(accountStatus);
  const resetDate = monthKey === "pilot" ? null : getAiResetDate();

  // Upsert: increment if exists, insert with count=1 if not
  await db.execute(sql`
    INSERT INTO ai_usage (user_id, plan, month_key, question_count, reset_date, created_at, updated_at)
    VALUES (${userId}, ${plan}, ${monthKey}, 1, ${resetDate}, NOW(), NOW())
    ON DUPLICATE KEY UPDATE question_count = question_count + 1, updated_at = NOW()
  `);
}

// ── Contact Form Submissions ────────────────────────────────────
export async function createContactSubmission(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(contactSubmissions).values(data);
}

export async function listContactSubmissions(limit = 100): Promise<ContactSubmission[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contactSubmissions).orderBy(desc(contactSubmissions.createdAt)).limit(limit);
}

export async function updateContactSubmissionStatus(id: number, status: "new" | "read" | "replied" | "archived"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(contactSubmissions).set({ status }).where(eq(contactSubmissions.id, id));
}

export async function countNewContactSubmissions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(contactSubmissions).where(eq(contactSubmissions.status, "new"));
  return Number(row?.count ?? 0);
}

/**
 * Auto-grant a 14-day free pilot to a new user on first login.
 * Called from the OAuth callback when isNewUser === true.
 * Sets accountStatus = 'active_pilot', pilotActivatedAt = now, pilotExpiresAt = now + 14 days.
 */
export async function autoGrantPilot(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const graceEndsAt = new Date(expiresAt.getTime() + 3 * 24 * 60 * 60 * 1000);
  await db
    .update(users)
    .set({
      accountStatus: "active_pilot",
      pilotActivatedAt: now,
      pilotExpiresAt: expiresAt,
      gracePeriodEndsAt: graceEndsAt,
    } as any)
    .where(eq(users.id, userId));
}

// ── Note Compliance Log Helpers ───────────────────────────────────────────────

/**
 * Get all note logs for an agency, joined with staff names.
 */
export async function getNoteLogsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: noteLogs.id,
      userId: noteLogs.userId,
      staffId: noteLogs.staffId,
      weekOf: noteLogs.weekOf,
      sessionsHeld: noteLogs.sessionsHeld,
      notesCompleted: noteLogs.notesCompleted,
      notesPending: noteLogs.notesPending,
      notesLate: noteLogs.notesLate,
      supervisorReviewed: noteLogs.supervisorReviewed,
      reviewedAt: noteLogs.reviewedAt,
      reviewerName: noteLogs.reviewerName,
      notes: noteLogs.notes,
      createdAt: noteLogs.createdAt,
      updatedAt: noteLogs.updatedAt,
      staffFirstName: staff.firstName,
      staffLastName: staff.lastName,
      staffRole: staff.role,
    })
    .from(noteLogs)
    .innerJoin(staff, eq(noteLogs.staffId, staff.id))
    .where(eq(noteLogs.userId, userId))
    .orderBy(desc(noteLogs.weekOf), staff.lastName);
}

/**
 * Get note logs for a specific staff member.
 */
export async function getNoteLogsByStaffId(staffId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(noteLogs)
    .where(and(eq(noteLogs.staffId, staffId), eq(noteLogs.userId, userId)))
    .orderBy(desc(noteLogs.weekOf));
}

/**
 * Upsert a note log entry for a staff member for a given week.
 * weekOf should be the ISO date string of the Monday of the week (YYYY-MM-DD).
 */
export async function upsertNoteLog(data: InsertNoteLog): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if entry already exists for this staff + week
  const existing = await db
    .select({ id: noteLogs.id })
    .from(noteLogs)
    .where(and(
      eq(noteLogs.staffId, data.staffId),
      eq(noteLogs.userId, data.userId),
      eq(noteLogs.weekOf, data.weekOf),
    ))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(noteLogs)
      .set({
        sessionsHeld: data.sessionsHeld,
        notesCompleted: data.notesCompleted,
        notesPending: data.notesPending,
        notesLate: data.notesLate,
        supervisorReviewed: data.supervisorReviewed,
        reviewedAt: data.reviewedAt,
        reviewerName: data.reviewerName,
        notes: data.notes,
      } as any)
      .where(eq(noteLogs.id, existing[0].id));
    return existing[0].id;
  }
  const result = await db.insert(noteLogs).values(data);
  return result[0].insertId;
}

/**
 * Delete a note log entry.
 */
export async function deleteNoteLog(noteLogId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(noteLogs).where(and(eq(noteLogs.id, noteLogId), eq(noteLogs.userId, userId)));
}

export type { NoteLog, InsertNoteLog };

/**
 * Returns the most recent verificationCheck.checkedAt timestamp for each
 * staff member belonging to the given user.  Used to show a "Last Verified"
 * column on the Verification Checks landing page.
 *
 * Returns a map of staffId → Date (or null if never checked).
 */
export async function getLatestVerificationCheckPerStaff(
  userId: number
): Promise<Record<number, Date | null>> {
  const db = await getDb();
  if (!db) return {};

  // Fetch all checks for this user, ordered newest-first
  const rows = await db
    .select({
      staffId: verificationChecks.staffId,
      checkedAt: verificationChecks.checkedAt,
    })
    .from(verificationChecks)
    .where(eq(verificationChecks.userId, userId))
    .orderBy(desc(verificationChecks.checkedAt));

  // Keep only the first (most recent) entry per staffId
  const result: Record<number, Date | null> = {};
  for (const row of rows) {
    if (!(row.staffId in result)) {
      result[row.staffId] = row.checkedAt;
    }
  }
  return result;
}

// ── Server-side Sessions ──────────────────────────────────────
// Backs the auth JWT with a real DB row so a session can actually be
// revoked on logout and expired after 30 minutes of inactivity — neither
// is possible with a bare stateless JWT. See server/_core/sdk.ts.
import { sessions, InsertSession, Session } from "../drizzle/schema";

export async function createSession(data: InsertSession): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(sessions).values(data);
}

export async function getSessionById(id: string): Promise<Session | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function touchSessionActivity(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(sessions).set({ lastActivityAt: new Date() } as any).where(eq(sessions.id, id));
}

export async function revokeSession(id: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(sessions).set({ revokedAt: new Date() } as any).where(eq(sessions.id, id));
}
