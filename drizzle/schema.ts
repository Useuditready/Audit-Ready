import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  agencyName: varchar("agencyName", { length: 255 }),
  agencyAddress: varchar("agencyAddress", { length: 500 }),
  agencyCity: varchar("agencyCity", { length: 100 }),
  agencyState: varchar("agencyState", { length: 50 }),
  agencyZip: varchar("agencyZip", { length: 20 }),
  agencyTaxId: varchar("agencyTaxId", { length: 20 }), // EIN format: XX-XXXXXXX
  agencyType: varchar("agencyType", { length: 100 }), // e.g. ABA, Behavioral Health, Home Care
  contactEmail: varchar("contactEmail", { length: 320 }), // Agency primary contact email
  billingContactName: varchar("billingContactName", { length: 255 }), // Billing contact full name
  billingContactEmail: varchar("billingContactEmail", { length: 320 }), // Billing contact email
  plan: mysqlEnum("plan", ["starter", "growth", "enterprise"]).default("starter"),
  phone: varchar("phone", { length: 20 }),
  notificationPreferences: text("notificationPreferences"), // JSON: { remind90: boolean, remind60: boolean, remind30: boolean, remind7: boolean }
  onboardingDismissed: boolean("onboardingDismissed").default(false),
  tourCompleted: boolean("tourCompleted").default(false),
  emailVerifiedAt: timestamp("emailVerifiedAt"),
  emailVerificationToken: varchar("emailVerificationToken", { length: 128 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 64 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 64 }),
  emailVerificationSentAt: timestamp("emailVerificationSentAt"),
  // Pilot lifecycle
  accountStatus: mysqlEnum("accountStatus", [
    "pending",      // submitted pilot form, awaiting admin review
    "active_pilot", // admin approved, 14-day pilot running
    "read_only",    // Day 14 reached — grace period (3 days), can view but not edit
    "locked",       // Day 17+ — data saved but fully locked until subscription
    "subscribed",   // paid subscriber, full access
  ]).default("pending").notNull(),
  pilotActivatedAt: timestamp("pilotActivatedAt"),   // set when admin activates
  pilotExpiresAt: timestamp("pilotExpiresAt"),        // pilotActivatedAt + 14 days
  gracePeriodEndsAt: timestamp("gracePeriodEndsAt"), // pilotExpiresAt + 3 days
  pilotSignupId: int("pilotSignupId"),                // FK to pilot_signups row
  subscribedAt: timestamp("subscribedAt"),
  cancelledAt: timestamp("cancelledAt"),   // set when subscription is cancelled via Stripe webhook
  deletionRequestedAt: timestamp("deletionRequestedAt"), // set when user submits account deletion request (GDPR/CCPA)
  deletionReason: varchar("deletionReason", { length: 500 }), // optional reason provided by user
  deletionAdminNotes: text("deletionAdminNotes"), // internal admin notes on the deletion request (e.g. "Emailed user to confirm")
  // Acquisition tracking
  acquisitionSource: mysqlEnum("acquisitionSource", ["direct", "rep"]).default("direct"),
  repCodeUsed: varchar("repCodeUsed", { length: 32 }),   // the rep code entered at checkout
  repId: int("repId"),                                    // FK to salesReps.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Staff members belonging to an agency (user).
 */
export const staff = mysqlTable("staff", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  role: varchar("role", { length: 100 }),
  hireDate: date("hireDate", { mode: "string" }),
  status: mysqlEnum("status", ["active", "inactive", "terminated"]).default("active").notNull(),
  inactivatedAt: timestamp("inactivatedAt"), // Set when status changes to inactive; drives 2-year retention rule
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Credentials tracked for each staff member.
 * AuditReady stores credential metadata, document location info, optional uploaded file, and verification records.
 * Never stores patient/client records, clinical notes, therapy notes, treatment plans, billing records,
 * Medicaid records, diagnosis information, or any PHI.
 */
export const credentials = mysqlTable("credentials", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 150 }).notNull(),
  category: mysqlEnum("category", [
    "license",
    "certification",
    "training",
    "background_check",
    "sex_offender_registry",
    "insurance",
    "other",
  ]).default("license").notNull(),
  issuingBody: varchar("issuingBody", { length: 200 }),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  issueDate: date("issueDate", { mode: "string" }),
  expirationDate: date("expirationDate", { mode: "string" }),
  status: mysqlEnum("status", ["current", "expiring_soon", "expired", "not_applicable"]).default("current").notNull(),
  // Document location — where the physical or digital document is stored externally
  documentLocationType: mysqlEnum("documentLocationType", [
    "none",
    "paper",
    "google_drive",
    "dropbox",
    "sharepoint",
    "hr_system",
    "ehr_system",
    "other",
  ]).default("none"),
  documentLocationNote: text("documentLocationNote"), // URL or free-text location note
  // Optional uploaded file (staff credential documents only — license, CPR card, cert, training cert, background check)
  // NEVER upload patient/client records, clinical notes, therapy notes, treatment plans, billing, Medicaid, PHI
  documentLink: text("documentLink"), // S3 storage key/URL for uploaded file (legacy + new uploads)
  notes: text("notes"),
  // Verification workflow — admin must explicitly approve before status becomes "verified"
  verificationStatus: mysqlEnum("verificationStatus", [
    "not_checked",
    "verified",
    "needs_review",
    "not_found",
    "manual_review_required",
  ]).default("not_checked").notNull(),
  verifiedBy: varchar("verifiedBy", { length: 255 }),
  verificationDate: timestamp("verificationDate"),
  verificationNotes: text("verificationNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Audit log — tracks every change to staff and credential records.
 * Stores who changed what, when, and the before/after state.
 * No patient data, PHI, or clinical information is stored here.
 */
export const auditLog = mysqlTable("auditLog", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  entityType: mysqlEnum("entityType", ["staff", "credential"]).notNull(),
  entityId: int("entityId").notNull(),
  action: mysqlEnum("action", ["create", "update", "delete", "verify"]).notNull(),
  changedBy: varchar("changedBy", { length: 255 }).notNull(),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
  fieldChanged: varchar("fieldChanged", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  summary: text("summary"),
});

/**
 * Email reminders sent for credential expiration.
 * Prevents duplicate sends — one row per (credentialId, daysBeforeExpiry) per expiration cycle.
 * No patient data or PHI stored here.
 */
export const emailReminders = mysqlTable("emailReminders", {
  id: int("id").autoincrement().primaryKey(),
  credentialId: int("credentialId").notNull(),
  userId: int("userId").notNull(),
  daysBeforeExpiry: int("daysBeforeExpiry").notNull(), // 90, 60, 30, or 7
  expirationDate: date("expirationDate", { mode: "string" }).notNull(), // the credential's expiry at send time
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
});

/**
 * Import logs — records every CSV import run (staff or credential).
 * Provides an audit trail of bulk data operations.
 */
export const importLogs = mysqlTable("importLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  importType: mysqlEnum("importType", ["staff", "credential"]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  totalRows: int("totalRows").notNull().default(0),
  inserted: int("inserted").notNull().default(0),
  failed: int("failed").notNull().default(0),
  errorSummary: text("errorSummary"), // JSON array of { row, message } for failed rows
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Verification checks — records every national source lookup run against a staff member.
 * Sources: BACB, OIG LEIE, NPI Registry.
 * Status lifecycle: not_checked → (after run) needs_review | not_found | manual_review_required
 *                  → (after admin review) verified | needs_review
 * Only an admin can set status to "verified" by explicitly approving the result.
 * No PHI, patient data, or clinical information is stored here.
 */
export const verificationChecks = mysqlTable("verificationChecks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  staffId: int("staffId").notNull(),
  credentialId: int("credentialId"), // optional — may be a general staff-level check (e.g. OIG LEIE)
  source: mysqlEnum("source", ["bacb", "oig_leie", "npi", "sam_gov"]).notNull(),
  // Query fields sent to the source
  queryFirstName: varchar("queryFirstName", { length: 100 }).notNull(),
  queryLastName: varchar("queryLastName", { length: 100 }).notNull(),
  queryLicenseNumber: varchar("queryLicenseNumber", { length: 100 }),
  // Raw response from the source (JSON string)
  rawResult: text("rawResult"),
  matchCount: int("matchCount").default(0),
  // Status — only "verified" requires admin approval
  status: mysqlEnum("status", [
    "not_checked",
    "verified",
    "needs_review",
    "not_found",
    "manual_review_required",
  ]).default("not_checked").notNull(),
  // Admin review fields (only populated after human review)
  reviewedBy: varchar("reviewedBy", { length: 255 }),
  reviewedAt: timestamp("reviewedAt"),
  reviewNote: text("reviewNote"),
  // When the source was queried
  checkedAt: timestamp("checkedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Providers — clinicians/practitioners tracked for payer credentialing.
 * Separate from staff (who are tracked for HR/compliance credentials).
 * Stores provider identity, license, and clinical credential fields.
 * No patient data, PHI, or clinical notes stored here.
 */
export const providers = mysqlTable("providers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  role: varchar("role", { length: 150 }), // e.g. BCBA, LCSW, Psychologist
  npi: varchar("npi", { length: 20 }),
  caqhId: varchar("caqhId", { length: 50 }),
  licenseType: varchar("licenseType", { length: 150 }),
  licenseNumber: varchar("licenseNumber", { length: 100 }),
  licenseExpirationDate: date("licenseExpirationDate", { mode: "string" }),
  malpracticeInsuranceExpiration: date("malpracticeInsuranceExpiration", { mode: "string" }),
  cprFirstAidExpiration: date("cprFirstAidExpiration", { mode: "string" }),
  backgroundCheckDate: date("backgroundCheckDate", { mode: "string" }),
  requiredTrainings: text("requiredTrainings"), // JSON array of { name, completedDate, expirationDate }
  oigCheckDate: date("oigCheckDate", { mode: "string" }),
  recredentialingDueDate: date("recredentialingDueDate", { mode: "string" }),
  // Document location — where credentialing documents are stored externally
  documentLocationType: mysqlEnum("documentLocationType", [
    "none",
    "paper",
    "google_drive",
    "dropbox",
    "sharepoint",
    "hr_system",
    "ehr_system",
    "other",
  ]).default("none"),
  documentLocationNote: text("documentLocationNote"),
  // Verification
  verifiedBy: varchar("verifiedBy", { length: 255 }),
  verificationDate: timestamp("verificationDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Payer credentialing statuses — one row per (provider, payer).
 * Tracks the credentialing application status with each payer.
 * Status lifecycle: not_started → submitted → in_review → approved | needs_update | expired
 */
export const payerCredentialingStatuses = mysqlTable("payerCredentialingStatuses", {
  id: int("id").autoincrement().primaryKey(),
  providerId: int("providerId").notNull(),
  userId: int("userId").notNull(),
  payerName: mysqlEnum("payerName", [
    "bcbs",
    "aetna",
    "cigna",
    "uhc_optum",
    "medicaid",
    "tricare",
    "other",
  ]).notNull(),
  payerDisplayName: varchar("payerDisplayName", { length: 200 }), // custom name for "other" payers
  status: mysqlEnum("status", [
    "not_started",
    "submitted",
    "in_review",
    "approved",
    "needs_update",
    "expired",
  ]).default("not_started").notNull(),
  submittedAt: date("submittedAt", { mode: "string" }),
  approvedAt: date("approvedAt", { mode: "string" }),
  expiresAt: date("expiresAt", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Pilot signup leads captured from the landing page "Start Free Pilot" CTA.
 */
export const pilotSignups = mysqlTable("pilot_signups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  agencyName: varchar("agencyName", { length: 255 }).notNull(),
  agencySize: varchar("agencySize", { length: 64 }),
  plan: varchar("plan", { length: 64 }), // which plan they clicked from (starter/growth/enterprise)
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewedBy: varchar("reviewedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Tracks pilot lifecycle emails sent to prevent duplicate sends.
 */
export const pilotEmailLog = mysqlTable("pilot_email_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  emailType: mysqlEnum("emailType", [
    "activation",
    "day11_warning",
    "day13_warning",
    "day14_expired",
  ]).notNull(),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
});

/**
 * Demo request leads captured from the landing page.
 */
export const demoRequests = mysqlTable("demo_requests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  agencyName: varchar("agencyName", { length: 255 }).notNull(),
  agencySize: varchar("agencySize", { length: 64 }),
  message: text("message"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Sales representatives — internal team members who refer agencies.
 * Each rep has a unique code that agencies can enter at checkout.
 */
export const salesReps = mysqlTable("salesReps", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(), // e.g. "REP-JOHN"
  isActive: boolean("isActive").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

/**
 * Commission records — one row per setup fee payment attributed to a rep.
 * Created only after checkout.session.completed webhook fires for a rep-attributed signup.
 * commissionAmount = 20% of $199 setup fee = $39.80 (stored in cents: 3980)
 */
export const commissions = mysqlTable("commissions", {
  id: int("id").autoincrement().primaryKey(),
  repId: int("repId").notNull(),                          // FK to salesReps.id
  userId: int("userId").notNull(),                        // FK to users.id (the agency that signed up)
  repCode: varchar("repCode", { length: 32 }).notNull(),  // snapshot of code used
  setupFeeAmountCents: int("setupFeeAmountCents").notNull().default(19900), // $199.00
  commissionAmountCents: int("commissionAmountCents").notNull().default(3980), // $39.80 (20%)
  status: mysqlEnum("status", ["owed", "paid"]).default("owed").notNull(),
  paidAt: timestamp("paidAt"),
  stripeSessionId: varchar("stripeSessionId", { length: 128 }), // Stripe checkout session ID for reference
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * Notification logs — audit trail for every notification sent.
 * Tracks recipient, event type, delivery status, and related entities.
 */
export const notificationLogs = mysqlTable("notification_logs", {
  id: int("id").autoincrement().primaryKey(),
  recipientType: mysqlEnum("recipientType", ["admin", "rep", "agency"]).notNull(),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  // e.g. 'agency_signup', 'setup_fee_paid', 'commission_earned', 'subscription_failed',
  //      'subscription_cancelled', 'pilot_expired', 'credential_expiry', 'payment_failed',
  //      'subscription_renewed', 'export_ready', 'upload_failed'
  deliveryStatus: mysqlEnum("deliveryStatus", ["sent", "failed", "skipped"]).default("sent").notNull(),
  agencyId: int("agencyId"),           // FK to users.id (the agency involved)
  credentialId: int("credentialId"),   // FK to credentials.id (if credential-related)
  repId: int("repId"),                 // FK to salesReps.id (if rep-related)
  metadata: json("metadata"),          // arbitrary JSON for additional context
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

/**
 * Notification preferences — per-user settings for email and in-app notifications.
 */
export const notificationPreferences = mysqlTable("notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(), // FK to users.id
  emailEnabled: boolean("emailEnabled").default(true).notNull(),
  credentialReminderDays: int("credentialReminderDays").default(30).notNull(),
  // how many days before expiry to send credential reminders (7, 14, 30, 60, 90)
  billingNotifications: boolean("billingNotifications").default(true).notNull(),
  repCommissionAlerts: boolean("repCommissionAlerts").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/**
 * AI Usage Quota — tracks monthly AI question usage per agency.
 * Pilot users have a lifetime cap (no monthly reset).
 * Subscribed users reset on the 1st of each month.
 */
export const aiUsage = mysqlTable("ai_usage", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),          // FK to users.id (agency admin)
  plan: varchar("plan", { length: 32 }).notNull(), // snapshot of plan at time of tracking
  monthKey: varchar("month_key", { length: 7 }).notNull(), // "2026-05" for subscribed, "pilot" for trial
  questionCount: int("question_count").notNull().default(0),
  resetDate: varchar("reset_date", { length: 10 }), // ISO date string: first of next month, or null for pilot
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type AiUsage = typeof aiUsage.$inferSelect;
export type InsertAiUsage = typeof aiUsage.$inferInsert;

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type InsertStaff = typeof staff.$inferInsert;
export type Credential = typeof credentials.$inferSelect;
export type InsertCredential = typeof credentials.$inferInsert;
export type AuditLog = typeof auditLog.$inferSelect;
export type InsertAuditLog = typeof auditLog.$inferInsert;
export type ImportLog = typeof importLogs.$inferSelect;
export type InsertImportLog = typeof importLogs.$inferInsert;
export type VerificationCheck = typeof verificationChecks.$inferSelect;
export type InsertVerificationCheck = typeof verificationChecks.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type InsertProvider = typeof providers.$inferInsert;
export type PayerCredentialingStatus = typeof payerCredentialingStatuses.$inferSelect;
export type InsertPayerCredentialingStatus = typeof payerCredentialingStatuses.$inferInsert;
export type DemoRequest = typeof demoRequests.$inferSelect;
export type SalesRep = typeof salesReps.$inferSelect;
export type InsertSalesRep = typeof salesReps.$inferInsert;
export type Commission = typeof commissions.$inferSelect;
export type InsertCommission = typeof commissions.$inferInsert;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;
export type InsertDemoRequest = typeof demoRequests.$inferInsert;

// ── Contact Form Submissions ────────────────────────────────────
export const contactSubmissions = mysqlTable("contact_submissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "read", "replied", "archived"]).default("new").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = typeof contactSubmissions.$inferInsert;

// ── BACB Certifications ────────────────────────────────────────
/**
 * BACB certifications for BCBA, BCaBA, and RBT staff.
 * Tracks certification number, renewal cycle dates, and CEU progress.
 * No patient data, PHI, or clinical information stored here.
 */
export const bacbCertifications = mysqlTable("bacb_certifications", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  userId: int("userId").notNull(),
  certType: mysqlEnum("certType", ["bcba", "bcaba", "rbt"]).notNull(),
  certNumber: varchar("certNumber", { length: 100 }),
  issueDate: date("issueDate", { mode: "string" }),
  expirationDate: date("expirationDate", { mode: "string" }),
  // BACB renewal cycle tracking
  renewalCycleStartDate: date("renewalCycleStartDate", { mode: "string" }),
  renewalCycleEndDate: date("renewalCycleEndDate", { mode: "string" }),
  // CEU requirements (BCBA: 32 hrs / 3 ethics; BCaBA: 20 hrs / 1 ethics; RBT: 20 hrs / 1 ethics per 2yr cycle)
  ceuRequired: int("ceuRequired").default(32).notNull(),
  ceuCompleted: int("ceuCompleted").default(0).notNull(),
  ceuEthicsRequired: int("ceuEthicsRequired").default(3).notNull(),
  ceuEthicsCompleted: int("ceuEthicsCompleted").default(0).notNull(),
  status: mysqlEnum("status", ["current", "expiring_soon", "expired"]).default("current").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BacbCertification = typeof bacbCertifications.$inferSelect;
export type InsertBacbCertification = typeof bacbCertifications.$inferInsert;

/**
 * CEU (Continuing Education Unit) records for BACB-certified staff.
 * Tracks individual CE activities toward renewal cycle requirements.
 * No patient data or PHI stored here.
 */
export const ceuRecords = mysqlTable("ceu_records", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),
  userId: int("userId").notNull(),
  bacbCertId: int("bacbCertId").notNull(), // FK to bacbCertifications.id
  title: varchar("title", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }),
  completedDate: date("completedDate", { mode: "string" }).notNull(),
  hours: int("hours").notNull(), // stored as tenths of hours * 10 (e.g. 15 = 1.5 hrs)
  isEthics: boolean("isEthics").default(false).notNull(),
  certificateKey: text("certificateKey"), // S3 storage key for uploaded certificate
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CeuRecord = typeof ceuRecords.$inferSelect;
export type InsertCeuRecord = typeof ceuRecords.$inferInsert;

/**
 * RBT Supervision Logs — de-identified hours tracking.
 * Tracks total hours worked and supervision hours per RBT per month.
 * BACB requires RBTs receive supervision = minimum 5% of hours worked.
 * No client names, session notes, or PHI stored here — numbers only.
 */
export const supervisionLogs = mysqlTable("supervision_logs", {
  id: int("id").autoincrement().primaryKey(),
  staffId: int("staffId").notNull(),       // the RBT being supervised
  userId: int("userId").notNull(),          // agency owner
  supervisorStaffId: int("supervisorStaffId"), // the BCBA supervisor (nullable for legacy entries)
  monthYear: varchar("monthYear", { length: 7 }).notNull(), // "YYYY-MM" e.g. "2026-06"
  totalHoursWorked: int("totalHoursWorked").notNull(), // stored as tenths * 10 (e.g. 800 = 80.0 hrs)
  supervisionHoursLogged: int("supervisionHoursLogged").notNull(), // stored as tenths * 10 (e.g. 50 = 5.0 hrs)
  // Computed fields (denormalized for fast querying)
  ratioPercent: int("ratioPercent").notNull(), // (supervisionHours / totalHours) * 100, stored as integer (e.g. 8 = 8%)
  isCompliant: boolean("isCompliant").notNull(), // ratioPercent >= 5
  notes: text("notes"), // admin notes only — NO client or clinical content
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SupervisionLog = typeof supervisionLogs.$inferSelect;
export type InsertSupervisionLog = typeof supervisionLogs.$inferInsert;

// ── Note Compliance Logs ────────────────────────────────────────
// Tracks documentation timeliness for staff members (e.g. session notes, progress notes).
// AuditReady NEVER stores clinical content, PHI, or patient data.
// Only metadata: who completed notes, when, and whether they were on time.
export const noteLogs = mysqlTable("note_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),         // agency owner
  staffId: int("staffId").notNull(),       // staff member this log belongs to
  weekOf: date("weekOf", { mode: "string" }).notNull(), // ISO date of the Monday of the week (YYYY-MM-DD)
  sessionsHeld: int("sessionsHeld").notNull().default(0),     // # sessions conducted that week
  notesCompleted: int("notesCompleted").notNull().default(0), // # notes completed on time
  notesPending: int("notesPending").notNull().default(0),     // # notes still outstanding
  notesLate: int("notesLate").notNull().default(0),           // # notes completed but past deadline
  supervisorReviewed: boolean("supervisorReviewed").default(false).notNull(),
  reviewedAt: timestamp("reviewedAt"),
  reviewerName: varchar("reviewerName", { length: 255 }),
  notes: text("notes"), // free-text admin notes — NO clinical content
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type NoteLog = typeof noteLogs.$inferSelect;
export type InsertNoteLog = typeof noteLogs.$inferInsert;

// ── OIG LEIE Monthly Batch Exclusion Checks ─────────────────────────────────
// Tracks monthly batch OIG exclusion screening runs for all active staff.
// Required by federal law for any Medicaid-billing agency.
// Stores a dated audit log proving the check was run.
export const oigBatchChecks = mysqlTable("oig_batch_checks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),           // agency owner who triggered or owns the check
  runAt: timestamp("runAt").defaultNow().notNull(), // when the batch was executed
  totalStaff: int("totalStaff").notNull().default(0),
  cleared: int("cleared").notNull().default(0),     // staff with no OIG match
  flagged: int("flagged").notNull().default(0),     // staff with a potential OIG match
  errors: int("errors").notNull().default(0),       // staff where API call failed
  results: json("results"),                          // JSON array: [{staffId, staffName, status: 'cleared'|'flagged'|'error', matchCount?, details?}]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type OigBatchCheck = typeof oigBatchChecks.$inferSelect;
export type InsertOigBatchCheck = typeof oigBatchChecks.$inferInsert;

// ── ABA New-Hire Onboarding Checklists ──────────────────────────────────────
// Tracks required credential documents for new ABA staff before they can work with clients.
// Each checklist item is a document type (e.g. 40-hr training cert, competency assessment).
// AuditReady tracks whether each doc EXISTS and when it expires — not the document contents.
// Zero PHI — staff-side only.
export const onboardingChecklists = mysqlTable("onboarding_checklists", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),           // agency owner
  staffId: int("staffId").notNull(),         // new hire being onboarded
  // Status
  status: mysqlEnum("status", ["in_progress", "complete", "on_hold"]).default("in_progress").notNull(),
  completedAt: timestamp("completedAt"),     // set when all required items are checked off
  notes: text("notes"),                      // admin notes — NO clinical content
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OnboardingChecklist = typeof onboardingChecklists.$inferSelect;
export type InsertOnboardingChecklist = typeof onboardingChecklists.$inferInsert;

// ── ABA Onboarding Checklist Items ──────────────────────────────────────────
// Individual required document items within an onboarding checklist.
// Each item tracks: document type, whether it's been received, and expiration date if applicable.
export const onboardingChecklistItems = mysqlTable("onboarding_checklist_items", {
  id: int("id").autoincrement().primaryKey(),
  checklistId: int("checklistId").notNull(),  // FK to onboarding_checklists
  userId: int("userId").notNull(),            // agency owner (denormalized for fast queries)
  staffId: int("staffId").notNull(),          // staff member (denormalized)
  // Document type
  itemKey: varchar("itemKey", { length: 64 }).notNull(), // e.g. "rbt_cert", "40hr_training", "background_check"
  label: varchar("label", { length: 255 }).notNull(),    // human-readable: "RBT Certification"
  category: mysqlEnum("category", [
    "certification",    // BACB certs (RBT, BCBA, BCaBA)
    "training",         // 40-hr training, bloodborne pathogens, HIPAA, etc.
    "background_check", // criminal background, sex offender registry, OIG check
    "documentation",    // competency assessment, supervision agreement, attestation
    "insurance",        // malpractice, liability
    "other",
  ]).notNull(),
  isRequired: boolean("isRequired").default(true).notNull(),
  // Status
  isReceived: boolean("isReceived").default(false).notNull(),
  receivedAt: timestamp("receivedAt"),        // when the document was received/verified
  expiresAt: timestamp("expiresAt"),          // expiration date if applicable (null = no expiry)
  documentNote: varchar("documentNote", { length: 500 }), // e.g. "Expires 12/2025 — renewal pending"
  sortOrder: int("sortOrder").default(0).notNull(), // display order within the checklist
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OnboardingChecklistItem = typeof onboardingChecklistItems.$inferSelect;
export type InsertOnboardingChecklistItem = typeof onboardingChecklistItems.$inferInsert;
