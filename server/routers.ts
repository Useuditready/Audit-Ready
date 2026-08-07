import { COOKIE_NAME } from "@shared/const";
import { storagePut, storageGetSignedUrl } from "./storage";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, adminProcedure, protectedProcedure, writeProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { sendEmailVerificationEmail, sendOwnerDemoNotification, sendContactFormEmail, sendDemoConfirmationEmail, sendDeletionRequestConfirmationEmail, sendDeletionCompletedEmail } from "./email";
import crypto from "crypto";
import { createDemoRequest, listDemoRequests, createPilotSignup, listPilotSignups, listAllPilots, activatePilot, rejectPilot, getUserById, getDb, createContactSubmission, listContactSubmissions, updateContactSubmissionStatus, countNewContactSubmissions } from "./db";
import { aiUsage, users } from "../drizzle/schema";
import { eq, isNotNull } from "drizzle-orm";
import { sendPilotActivationEmail, sendAiQuotaUpgradeEmail } from "./email";
import {
  getStaffByUserId,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getCredentialsByStaffId,
  getAllCredentialsByUserId,
  createCredential,
  updateCredential,
  deleteCredential,
  getDashboardStats,
  getExpiringCredentials,
  createAuditLogEntry,
  getAuditLogByEntity,
  getAuditLogByUser,
  getAuditLogByStaff,
  getPendingCredentials,
  dismissOnboarding,
  completeTour,
  getUserProfile,
  updateUserProfile,
  updateNotificationPreferences,
  parseNotificationPreferences,
  bulkCreateStaff,
  bulkCreateCredentials,
  createImportLog,
  getImportLogs,
  findDuplicateStaff,
  markStaffInactive,
  getStaffRetentionInfo,
  createVerificationCheck,
  updateVerificationCheckStatus,
  getVerificationChecksByStaff,
  getVerificationCheckById,
  getLatestVerificationCheckPerStaff,
  getProvidersByUserId,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  getPayerStatusesForProvider,
  upsertPayerStatus,
  deletePayerStatus,
  getCredentialingDashboardStats,
  saveEmailVerificationToken,
  getNoteLogsByUserId,
  getNoteLogsByStaffId,
  upsertNoteLog,
  deleteNoteLog,
} from "./db";
import { runVerificationChecks, VerificationSource } from "./verificationService";
import { billingRouter } from "./routers/billing";
import { repRouter } from "./routers/rep";
import { bacbRouter } from "./routers/bacb";
import { onboardingRouter } from "./routers/onboarding";
import { getNotificationPreferences, upsertNotificationPreferences, getNotificationLogs, getAiUsage, incrementAiUsage } from "./db";

// In-memory rate limit store for contact form (IP → timestamps[])
const contactRateMap = new Map<string, number[]>();

/**
 * Derives credential status from expiration date.
 * - If status is explicitly 'not_applicable', preserve it.
 * - If no expiration date, defaults to 'current'.
 * - If expired (past today), returns 'expired'.
 * - If expiring within 90 days, returns 'expiring_soon'.
 * - Otherwise returns 'current'.
 */
function deriveCredentialStatus(
  expirationDate: string | undefined | null,
  explicitStatus?: string
): "current" | "expiring_soon" | "expired" | "not_applicable" {
  if (explicitStatus === "not_applicable") return "not_applicable";
  if (!expirationDate) return "current";
  const expiry = new Date(expirationDate);
  if (isNaN(expiry.getTime())) return "current";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= 90) return "expiring_soon";
  return "current";
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  billing: billingRouter,
  rep: repRouter,
  bacb: bacbRouter,
  onboarding: onboardingRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await sdk.revokeSessionFromRequest(ctx.req);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    dismissOnboarding: writeProcedure.mutation(async ({ ctx }) => {
      await dismissOnboarding(ctx.user.id);
      return { success: true };
    }),
    completeTour: writeProcedure.mutation(async ({ ctx }) => {
      await completeTour(ctx.user.id);
      return { success: true };
    }),

    sendVerificationEmail: writeProcedure.mutation(async ({ ctx }) => {
      const user = ctx.user;
      if (!user.email) return { success: false, error: "No email on account" };
      if (user.emailVerifiedAt) return { success: false, error: "Email already verified" };
      const token = crypto.randomUUID().replace(/-/g, "");
      await saveEmailVerificationToken(user.id, token);
      const origin = process.env.APP_URL || "https://www.useauditready.com";
      const verifyUrl = `${origin}/api/verify-email?token=${token}`;
      const result = await sendEmailVerificationEmail({
        toEmail: user.email,
        name: user.name || "",
        verifyUrl,
      });
      return result;
    }),

    resendVerificationEmail: writeProcedure.mutation(async ({ ctx }) => {
      const user = ctx.user;
      if (!user.email) return { success: false, error: "No email on account" };
      if (user.emailVerifiedAt) return { success: false, error: "Email already verified" };
      const token = crypto.randomUUID().replace(/-/g, "");
      await saveEmailVerificationToken(user.id, token);
      const origin = process.env.APP_URL || "https://www.useauditready.com";
      const verifyUrl = `${origin}/api/verify-email?token=${token}`;
      const result = await sendEmailVerificationEmail({
        toEmail: user.email,
        name: user.name || "",
        verifyUrl,
      });
      return result;
    }),
  }),

  staff: router({
    list: protectedProcedure.query(({ ctx }) => {
      return getStaffByUserId(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        return getStaffById(input.id, ctx.user.id);
      }),

    create: writeProcedure
      .input(
        z.object({
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().optional(),
          role: z.string().optional(),
          hireDate: z.string().optional(),
          status: z.enum(["active", "inactive", "terminated"]).default("active"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const id = await createStaff({
          userId: ctx.user.id,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email || null,
          phone: input.phone || null,
          role: input.role || null,
          hireDate: input.hireDate || null,
          status: input.status,
        });
        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "staff",
          entityId: id,
          action: "create",
          changedBy: ctx.user.name || ctx.user.email || "Admin",
          summary: `Added staff member: ${input.firstName} ${input.lastName}`,
        });
        return { id };
      }),

    update: writeProcedure
      .input(
        z.object({
          id: z.number(),
          firstName: z.string().min(1).optional(),
          lastName: z.string().min(1).optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          role: z.string().optional(),
          hireDate: z.string().optional(),
          status: z.enum(["active", "inactive", "terminated"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const before = await getStaffById(id, ctx.user.id);
        await updateStaff(id, ctx.user.id, data as any);
        const changedBy = ctx.user.name || ctx.user.email || "Admin";
        for (const [field, newVal] of Object.entries(data)) {
          if (newVal === undefined) continue;
          const oldVal = before ? String((before as any)[field] ?? "") : "";
          const newValStr = String(newVal ?? "");
          if (oldVal !== newValStr) {
            await createAuditLogEntry({
              userId: ctx.user.id,
              entityType: "staff",
              entityId: id,
              action: "update",
              changedBy,
              fieldChanged: field,
              oldValue: oldVal,
              newValue: newValStr,
              summary: `Updated ${field}: "${oldVal}" → "${newValStr}"`,
            });
          }
        }
        return { success: true };
      }),

    delete: writeProcedure
      .input(z.object({ id: z.number(), overrideRetention: z.boolean().default(false) }))
      .mutation(async ({ ctx, input }) => {
        const retention = await getStaffRetentionInfo(input.id, ctx.user.id);
        // Enforce 2-year retention: block deletion unless eligible or admin overrides
        if (retention && !retention.isDeletionEligible && !input.overrideRetention) {
          throw new Error(
            `RETENTION_BLOCK:${retention.inactivatedAt?.toISOString() ?? ""}:${retention.retentionExpiresAt?.toISOString() ?? ""}`
          );
        }
        const before = await getStaffById(input.id, ctx.user.id);
        await deleteStaff(input.id, ctx.user.id);
        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "staff",
          entityId: input.id,
          action: "delete",
          changedBy: ctx.user.name || ctx.user.email || "Admin",
          summary: before
            ? `Deleted staff member: ${before.firstName} ${before.lastName}${input.overrideRetention ? " (retention override)" : ""}`
            : `Deleted staff #${input.id}`,
        });
        return { success: true };
      }),

    markInactive: writeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const before = await getStaffById(input.id, ctx.user.id);
        if (!before) throw new Error("Staff member not found");
        await markStaffInactive(input.id, ctx.user.id);
        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "staff",
          entityId: input.id,
          action: "update",
          changedBy: ctx.user.name || ctx.user.email || "Admin",
          fieldChanged: "status",
          oldValue: before.status,
          newValue: "inactive",
          summary: `Marked ${before.firstName} ${before.lastName} as inactive. Records retained for 2 years.`,
        });
        return { success: true };
      }),

    getRetentionInfo: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const info = await getStaffRetentionInfo(input.id, ctx.user.id);
        if (!info) throw new Error("Staff member not found");
        return info;
      }),

    importCsv: writeProcedure
      .input(
        z.object({
          fileName: z.string().min(1).default("import.csv"),
          rows: z.array(
            z.object({
              // originalRow is the 1-based row number in the source CSV (for error reporting)
              originalRow: z.number().int().positive(),
              firstName: z.string().min(1),
              lastName: z.string().min(1),
              email: z.string().optional(),
              phone: z.string().optional(),
              role: z.string().optional(),
              hireDate: z.string().optional(),
              status: z.enum(["active", "inactive", "terminated"]).default("active"),
            })
          ).min(1).max(500),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const changedBy = ctx.user.name || ctx.user.email || "Admin";
        let inserted = 0;
        const errors: { row: number; message: string }[] = [];

        // Server-side validation (defence-in-depth beyond client validation)
        const validatedRows: { originalRow: number; data: Parameters<typeof bulkCreateStaff>[0][0] }[] = [];
        for (const r of input.rows) {
          const rowErrors: string[] = [];
          if (!r.firstName.trim()) rowErrors.push("First Name is required");
          if (!r.lastName.trim()) rowErrors.push("Last Name is required");
          if (r.email && r.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) {
            rowErrors.push("Email format is invalid");
          }
          if (r.hireDate && r.hireDate.trim() && isNaN(new Date(r.hireDate).getTime())) {
            rowErrors.push("Hire Date is not a valid date");
          }
          if (rowErrors.length > 0) {
            errors.push({ row: r.originalRow, message: rowErrors.join("; ") });
          } else {
            validatedRows.push({
              originalRow: r.originalRow,
              data: {
                userId: ctx.user.id,
                firstName: r.firstName.trim(),
                lastName: r.lastName.trim(),
                email: r.email?.trim() || null,
                phone: r.phone?.trim() || null,
                role: r.role?.trim() || null,
                hireDate: r.hireDate?.trim() || null,
                status: r.status,
              },
            });
          }
        }

        // Bulk insert validated rows; map DB errors back to original row numbers
        if (validatedRows.length > 0) {
          const result = await bulkCreateStaff(validatedRows.map(v => v.data));
          inserted = result.inserted;
          for (const dbErr of result.errors) {
            // dbErr.row is 1-based index into validatedRows array
            const originalRow = validatedRows[dbErr.row - 1]?.originalRow ?? dbErr.row;
            errors.push({ row: originalRow, message: dbErr.message });
          }
        }

        // Write import log so Import History page can show this run
        await createImportLog({
          userId: ctx.user.id,
          importType: "staff",
          fileName: input.fileName,
          totalRows: input.rows.length,
          inserted,
          failed: errors.length,
          errorSummary: errors.length > 0 ? JSON.stringify(errors) : null,
        });
        // Log a single audit entry summarising the import
        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "staff",
          entityId: 0,
          action: "create",
          changedBy,
          summary: `CSV import: ${inserted} staff member(s) added${errors.length > 0 ? `, ${errors.length} row(s) failed` : ""}.`,
        });
         return { inserted, errors };
      }),

    checkDuplicates: writeProcedure
      .input(
        z.object({
          candidates: z.array(
            z.object({
              firstName: z.string(),
              lastName: z.string(),
              email: z.string().optional(),
            })
          ).min(1).max(500),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const dupes = await findDuplicateStaff(ctx.user.id, input.candidates);
        return { duplicates: dupes };
      }),
  }),
  credentials: router({
    listByStaff: protectedProcedure
      .input(z.object({ staffId: z.number() }))
      .query(({ ctx, input }) => {
        return getCredentialsByStaffId(input.staffId, ctx.user.id);
      }),

    listAll: protectedProcedure.query(({ ctx }) => {
      return getAllCredentialsByUserId(ctx.user.id);
    }),
    pending: protectedProcedure.query(({ ctx }) => {
      return getPendingCredentials(ctx.user.id);
    }),

    create: writeProcedure
      .input(
        z.object({
          staffId: z.number(),
          type: z.string().min(1),
          category: z.enum(["license", "certification", "training", "background_check", "sex_offender_registry", "insurance", "other"]).default("license"),
          issuingBody: z.string().optional(),
          licenseNumber: z.string().optional(),
          issueDate: z.string().optional(),
          expirationDate: z.string().optional(),
          status: z.enum(["current", "expiring_soon", "expired", "not_applicable"]).default("current"),
          // Document location — where the physical or digital document is stored
          documentLocationType: z.enum(["none", "paper", "google_drive", "dropbox", "sharepoint", "hr_system", "ehr_system", "other"]).optional(),
          documentLocationNote: z.string().optional(), // URL or free-text location note
          // Optional uploaded file (staff credential docs only — never PHI)
          documentLink: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Auto-derive status from expiration date if not explicitly set to not_applicable
        const derivedStatus = deriveCredentialStatus(input.expirationDate, input.status);
        const id = await createCredential({
          staffId: input.staffId,
          userId: ctx.user.id,
          type: input.type,
          category: input.category,
          issuingBody: input.issuingBody || null,
          licenseNumber: input.licenseNumber || null,
          issueDate: input.issueDate || null,
          expirationDate: input.expirationDate || null,
          status: derivedStatus,
          documentLocationType: input.documentLocationType || "none",
          documentLocationNote: input.documentLocationNote || null,
          documentLink: input.documentLink || null,
          notes: input.notes || null,
          verificationStatus: "not_checked",
        });
        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "credential",
          entityId: id,
          action: "create",
          changedBy: ctx.user.name || ctx.user.email || "Admin",
          summary: `Added credential: ${input.type} (${input.category})${input.licenseNumber ? ` — #${input.licenseNumber}` : ""}`,
        });
        return { id };
      }),

    update: writeProcedure
      .input(
        z.object({
          id: z.number(),
          type: z.string().optional(),
          category: z.enum(["license", "certification", "training", "background_check", "sex_offender_registry", "insurance", "other"]).optional(),
          issuingBody: z.string().optional(),
          licenseNumber: z.string().optional(),
          issueDate: z.string().optional(),
          expirationDate: z.string().optional(),
          status: z.enum(["current", "expiring_soon", "expired", "not_applicable"]).optional(),
          documentLocationType: z.enum(["none", "paper", "google_drive", "dropbox", "sharepoint", "hr_system", "ehr_system", "other"]).optional(),
          documentLocationNote: z.string().optional(),
          documentLink: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        // Auto-derive status from expiration date when updating
        if (data.expirationDate !== undefined || data.status !== undefined) {
          (data as any).status = deriveCredentialStatus(data.expirationDate, data.status);
        }
        const beforeList = await getAllCredentialsByUserId(ctx.user.id);
        const before = beforeList.find(c => c.id === id);
        await updateCredential(id, ctx.user.id, data as any);
        const changedBy = ctx.user.name || ctx.user.email || "Admin";
        for (const [field, newVal] of Object.entries(data)) {
          if (newVal === undefined) continue;
          const oldVal = before ? String((before as any)[field] ?? "") : "";
          const newValStr = String(newVal ?? "");
          if (oldVal !== newValStr) {
            await createAuditLogEntry({
              userId: ctx.user.id,
              entityType: "credential",
              entityId: id,
              action: "update",
              changedBy,
              fieldChanged: field,
              oldValue: oldVal,
              newValue: newValStr,
              summary: `Updated ${field}: "${oldVal}" → "${newValStr}"`,
            });
          }
        }
        return { success: true };
      }),

    // Verification workflow: admin reviews credential and sets verification status
    // Only admin can set status to "verified" — never auto-set
    verify: writeProcedure
      .input(
        z.object({
          id: z.number(),
          verificationStatus: z.enum(["not_checked", "verified", "needs_review", "not_found", "manual_review_required"]),
          verificationNotes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const changedBy = ctx.user.name || ctx.user.email || "Admin";
        await updateCredential(input.id, ctx.user.id, {
          verificationStatus: input.verificationStatus,
          verifiedBy: changedBy,
          verificationDate: new Date(),
          verificationNotes: input.verificationNotes || null,
        } as any);
        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "credential",
          entityId: input.id,
          action: "verify",
          changedBy,
          fieldChanged: "verificationStatus",
          newValue: input.verificationStatus,
          summary: `Verification set to "${input.verificationStatus}"${input.verificationNotes ? `: ${input.verificationNotes}` : ""}`,
        });
        return { success: true };
      }),

    delete: writeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const beforeList = await getAllCredentialsByUserId(ctx.user.id);
        const before = beforeList.find(c => c.id === input.id);
        await deleteCredential(input.id, ctx.user.id);
        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "credential",
          entityId: input.id,
          action: "delete",
          changedBy: ctx.user.name || ctx.user.email || "Admin",
          summary: before ? `Deleted credential: ${before.type}` : `Deleted credential #${input.id}`,
        });
        return { success: true };
      }),

    // Upload a credential document to S3 storage
    // Accepts base64-encoded file content with mime type
    // Returns the storage URL saved in documentLink
    uploadDocument: writeProcedure
      .input(
        z.object({
          credentialId: z.number(),
          fileName: z.string().max(200),
          mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
          base64Data: z.string().max(20_000_000), // ~15MB limit
        })
      )
      .mutation(async ({ ctx, input }) => {
        const buffer = Buffer.from(input.base64Data, "base64");
        if (buffer.length > 15 * 1024 * 1024) {
          throw new Error("File too large. Maximum size is 15MB.");
        }
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storageKey = `credential-docs/${ctx.user.id}/${input.credentialId}/${Date.now()}-${safeFileName}`;
        const { url } = await storagePut(storageKey, buffer, input.mimeType);
        await updateCredential(input.credentialId, ctx.user.id, { documentLink: url } as any);
        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "credential",
          entityId: input.credentialId,
          action: "update",
          changedBy: ctx.user.name || ctx.user.email || "Admin",
          fieldChanged: "documentLink",
          newValue: url,
          summary: `Uploaded document: ${input.fileName}`,
        });
        return { url, success: true };
      }),

    exportCsv: protectedProcedure.query(async ({ ctx }) => {
      const allCreds = await getAllCredentialsByUserId(ctx.user.id);
      const staffList = await getStaffByUserId(ctx.user.id);
      const staffMap = staffList.reduce<Record<number, { firstName: string; lastName: string; role: string | null }>>((acc, s) => {
        acc[s.id] = { firstName: s.firstName, lastName: s.lastName, role: s.role };
        return acc;
      }, {});

      const headers = ["Staff Name", "Role", "Credential Type", "Category", "Issuing Body", "License Number", "Issue Date", "Expiration Date", "Status", "Verification Status", "Verified By", "Verification Date", "Document Link", "Notes"];
      const rows = allCreds.map(c => {
        const staff = staffMap[c.staffId];
        const staffName = staff ? `${staff.firstName} ${staff.lastName}` : "Unknown";
        const role = staff?.role ?? "";
        return [
          staffName,
          role,
          c.type,
          c.category,
          c.issuingBody ?? "",
          c.licenseNumber ?? "",
          c.issueDate ?? "",
          c.expirationDate ?? "",
          c.status,
          c.verificationStatus,
          c.verifiedBy ?? "",
          c.verificationDate ? new Date(c.verificationDate).toISOString().slice(0, 10) : "",
          c.documentLink ?? "",
          c.notes ?? "",
        ];
      });

      const escapeCsv = (val: string) => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };

      const csv = [headers.map(escapeCsv).join(","), ...rows.map(r => r.map(escapeCsv).join(","))].join("\n");
      return { csv, filename: `auditready-credentials-export-${new Date().toISOString().slice(0, 10)}.csv` };
    }),

    // AI-assisted document extraction
    // Accepts a file URL (from S3 after upload), sends to LLM vision, returns suggested fields
    // NEVER auto-saves — returns suggestions only for human review
    extractFromDocument: writeProcedure
      .input(
        z.object({
          // Accepts either a full HTTPS URL or a /manus-storage/ path returned by uploadDocument
          fileUrl: z.string().min(1),
          mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
          staffName: z.string().optional(), // hint to help LLM identify the correct person
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check AI usage quota
        const plan = (ctx.user as any).plan || "starter";
        const accountStatus = (ctx.user as any).accountStatus || "active_pilot";
        const usage = await getAiUsage(ctx.user.id, plan, accountStatus);
        if (usage.questionCount >= usage.limit) {
          throw new Error("Monthly AI extraction limit reached. Upgrade your plan for unlimited extractions.");
        }

        // Convert /manus-storage/<key> paths to a real presigned S3 URL the LLM can fetch.
        // uploadDocument returns a /manus-storage/ path, not a full URL, so we must resolve it here.
        let resolvedFileUrl = input.fileUrl;
        if (input.fileUrl.startsWith("/manus-storage/")) {
          const relKey = input.fileUrl.replace(/^\/manus-storage\//, "");
          try {
            resolvedFileUrl = await storageGetSignedUrl(relKey);
          } catch (signErr: any) {
            return {
              success: false,
              error: "Could not access the uploaded document. Please try uploading again.",
              extracted: null,
            };
          }
        }

        const systemPrompt = `You are an AI assistant that extracts information from professional credential documents (licenses, certifications, CPR cards, background checks, training certificates).

Extract ONLY the following fields if clearly visible in the document. Do NOT guess or infer values that are not explicitly shown.

Return a JSON object with these fields:
- credentialType: string | null — the type of credential (e.g., "BCBA License", "CPR/First Aid", "RBT Certification")
- issuingBody: string | null — the organization that issued it (e.g., "BACB", "American Red Cross", "NC Medical Board")
- licenseNumber: string | null — the license or certification number
- issueDate: string | null — issue/effective date in YYYY-MM-DD format
- expirationDate: string | null — expiration date in YYYY-MM-DD format
- providerName: string | null — the name of the credential holder if visible
- confidence: "high" | "medium" | "low" — your overall confidence in the extraction
- warnings: string[] — list any issues (e.g., "Expiration date not found", "Document appears blurry", "This may not be a credential document", "Multiple dates found — using most recent")

IMPORTANT RULES:
1. If you cannot read the document clearly, set confidence to "low" and add a warning.
2. If no expiration date is visible, set expirationDate to null and add warning "Expiration date not found — please enter manually".
3. If this does not appear to be a credential document, set confidence to "low" and add warning "This does not appear to be a credential document".
4. NEVER include patient names, client information, diagnosis codes, treatment notes, or any PHI. If the document contains PHI, add warning "Document may contain patient information — do not upload PHI" and return null for all fields.
5. Dates must be in YYYY-MM-DD format. If only month/year is visible, use the last day of that month.`;

        let result: {
          credentialType: string | null;
          issuingBody: string | null;
          licenseNumber: string | null;
          issueDate: string | null;
          expirationDate: string | null;
          providerName: string | null;
          confidence: "high" | "medium" | "low";
          warnings: string[];
        };

        try {
          const llmResponse = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Please extract credential information from this document.${input.staffName ? ` The credential holder is expected to be: ${input.staffName}` : ""}`,
                  },
                  {
                    type: "file_url" as const,
                    file_url: {
                      url: resolvedFileUrl,
                      mime_type: input.mimeType as "application/pdf" | "audio/mpeg" | "audio/wav" | "audio/mp4" | "video/mp4",
                    },
                  },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "credential_extraction",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    credentialType: { type: ["string", "null"], description: "Type of credential" },
                    issuingBody: { type: ["string", "null"], description: "Issuing organization" },
                    licenseNumber: { type: ["string", "null"], description: "License or certification number" },
                    issueDate: { type: ["string", "null"], description: "Issue date in YYYY-MM-DD format" },
                    expirationDate: { type: ["string", "null"], description: "Expiration date in YYYY-MM-DD format" },
                    providerName: { type: ["string", "null"], description: "Name of credential holder" },
                    confidence: { type: "string", enum: ["high", "medium", "low"], description: "Extraction confidence" },
                    warnings: { type: "array", items: { type: "string" }, description: "List of warnings or issues" },
                  },
                  required: ["credentialType", "issuingBody", "licenseNumber", "issueDate", "expirationDate", "providerName", "confidence", "warnings"],
                  additionalProperties: false,
                },
              },
            },
          });

          const content = llmResponse.choices?.[0]?.message?.content;
          if (!content) throw new Error("No response from AI");
          result = typeof content === "string" ? JSON.parse(content) : content;
        } catch (err: any) {
          // Return a graceful error result rather than throwing
          return {
            success: false,
            error: "AI extraction failed. Please enter the credential information manually.",
            extracted: null,
          };
        }

        // Increment AI usage counter
        await incrementAiUsage(ctx.user.id, plan, accountStatus);

        // Log to audit trail
        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "credential",
          entityId: 0,
          action: "create",
          changedBy: ctx.user.name || ctx.user.email || "Admin",
          summary: `AI document extraction run — confidence: ${result.confidence}${result.warnings.length > 0 ? `, warnings: ${result.warnings.join("; ")}` : ""}`,
        });

        return {
          success: true,
          error: null,
          extracted: result,
        };
      }),

    importCsv: protectedProcedure
      .input(
        z.object({
          fileName: z.string().min(1),
          rows: z.array(
            z.object({
              originalRow: z.number().int().positive(),
              staffId: z.number().int().positive(),
              type: z.string().min(1),
              category: z.enum(["license", "certification", "training", "background_check", "sex_offender_registry", "insurance", "other"]).default("license"),
              issuingBody: z.string().optional(),
              licenseNumber: z.string().optional(),
              issueDate: z.string().optional(),
              expirationDate: z.string().optional(),
              status: z.enum(["current", "expiring_soon", "expired", "not_applicable"]).default("current"),
              documentLink: z.string().optional(),
              notes: z.string().optional(),
            })
          ).min(1).max(1000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const changedBy = ctx.user.name || ctx.user.email || "Admin";
        let inserted = 0;
        const errors: { row: number; message: string }[] = [];

        // Server-side validation
        const validatedRows: Parameters<typeof bulkCreateCredentials>[0] = [];
        const validatedOriginalRows: number[] = [];
        for (const r of input.rows) {
          const rowErrors: string[] = [];
          if (!r.type.trim()) rowErrors.push("Credential Type is required");
          if (r.issueDate && r.issueDate.trim() && isNaN(new Date(r.issueDate).getTime())) rowErrors.push("Issue Date is not a valid date");
          if (r.expirationDate && r.expirationDate.trim() && isNaN(new Date(r.expirationDate).getTime())) rowErrors.push("Expiration Date is not a valid date");
          if (rowErrors.length > 0) {
            errors.push({ row: r.originalRow, message: rowErrors.join("; ") });
          } else {
            validatedRows.push({
              userId: ctx.user.id,
              staffId: r.staffId,
              type: r.type.trim(),
              category: r.category,
              issuingBody: r.issuingBody?.trim() || null,
              licenseNumber: r.licenseNumber?.trim() || null,
              issueDate: r.issueDate?.trim() || null,
              expirationDate: r.expirationDate?.trim() || null,
              status: r.status,
              documentLink: r.documentLink?.trim() || null,
              notes: r.notes?.trim() || null,
              verificationStatus: "not_checked",
            });
            validatedOriginalRows.push(r.originalRow);
          }
        }

        if (validatedRows.length > 0) {
          const result = await bulkCreateCredentials(validatedRows);
          inserted = result.inserted;
          for (const dbErr of result.errors) {
            const originalRow = validatedOriginalRows[dbErr.row - 1] ?? dbErr.row;
            errors.push({ row: originalRow, message: dbErr.message });
          }
        }

        // Write import log
        await createImportLog({
          userId: ctx.user.id,
          importType: "credential",
          fileName: input.fileName,
          totalRows: input.rows.length,
          inserted,
          failed: errors.length,
          errorSummary: errors.length > 0 ? JSON.stringify(errors) : null,
        });

        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "credential",
          entityId: 0,
          action: "create",
          changedBy,
          summary: `CSV import: ${inserted} credential(s) added${errors.length > 0 ? `, ${errors.length} row(s) failed` : ""}.`,
        });
        return { inserted, errors };
      }),
  }),
  dashboard: router({
    stats: protectedProcedure.query(({ ctx }) => {
      return getDashboardStats(ctx.user.id);
    }),

    expiring: protectedProcedure
      .input(z.object({ days: z.number().default(90) }).optional())
      .query(({ ctx, input }) => {
        return getExpiringCredentials(ctx.user.id, input?.days ?? 90);
      }),
  }),

  auditLog: router({
    byEntity: protectedProcedure
      .input(z.object({
        entityType: z.enum(["staff", "credential"]),
        entityId: z.number(),
      }))
      .query(({ ctx, input }) => {
        return getAuditLogByEntity(input.entityType, input.entityId, ctx.user.id);
      }),
    byStaff: protectedProcedure
      .input(z.object({ staffId: z.number() }))
      .query(({ ctx, input }) => {
        return getAuditLogByStaff(input.staffId, ctx.user.id);
      }),
    recent: protectedProcedure
      .input(z.object({ limit: z.number().default(100) }).optional())
      .query(({ ctx, input }) => {
        return getAuditLogByUser(ctx.user.id, input?.limit ?? 100);
      }),
  }),

  // ── AI Features (Phase 1) ─────────────────────────────────────
  ai: router({
    /**
     * Extract credential fields from a document URL.
     * The document is never stored — only the extracted metadata is returned
     * for the admin to review and approve before saving.
     */
    extractFromLink: writeProcedure
      .input(
        z.object({
          documentUrl: z.string().url(),
          hint: z.string().optional(), // optional hint like "BCBA license" to help the model
        })
      )
      .mutation(async ({ input }) => {
        const systemPrompt = `You are a credential extraction assistant for behavioral health agencies.
Your ONLY job is to extract structured credential information from professional license and certification documents.

You MUST:
- Extract: credential type, issuing body, license/certification number, issue date, expiration date
- Return dates in YYYY-MM-DD format
- Return null for any field you cannot find
- Never invent or guess information not present in the document

You MUST NOT:
- Extract or reference any patient, client, or clinical information
- Provide compliance opinions or legal advice
- Make statements about whether a credential is valid or sufficient
- Process therapy notes, clinical documentation, or PHI

If the document does not appear to be a professional credential, license, or certification, return an error message.`;

        const userPrompt = `Please extract credential information from this document: ${input.documentUrl}${
          input.hint ? `\n\nHint: This is likely a ${input.hint}` : ""
        }

Return a JSON object with these fields:
- credentialType: string (e.g., "BCBA License", "RBT Certification", "CPR Card")
- issuingBody: string (e.g., "BACB", "NC Medical Board", "American Red Cross")
- licenseNumber: string or null
- issueDate: string in YYYY-MM-DD format or null
- expirationDate: string in YYYY-MM-DD format or null
- confidence: "high" | "medium" | "low"
- notes: string (any caveats about the extraction)`;

        const result = await invokeLLM({
          model: "gemini-2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "credential_extraction",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  credentialType: { type: "string" },
                  issuingBody: { type: "string" },
                  licenseNumber: { type: ["string", "null"] },
                  issueDate: { type: ["string", "null"] },
                  expirationDate: { type: ["string", "null"] },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  notes: { type: "string" },
                },
                required: ["credentialType", "issuingBody", "licenseNumber", "issueDate", "expirationDate", "confidence", "notes"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = result.choices[0]?.message?.content;
        if (typeof content !== "string") throw new Error("AI extraction returned no content");

        return JSON.parse(content) as {
          credentialType: string;
          issuingBody: string;
          licenseNumber: string | null;
          issueDate: string | null;
          expirationDate: string | null;
          confidence: "high" | "medium" | "low";
          notes: string;
        };
      }),

    /**
     * Ask AI — internal help assistant for credential tracking questions.
     * Strictly limited to credential/compliance tracking topics.
     * Never discusses PHI, clinical notes, therapy, legal opinions, or patient data.
     */
    ask: writeProcedure
      .input(
        z.object({
          question: z.string().min(1).max(1000),
          // Optional context: pass current staff/credential summary for grounded answers
          context: z.object({
            totalStaff: z.coerce.number().optional(),
            totalCredentials: z.coerce.number().optional(),
            expiringSoon: z.coerce.number().optional(),
            expired: z.coerce.number().optional(),
          }).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // ── AI Quota enforcement ──────────────────────────────
        const user = ctx.user;
        const plan = (user as any).plan ?? "starter";
        const accountStatus = (user as any).accountStatus ?? "active";
        const usage = await getAiUsage(user.id, plan, accountStatus);
        if (usage.questionCount >= usage.limit) {
          const resetMsg = usage.resetDate
            ? `Your limit resets on ${new Date(usage.resetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
            : "Your trial AI question limit has been reached.";
          // Send upgrade email only when user first hits the limit (exactly at limit, not every subsequent attempt)
          if (usage.questionCount === usage.limit) {
            const fullUser = await getUserById(user.id);
            if (fullUser?.email) {
              sendAiQuotaUpgradeEmail({
                agencyEmail: fullUser.email,
                agencyName: fullUser.agencyName ?? null,
                plan,
                used: usage.questionCount,
                limit: usage.limit,
                resetDate: usage.resetDate,
              }).catch(() => {}); // fire-and-forget, don't block the error response
            }
          }
          throw new Error(`QUOTA_EXCEEDED:${resetMsg}`);
        }
        // ─────────────────────────────────────────────────────
        const systemPrompt = `You are AuditReady's internal help assistant. You help clinical directors and practice managers at small behavioral health agencies (ABA, mental health, psychology) understand credential tracking, license requirements, and audit preparation.

You are ONLY allowed to discuss:
- Staff credential and license tracking
- Credential expiration and renewal timelines
- BACB requirements (BCBA, BCaBA, RBT)
- NC state board license requirements (LCMHC, LCSW, LMFT, psychologist)
- CPR, First Aid, and training documentation requirements
- Background check and OIG/LEIE exclusion check requirements
- CARF and Joint Commission accreditation requirements for staff credentials
- How to use AuditReady features
- General best practices for credential file organization

You MUST REFUSE and redirect if asked about:
- Patient, client, or clinical information of any kind
- Therapy notes, treatment plans, or clinical documentation
- PHI (Protected Health Information)
- Medicaid billing, claims, or reimbursement
- Legal advice or compliance guarantees
- Audit appeals or regulatory defense
- Wage or employment law
- Anything unrelated to staff credential tracking

When refusing, say: "I can only help with staff credential tracking questions. For [topic], please consult [appropriate resource]."

Keep answers concise, practical, and specific to behavioral health agencies. Use plain language — your users are practice managers, not compliance lawyers.`;

        const contextNote = input.context
          ? `\n\nCurrent agency data: ${input.context.totalStaff ?? 0} staff members, ${input.context.totalCredentials ?? 0} credentials tracked, ${input.context.expiringSoon ?? 0} expiring within 90 days, ${input.context.expired ?? 0} expired.`
          : "";

        const result = await invokeLLM({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.question + contextNote },
          ],
          maxTokens: 600,
        });

        const content = result.choices[0]?.message?.content;
        if (typeof content !== "string") throw new Error("AI returned no response");
        // Increment usage count after successful response
        await incrementAiUsage(user.id, plan, accountStatus);
        return {
          answer: content,
          usage: {
            used: usage.questionCount + 1,
            limit: usage.limit,
            resetDate: usage.resetDate,
          },
        };
      }),

    getUsage: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user;
      const plan = (user as any).plan ?? "starter";
      const accountStatus = (user as any).accountStatus ?? "active";
      const usage = await getAiUsage(user.id, plan, accountStatus);
      return {
        used: usage.questionCount,
        limit: usage.limit,
        resetDate: usage.resetDate,
        plan,
      };
    }),

    /**
     * Audit Narrative Generator — generates a formatted compliance narrative
     * from live credential data. Admin must review and copy/download the output.
     * Never stores the narrative or sends it anywhere automatically.
     */
    generateNarrative: writeProcedure
      .input(
        z.object({
          auditType: z.enum(["state_board", "carf", "payer", "internal", "general"]),
          asOfDate: z.string().optional(), // YYYY-MM-DD, defaults to today
        })
      )
      .mutation(async ({ ctx, input }) => {
        // ── AI Quota enforcement (same as ai.ask) ─────────────
        const user = ctx.user;
        const plan = (user as any).plan ?? "starter";
        const accountStatus = (user as any).accountStatus ?? "active";
        const usage = await getAiUsage(user.id, plan, accountStatus);
        if (usage.questionCount >= usage.limit) {
          const resetMsg = usage.resetDate
            ? `Your limit resets on ${new Date(usage.resetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
            : "Your trial AI question limit has been reached.";
          throw new Error(`QUOTA_EXCEEDED:${resetMsg}`);
        }
        // ─────────────────────────────────────────────────────
        const userId = ctx.user.id;
        const agencyName = (ctx.user as any).agencyName || "Your Agency";

        // Fetch live data
        const [staffList, allCredentials] = await Promise.all([
          getStaffByUserId(userId),
          getAllCredentialsByUserId(userId),
        ]);

        const asOfDate = input.asOfDate ?? new Date().toISOString().slice(0, 10);
        const today = new Date(asOfDate + "T00:00:00");

        // Build summary stats
        const totalStaff = staffList.length;
        const activeStaff = staffList.filter((s: any) => s.status !== "inactive").length;
        const totalCreds = allCredentials.length;
        const currentCreds = allCredentials.filter((c: any) => c.status === "current").length;
        const expiringSoon = allCredentials.filter((c: any) => c.status === "expiring_soon").length;
        const expired = allCredentials.filter((c: any) => c.status === "expired").length;
        const verified = allCredentials.filter((c: any) => c.verificationStatus === "verified").length;

        // Build per-staff credential summary (no PHI, staff credentials only)
        const staffMap: Record<number, { name: string; role: string | null; creds: Array<{ type: string; status: string; expirationDate: string | null; verificationStatus: string }> }> = {};
        for (const s of staffList as any[]) {
          staffMap[s.id] = { name: `${s.firstName} ${s.lastName}`, role: s.role ?? null, creds: [] };
        }
        for (const c of allCredentials as any[]) {
          if (staffMap[c.staffId]) {
            staffMap[c.staffId].creds.push({
              type: c.type,
              status: c.status,
              expirationDate: c.expirationDate ?? null,
              verificationStatus: c.verificationStatus,
            });
          }
        }

        const staffSummaries = Object.values(staffMap).map((s: any) => {
          const credLines = s.creds.map((c: any) => {
            const expiry = c.expirationDate ? ` (expires ${c.expirationDate})` : "";
            const verif = c.verificationStatus === "verified" ? " [Verified]" : c.verificationStatus === "needs_review" ? " [Needs Review]" : "";
            return `  - ${c.type}${expiry}${verif} — ${c.status.replace("_", " ")}`;
          }).join("\n");
          return `${s.name}${s.role ? ` (${s.role})` : ""}:\n${credLines || "  - No credentials on file"}`;
        }).join("\n\n");

        const auditTypeLabels: Record<string, string> = {
          state_board: "state board survey",
          carf: "CARF accreditation review",
          payer: "payer credentialing audit",
          internal: "internal compliance review",
          general: "compliance audit",
        };
        const auditLabel = auditTypeLabels[input.auditType] ?? "compliance audit";

        const systemPrompt = `You are an audit narrative assistant for behavioral health agencies. Your job is to write clear, professional compliance narrative summaries for agency administrators preparing for audits.

You MUST:
- Write in formal, professional prose suitable for submission to a state board, accreditation body, or payer
- Base the narrative ONLY on the data provided — never invent credentials, dates, or staff names
- Include a summary of overall compliance posture, staff credential status, and any areas requiring attention
- Note expired or expiring-soon credentials clearly but without alarmist language
- End with a standard disclaimer that this is an administrative summary only

You MUST NOT:
- Mention patient names, client information, clinical notes, or PHI
- Provide legal advice or compliance guarantees
- Make statements about Medicaid eligibility, billing, or payer decisions
- Invent any information not present in the data`;

        const userPrompt = `Generate a compliance narrative for ${agencyName} as of ${asOfDate} for a ${auditLabel}.

Agency summary:
- Total staff: ${totalStaff} (${activeStaff} active)
- Total credentials tracked: ${totalCreds}
- Current: ${currentCreds} | Expiring soon: ${expiringSoon} | Expired: ${expired}
- Verified by admin: ${verified}

Staff credential detail:
${staffSummaries}

Write a 3-5 paragraph narrative suitable for inclusion in an audit response package. Use formal prose. End with a one-sentence disclaimer.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          maxTokens: 1200,
        });

                const content = result.choices[0]?.message?.content;
        if (typeof content !== "string") throw new Error("AI returned no narrative");
        // Increment quota after successful generation
        await incrementAiUsage(user.id, plan, accountStatus);
        return {
          narrative: content,
          generatedAt: new Date().toISOString(),
          asOfDate,
          agencyName,
          auditType: input.auditType,
          stats: { totalStaff, activeStaff, totalCreds, currentCreds, expiringSoon, expired, verified },
          usage: { used: usage.questionCount + 1, limit: usage.limit, resetDate: usage.resetDate },
        };
      }),

    getAllUsage: adminProcedure.query(async () => {
      // Returns AI usage for all users — for admin overview in AdminLeads
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select({
          userId: aiUsage.userId,
          questionCount: aiUsage.questionCount,
          resetDate: aiUsage.resetDate,
          plan: aiUsage.plan,
          agencyName: users.agencyName,
          email: users.email,
        })
        .from(aiUsage)
        .leftJoin(users, eq(aiUsage.userId, users.id));
      // Attach limit based on plan
      const PLAN_LIMITS: Record<string, number> = { pilot: 10, starter: 25, growth: 75, enterprise: 150 };
      return rows.map(r => ({ ...r, limit: PLAN_LIMITS[r.plan ?? "starter"] ?? 25 }));
    }),
  }),
  settings: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getUserProfile(ctx.user.id);
      if (!profile) throw new Error("Profile not found");
      return profile;
    }),

    updateProfile: writeProcedure
      .input(z.object({
        name: z.string().min(1).max(200).optional(),
        phone: z.string().max(20).nullable().optional(),
        agencyName: z.string().max(255).nullable().optional(),
        agencyAddress: z.string().max(500).nullable().optional(),
        agencyCity: z.string().max(100).nullable().optional(),
        agencyState: z.string().max(50).nullable().optional(),
        agencyZip: z.string().max(20).nullable().optional(),
        agencyTaxId: z.string().max(20).nullable().optional(),
        agencyType: z.string().max(100).nullable().optional(),
        contactEmail: z.string().email().max(320).nullable().optional(),
        billingContactName: z.string().max(255).nullable().optional(),
        billingContactEmail: z.string().email().max(320).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, {
          name: input.name,
          phone: input.phone,
          agencyName: input.agencyName,
          agencyAddress: input.agencyAddress,
          agencyCity: input.agencyCity,
          agencyState: input.agencyState,
          agencyZip: input.agencyZip,
          agencyTaxId: input.agencyTaxId,
          agencyType: input.agencyType,
          contactEmail: input.contactEmail,
          billingContactName: input.billingContactName,
          billingContactEmail: input.billingContactEmail,
        });
        return { success: true };
      }),

    updateNotificationPreferences: writeProcedure
      .input(z.object({
        remind90: z.boolean(),
        remind60: z.boolean(),
        remind30: z.boolean(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),
  }),
  importLogs: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getImportLogs(ctx.user.id);
    }),
  }),

  verification: router({
    /**
     * Run one or more national source checks for a staff member.
     * Never auto-sets status to "verified" — always requires admin approval.
     */
    runCheck: writeProcedure
      .input(
        z.object({
          staffId: z.number(),
          credentialId: z.number().optional(),
          sources: z.array(z.enum(["bacb", "oig_leie", "npi", "sam_gov"])),
          firstName: z.string().min(1),
          lastName: z.string().min(1),
          licenseNumber: z.string().optional(),
          npiNumber: z.string().optional(),
          state: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Verify staff belongs to this user
        const staffMember = await getStaffById(input.staffId, ctx.user.id);
        if (!staffMember) {
          throw new Error("Staff member not found");
        }

        const results = await runVerificationChecks(
          input.firstName,
          input.lastName,
          input.sources as VerificationSource[],
          input.licenseNumber ?? undefined,
          input.npiNumber ?? undefined,
          input.state ?? undefined
        );

        const savedIds: number[] = [];
        for (const result of results) {
          const id = await createVerificationCheck({
            userId: ctx.user.id,
            staffId: input.staffId,
            credentialId: input.credentialId ?? null,
            source: result.source,
            queryFirstName: input.firstName,
            queryLastName: input.lastName,
            queryLicenseNumber: input.licenseNumber ?? null,
            rawResult: JSON.stringify(result.records),
            matchCount: result.matchCount,
            status: result.suggestedStatus,
            checkedAt: new Date(),
          });
          savedIds.push(id);

          // Audit log
          await createAuditLogEntry({
            userId: ctx.user.id,
            entityType: "staff",
            entityId: input.staffId,
            action: "verify",
            changedBy: ctx.user.name ?? ctx.user.email ?? "unknown",
            summary: `Verification check run via ${result.source.toUpperCase()} — result: ${result.suggestedStatus} (${result.matchCount} match${result.matchCount !== 1 ? "es" : ""}${result.error ? ", error: " + result.error : ""})`,
          });
        }

        return { results, savedIds };
      }),

    /**
     * Admin approves a verification check — sets status to "verified".
     * This is the only way to mark a check as verified.
     */
    approve: adminProcedure
      .input(
        z.object({
          checkId: z.number(),
          reviewNote: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const check = await getVerificationCheckById(input.checkId, ctx.user.id);
        if (!check) throw new Error("Verification check not found");

        await updateVerificationCheckStatus(
          input.checkId,
          "verified",
          ctx.user.name ?? ctx.user.email ?? "unknown",
          input.reviewNote
        );

        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "staff",
          entityId: check.staffId,
          action: "verify",
          changedBy: ctx.user.name ?? ctx.user.email ?? "unknown",
          summary: `Verification check APPROVED by admin — source: ${check.source.toUpperCase()}${input.reviewNote ? ", note: " + input.reviewNote : ""}`,
        });

        return { success: true };
      }),

    /**
     * Admin flags a check for further review — sets status to "needs_review".
     */
    flag: adminProcedure
      .input(
        z.object({
          checkId: z.number(),
          reviewNote: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const check = await getVerificationCheckById(input.checkId, ctx.user.id);
        if (!check) throw new Error("Verification check not found");

        await updateVerificationCheckStatus(
          input.checkId,
          "needs_review",
          ctx.user.name ?? ctx.user.email ?? "unknown",
          input.reviewNote
        );

        await createAuditLogEntry({
          userId: ctx.user.id,
          entityType: "staff",
          entityId: check.staffId,
          action: "verify",
          changedBy: ctx.user.name ?? ctx.user.email ?? "unknown",
          summary: `Verification check flagged for NEEDS REVIEW by admin — source: ${check.source.toUpperCase()}${input.reviewNote ? ", note: " + input.reviewNote : ""}`,
        });

        return { success: true };
      }),

    /**
     * List all verification checks for a staff member.
     */
    listForStaff: protectedProcedure
      .input(z.object({ staffId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getVerificationChecksByStaff(input.staffId, ctx.user.id);
      }),

    /**
     * Returns the most recent checkedAt timestamp for each staff member.
     * Used to show a "Last Verified" column on the Verification Checks landing page.
     */
    lastVerifiedPerStaff: protectedProcedure.query(async ({ ctx }) => {
      return getLatestVerificationCheckPerStaff(ctx.user.id);
    }),
  }),

  credentialing: router({
    listProviders: protectedProcedure.query(async ({ ctx }) => {
      return getProvidersByUserId(ctx.user.id);
    }),

    getProvider: protectedProcedure
      .input(z.object({ providerId: z.number() }))
      .query(async ({ ctx, input }) => {
        const provider = await getProviderById(input.providerId, ctx.user.id);
        if (!provider) throw new Error("Provider not found");
        return provider;
      }),

    createProvider: writeProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.string().optional(),
        npi: z.string().optional(),
        caqhId: z.string().optional(),
        licenseType: z.string().optional(),
        licenseNumber: z.string().optional(),
        licenseExpirationDate: z.string().optional(),
        malpracticeInsuranceExpiration: z.string().optional(),
        cprFirstAidExpiration: z.string().optional(),
        backgroundCheckDate: z.string().optional(),
        requiredTrainings: z.string().optional(),
        oigCheckDate: z.string().optional(),
        recredentialingDueDate: z.string().optional(),
        documentLocationType: z.enum(["none","paper","google_drive","dropbox","sharepoint","hr_system","ehr_system","other"]).optional(),
        documentLocationNote: z.string().optional(),
        verifiedBy: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createProvider({ ...input, userId: ctx.user.id });
        return { id };
      }),

    updateProvider: writeProcedure
      .input(z.object({
        providerId: z.number(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        role: z.string().optional(),
        npi: z.string().optional(),
        caqhId: z.string().optional(),
        licenseType: z.string().optional(),
        licenseNumber: z.string().optional(),
        licenseExpirationDate: z.string().optional(),
        malpracticeInsuranceExpiration: z.string().optional(),
        cprFirstAidExpiration: z.string().optional(),
        backgroundCheckDate: z.string().optional(),
        requiredTrainings: z.string().optional(),
        oigCheckDate: z.string().optional(),
        recredentialingDueDate: z.string().optional(),
        documentLocationType: z.enum(["none","paper","google_drive","dropbox","sharepoint","hr_system","ehr_system","other"]).optional(),
        documentLocationNote: z.string().optional(),
        verifiedBy: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { providerId, ...data } = input;
        await updateProvider(providerId, ctx.user.id, data);
        return { success: true };
      }),

    deleteProvider: writeProcedure
      .input(z.object({ providerId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteProvider(input.providerId, ctx.user.id);
        return { success: true };
      }),

    listPayerStatuses: protectedProcedure
      .input(z.object({ providerId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getPayerStatusesForProvider(input.providerId, ctx.user.id);
      }),

    upsertPayerStatus: writeProcedure
      .input(z.object({
        providerId: z.number(),
        payerName: z.enum(["bcbs","aetna","cigna","uhc_optum","medicaid","tricare","other"]),
        payerDisplayName: z.string().optional(),
        status: z.enum(["not_started","submitted","in_review","approved","needs_update","expired"]),
        submittedAt: z.string().optional(),
        approvedAt: z.string().optional(),
        expiresAt: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertPayerStatus({ ...input, userId: ctx.user.id });
        return { success: true };
      }),

    deletePayerStatus: writeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deletePayerStatus(input.id, ctx.user.id);
        return { success: true };
      }),

    dashboardStats: protectedProcedure.query(async ({ ctx }) => {
      return getCredentialingDashboardStats(ctx.user.id);
    }),
  }),

  pilot: router({
    signup: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        agencyName: z.string().min(1).max(255),
        agencySize: z.string().optional(),
        plan: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createPilotSignup(input);
        // Fire-and-forget owner notification
        sendOwnerDemoNotification({
          name: input.name,
          email: input.email,
          agencyName: input.agencyName,
          agencySize: input.agencySize,
          message: `14-day pilot signup${input.plan ? ` — ${input.plan} plan` : ''}`,
        }).catch(err => console.error("[pilot] Owner notification failed:", err));
        return { success: true };
      }),

    list: adminProcedure.query(async () => {
      return listPilotSignups();
    }),

    listAll: adminProcedure.query(async () => {
      return listAllPilots();
    }),

    activate: adminProcedure
      .input(z.object({
        pilotSignupId: z.number(),
        userEmail: z.string().email(),
        userName: z.string(),
        agencyName: z.string(),
      }))
      .mutation(async ({ input }) => {
        await activatePilot(input.pilotSignupId, input.userEmail);
        // Send activation email to the agency
        await sendPilotActivationEmail({
          toEmail: input.userEmail,
          name: input.userName,
          agencyName: input.agencyName,
        }).catch(err => console.error("[pilot] Activation email failed:", err));
        return { success: true };
      }),

    reject: adminProcedure
      .input(z.object({ pilotSignupId: z.number() }))
      .mutation(async ({ input }) => {
        await rejectPilot(input.pilotSignupId);
        return { success: true };
      }),
  }),

  account: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id) as any;
      return {
        accountStatus: (user?.accountStatus ?? "pending") as string,
        plan: (user?.plan ?? "starter") as string,
        stripeSubscriptionId: (user?.stripeSubscriptionId ?? null) as string | null,
        pilotActivatedAt: (user?.pilotActivatedAt ?? null) as Date | null,
        pilotExpiresAt: (user?.pilotExpiresAt ?? null) as Date | null,
        gracePeriodEndsAt: (user?.gracePeriodEndsAt ?? null) as Date | null,
        subscribedAt: (user?.subscribedAt ?? null) as Date | null,
        cancelledAt: (user?.cancelledAt ?? null) as Date | null,
        deletionRequestedAt: (user?.deletionRequestedAt ?? null) as Date | null,
      };
    }),
    /**
     * Submit an account deletion request (GDPR/CCPA).
     * Sets deletionRequestedAt timestamp, saves optional reason, and notifies the owner.
     * Does NOT delete data immediately — owner reviews and processes manually.
     */
    requestDeletion: writeProcedure
      .input(z.object({
        reason: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
        // Prevent duplicate requests
        const existing = await getUserById(ctx.user.id) as any;
        if (existing?.deletionRequestedAt) {
          return { success: true, alreadyRequested: true };
        }
        const now = new Date();
        await db.update(users)
          .set({
            deletionRequestedAt: now,
            deletionReason: input.reason ?? null,
          })
          .where(eq(users.id, ctx.user.id));
        // Notify owner
        const user = ctx.user as any;
        sendOwnerDemoNotification({
          name: user.name ?? "Unknown",
          email: user.email ?? "unknown",
          agencyName: user.agencyName ?? "Unknown Agency",
          agencySize: "",
          message: `ACCOUNT DELETION REQUEST\n\nAgency: ${user.agencyName ?? "Unknown"}\nEmail: ${user.email ?? "unknown"}\nReason: ${input.reason ?? "(no reason provided)"}\n\nPlease review and process this deletion request within 30 days per GDPR/CCPA requirements.`,
        }).catch(err => console.error("[deletion] Owner notification failed:", err));
        // Confirmation email to the requesting user
        if (user.email) {
          sendDeletionRequestConfirmationEmail({
            toEmail: user.email,
            name: user.name ?? null,
            agencyName: user.agencyName ?? null,
            requestedAt: now,
          }).catch(err => console.error("[deletion] User confirmation email failed:", err));
        }
        return { success: true, alreadyRequested: false };
      }),
  }),
  notifications: router({
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationPreferences(ctx.user.id);
    }),
    updatePreferences: writeProcedure
      .input(z.object({
        emailEnabled: z.boolean().optional(),
        credentialReminderDays: z.union([z.literal(7), z.literal(30), z.literal(60), z.literal(90)]).optional(),
        billingNotifications: z.boolean().optional(),
        repCommissionAlerts: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertNotificationPreferences(ctx.user.id, input);
        return { success: true };
      }),
    getLogs: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(500).optional() }))
      .query(async ({ input }) => {
        return getNotificationLogs(input.limit ?? 200);
      }),
  }),

  contact: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        subject: z.string().min(1).max(255),
        message: z.string().min(1).max(2000),
        _hp: z.string().max(0).optional(), // honeypot — must be empty
      }))
      .mutation(async ({ input, ctx }) => {
        // Honeypot: silently reject if filled (bot)
        if (input._hp) return { success: true };
        // Rate limit: max 3 submissions per IP per hour (stored in memory)
        const ip = (ctx as any).req?.ip ?? (ctx as any).req?.socket?.remoteAddress ?? "unknown";
        const now = Date.now();
        const windowMs = 60 * 60 * 1000; // 1 hour
        const maxPerWindow = 3;
        if (!contactRateMap.has(ip)) contactRateMap.set(ip, []);
        const timestamps = contactRateMap.get(ip)!.filter((t: number) => now - t < windowMs);
        if (timestamps.length >= maxPerWindow) {
          throw new Error("Too many submissions. Please try again later.");
        }
        timestamps.push(now);
        contactRateMap.set(ip, timestamps);
        // Persist to DB
        await createContactSubmission(input);
        // Fire-and-forget owner notification
        sendContactFormEmail(input).catch(err =>
          console.error("[contact] Notification failed:", err)
        );
        return { success: true };
      }),

    list: adminProcedure.query(async () => listContactSubmissions(200)),

    updateStatus: adminProcedure
      .input(z.object({
        id: z.number().int().positive(),
        status: z.enum(["new", "read", "replied", "archived"]),
      }))
      .mutation(async ({ input }) => {
        await updateContactSubmissionStatus(input.id, input.status);
        return { success: true };
      }),

    countNew: adminProcedure.query(async () => countNewContactSubmissions()),
  }),

  demo: router({
    request: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        agencyName: z.string().min(1).max(255),
        agencySize: z.string().optional(),
        message: z.string().max(1000).optional(),
        subscribeToUpdates: z.boolean().optional().default(false),
      }))
      .mutation(async ({ input }) => {
        await createDemoRequest(input);
        // Fire-and-forget owner notification — don't block the response
        sendOwnerDemoNotification(input).catch(err =>
          console.error("[demo] Owner notification failed:", err)
        );
        // Fire-and-forget confirmation email to the requester
        sendDemoConfirmationEmail({
          toEmail: input.email,
          name: input.name,
          agencyName: input.agencyName,
        }).catch(err =>
          console.error("[demo] Requester confirmation email failed:", err)
        );
        // Add to Resend audience if opted in
        if (input.subscribeToUpdates && process.env.RESEND_API_KEY) {
          const nameParts = input.name.trim().split(" ");
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || "";
          fetch(`https://api.resend.com/audiences/06347b77-9fe6-4539-ac22-753d479a9532/contacts`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: input.email,
              first_name: firstName,
              last_name: lastName,
              unsubscribed: false,
            }),
          }).catch(err => console.error("[demo] Resend audience add failed:", err));
        }
        return { success: true };
      }),

    list: adminProcedure.query(async () => {
      return listDemoRequests();
    }),
  }),

  // ── Note Compliance Logs ─────────────────────────────────────────────────────
  notes: router({
    /**
     * List all note logs for the current agency, joined with staff names.
     */
    list: protectedProcedure.query(async ({ ctx }) => {
      return getNoteLogsByUserId(ctx.user.id);
    }),

    /**
     * List note logs for a specific staff member.
     */
    listByStaff: protectedProcedure
      .input(z.object({ staffId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getNoteLogsByStaffId(input.staffId, ctx.user.id);
      }),

    /**
     * Upsert a note log entry for a staff member for a given week.
     * weekOf must be the ISO date string of the Monday of the week (YYYY-MM-DD).
     * Bug 3 fix: notesPending is clamped to sessionsHeld on the server side.
     */
    upsert: writeProcedure
      .input(z.object({
        staffId: z.number(),
        weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "weekOf must be YYYY-MM-DD"),
        sessionsHeld: z.number().int().min(0),
        notesCompleted: z.number().int().min(0),
        notesPending: z.number().int().min(0),
        notesLate: z.number().int().min(0),
        supervisorReviewed: z.boolean().default(false),
        reviewedAt: z.date().optional(),
        reviewerName: z.string().max(255).optional(),
        notes: z.string().max(2000).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Bug 3 fix: clamp notesPending so it never exceeds sessionsHeld
        const clampedPending = Math.min(input.notesPending, input.sessionsHeld);
        const id = await upsertNoteLog({
          userId: ctx.user.id,
          staffId: input.staffId,
          weekOf: input.weekOf,
          sessionsHeld: input.sessionsHeld,
          notesCompleted: input.notesCompleted,
          notesPending: clampedPending,
          notesLate: input.notesLate,
          supervisorReviewed: input.supervisorReviewed,
          reviewedAt: input.reviewedAt ?? null,
          reviewerName: input.reviewerName ?? null,
          notes: input.notes ?? null,
        });
        return { id };
      }),

    /**
     * Delete a note log entry.
     */
    delete: writeProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteNoteLog(input.id, ctx.user.id);
        return { success: true };
      }),

    /**
     * Export note logs as CSV.
     * Bug 1 fix: uses tRPC query with enabled:false + refetch() pattern — no raw fetch().
     * Bug 3 fix: timeliness % is computed server-side with safe math (no div-by-zero).
     */
    exportCsv: protectedProcedure.query(async ({ ctx }) => {
      const logs = await getNoteLogsByUserId(ctx.user.id);
      const headers = [
        "Staff Name", "Role", "Week Of",
        "Sessions Held", "Notes Completed", "Notes Pending", "Notes Late",
        "Timeliness %", "Supervisor Reviewed", "Reviewed At", "Reviewer", "Admin Notes",
      ];
      const escapeCsv = (val: string) => {
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };
      const rows = logs.map(log => {
        const staffName = `${log.staffFirstName} ${log.staffLastName}`;
        // Bug 3 fix: safe timeliness math — guard against div-by-zero and negative values
        const sessionsHeld = log.sessionsHeld ?? 0;
        const notesPending = Math.min(log.notesPending ?? 0, sessionsHeld); // clamp
        const timeliness = sessionsHeld > 0
          ? Math.max(0, Math.round(((sessionsHeld - notesPending) / sessionsHeld) * 100))
          : 100; // 100% if no sessions held
        return [
          staffName,
          log.staffRole ?? "",
          log.weekOf,
          String(sessionsHeld),
          String(log.notesCompleted ?? 0),
          String(notesPending),
          String(log.notesLate ?? 0),
          `${timeliness}%`,
          log.supervisorReviewed ? "Yes" : "No",
          log.reviewedAt ? new Date(log.reviewedAt).toISOString().slice(0, 10) : "",
          log.reviewerName ?? "",
          log.notes ?? "",
        ];
      });
      const csv = [headers.map(escapeCsv).join(","), ...rows.map(r => r.map(escapeCsv).join(","))].join("\n");
      return { csv, filename: `auditready-note-compliance-${new Date().toISOString().slice(0, 10)}.csv` };
    }),
  }),

  // ── Admin Dev Tools ──────────────────────────────────────────────────────────
  devTools: router({
    /**
     * Backdate a user's pilotActivatedAt to simulate being N days into the pilot.
     * Admin-only. Used to test the pilot lifecycle job end-to-end.
     */
    backdatePilot: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        daysAgo: z.number().int().min(1).max(30),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const backdatedDate = new Date(Date.now() - input.daysAgo * 24 * 60 * 60 * 1000);
        await db.update(users)
          .set({ pilotActivatedAt: backdatedDate } as any)
          .where(eq(users.id, input.userId));
        return { success: true, userId: input.userId, pilotActivatedAt: backdatedDate.toISOString() };
      }),

    /**
     * Run a scheduled job immediately (without cron auth).
     * Admin-only. Delegates to the same runJob logic in systemRouter.
     */
    runJob: adminProcedure
      .input(z.object({
        jobName: z.enum([
          "auditready-pilot-lifecycle",
          "auditready-credential-reminders",
          "auditready-retention-cleanup",
          "auditready-privacy-policy-review",
          "auditready-deletion-deadline-alert",
        ]),
      }))
      .mutation(async ({ input }) => {
        const { runPilotLifecycle } = await import("./scheduledPilotLifecycle");
        const { runCredentialReminders } = await import("./scheduledReminders");
        const { runRetentionCleanup } = await import("./scheduledRetentionCleanup");
        const { runPrivacyPolicyReview } = await import("./scheduledPrivacyPolicyReview");
        const { runDeletionDeadlineAlert } = await import("./scheduledDeletionDeadlineAlert");
        const startedAt = new Date().toISOString();
        let result: Record<string, unknown>;
        if (input.jobName === "auditready-pilot-lifecycle") {
          result = await runPilotLifecycle() as Record<string, unknown>;
        } else if (input.jobName === "auditready-credential-reminders") {
          result = await runCredentialReminders() as Record<string, unknown>;
        } else if (input.jobName === "auditready-retention-cleanup") {
          result = await runRetentionCleanup() as Record<string, unknown>;
        } else if (input.jobName === "auditready-deletion-deadline-alert") {
          result = await runDeletionDeadlineAlert() as Record<string, unknown>;
        } else {
          result = await runPrivacyPolicyReview() as Record<string, unknown>;
        }
        return { ok: true, jobName: input.jobName, startedAt, completedAt: new Date().toISOString(), result };
      }),

    /**
     * List all pending account deletion requests.
     * Admin-only. Returns users who have submitted a deletion request.
     */
    listDeletionRequests: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      const result = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        agencyName: users.agencyName,
        deletionRequestedAt: users.deletionRequestedAt,
        deletionReason: users.deletionReason,
        deletionAdminNotes: users.deletionAdminNotes,
        accountStatus: users.accountStatus,
        plan: users.plan,
        createdAt: users.createdAt,
      }).from(users)
        .where(isNotNull(users.deletionRequestedAt))
        .orderBy(users.deletionRequestedAt);
      return result;
    }),

    /**
     * Save internal admin notes on a deletion request.
     * Notes are visible only to admins and never sent to the user.
     */
    updateDeletionNotes: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        notes: z.string().max(2000),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
        await db.update(users)
          .set({ deletionAdminNotes: input.notes || null })
          .where(eq(users.id, input.userId));
        return { success: true };
      }),

    /**
     * Process (complete) an account deletion request.
     * Deletes all user data, sends confirmation email to the user, and removes the user record.
     * Admin-only. This is irreversible.
     */
    processDeletion: adminProcedure
      .input(z.object({
        userId: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
        // Fetch user before deletion for email
        const [targetUser] = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          agencyName: users.agencyName,
          deletionRequestedAt: users.deletionRequestedAt,
        }).from(users).where(eq(users.id, input.userId)).limit(1);
        if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
        if (!targetUser.deletionRequestedAt) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No deletion request found for this user' });
        // Delete all user data in order (child tables first)
        const { staff: staffTable } = await import('../drizzle/schema');
        const { credentials: credTable } = await import('../drizzle/schema');
        const { auditLog: auditLogTable } = await import('../drizzle/schema');
        const { emailReminders: emailRemindersTable } = await import('../drizzle/schema');
        const { notificationPreferences: notifPrefsTable } = await import('../drizzle/schema');
        // Get staff IDs for this user (needed to delete credentials)
        const userStaff = await db.select({ id: staffTable.id }).from(staffTable).where(eq(staffTable.userId, input.userId));
        const staffIds = userStaff.map(s => s.id);
        // Delete credentials for all staff
        if (staffIds.length > 0) {
          const { inArray } = await import('drizzle-orm');
          await db.delete(credTable).where(inArray(credTable.staffId, staffIds));
        }
        // Delete staff
        await db.delete(staffTable).where(eq(staffTable.userId, input.userId));
        // Delete email reminders
        await db.delete(emailRemindersTable).where(eq(emailRemindersTable.userId, input.userId));
        // Delete notification preferences
        await db.delete(notifPrefsTable).where(eq(notifPrefsTable.userId, input.userId));
        // Delete audit log entries for this user
        await db.delete(auditLogTable).where(eq(auditLogTable.userId, input.userId));
        // Finally delete the user record
        await db.delete(users).where(eq(users.id, input.userId));
        // Send confirmation email to the user
        if (targetUser.email) {
          sendDeletionCompletedEmail({
            toEmail: targetUser.email,
            name: targetUser.name ?? null,
            agencyName: targetUser.agencyName ?? null,
          }).catch(err => console.error('[deletion] Completed email failed:', err));
        }
        return { success: true, userId: input.userId, email: targetUser.email };
      }),

    /**
     * List all agencies with their pilot status for the test tool.
     */
    listAgencies: adminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const result = await db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        agencyName: users.agencyName,
        pilotActivatedAt: users.pilotActivatedAt,
        accountStatus: users.accountStatus,
      }).from(users).orderBy(users.id);
      return result;
    }),
  }),
});
export type AppRouter = typeof appRouter;
