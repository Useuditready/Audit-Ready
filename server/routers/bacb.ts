/**
 * BACB & Supervision tRPC Router
 * ──────────────────────────────
 * Procedures for:
 *  - BACB certification tracking (BCBA, BCaBA, RBT)
 *  - CEU continuing education records
 *  - RBT supervision ratio logs (de-identified, no PHI)
 */

import { z } from "zod";
import { adminProcedure, writeProcedure, router } from "../_core/trpc";
import {
  getBacbCertifications,
  getBacbCertificationById,
  createBacbCertification,
  updateBacbCertification,
  deleteBacbCertification,
  getCeuRecords,
  createCeuRecord,
  deleteCeuRecord,
  getSupervisionLogs,
  getSupervisionSummary,
  upsertSupervisionLog,
  deleteSupervisionLog,
  getOigBatchChecks,
  getOigBatchCheckById,
  runOigCheckForUser,
} from "../bacb";

// ── BACB Certification Procedures ────────────────────────────────

const certTypeSchema = z.enum(["bcba", "bcaba", "rbt"]);

const certStatusSchema = z.enum(["current", "expiring_soon", "expired"]);

export const bacbRouter = router({
  // List all BACB certifications for the agency (optionally filtered by staffId)
  listCertifications: adminProcedure
    .input(z.object({ staffId: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      return getBacbCertifications(ctx.user.id, input.staffId);
    }),

  // Get a single BACB certification by ID
  getCertification: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return getBacbCertificationById(input.id, ctx.user.id);
    }),

  // Create a new BACB certification record
  createCertification: writeProcedure
    .input(
      z.object({
        staffId: z.number(),
        certType: certTypeSchema,
        certNumber: z.string().max(100).optional(),
        issueDate: z.string().optional(),
        expirationDate: z.string().optional(),
        renewalCycleStartDate: z.string().optional(),
        renewalCycleEndDate: z.string().optional(),
        // CEU requirements default by cert type; can be overridden
        ceuRequired: z.number().optional(),
        ceuEthicsRequired: z.number().optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Set default CEU requirements by cert type
      const defaults = {
        bcba: { ceuRequired: 32, ceuEthicsRequired: 3 },
        bcaba: { ceuRequired: 20, ceuEthicsRequired: 1 },
        rbt: { ceuRequired: 20, ceuEthicsRequired: 1 },
      };
      const d = defaults[input.certType];

      await createBacbCertification({
        staffId: input.staffId,
        userId: ctx.user.id,
        certType: input.certType,
        certNumber: input.certNumber ?? null,
        issueDate: input.issueDate ?? null,
        expirationDate: input.expirationDate ?? null,
        renewalCycleStartDate: input.renewalCycleStartDate ?? null,
        renewalCycleEndDate: input.renewalCycleEndDate ?? null,
        ceuRequired: input.ceuRequired ?? d.ceuRequired,
        ceuCompleted: 0,
        ceuEthicsRequired: input.ceuEthicsRequired ?? d.ceuEthicsRequired,
        ceuEthicsCompleted: 0,
        status: "current",
        notes: input.notes ?? null,
      });
      return { success: true };
    }),

  // Update an existing BACB certification
  updateCertification: writeProcedure
    .input(
      z.object({
        id: z.number(),
        certType: certTypeSchema.optional(),
        certNumber: z.string().max(100).optional(),
        issueDate: z.string().optional(),
        expirationDate: z.string().optional(),
        renewalCycleStartDate: z.string().optional(),
        renewalCycleEndDate: z.string().optional(),
        ceuRequired: z.number().optional(),
        ceuEthicsRequired: z.number().optional(),
        status: certStatusSchema.optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await updateBacbCertification(id, ctx.user.id, data as any);
      return { success: true };
    }),

  // Delete a BACB certification (also deletes its CEU records)
  deleteCertification: writeProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteBacbCertification(input.id, ctx.user.id);
      return { success: true };
    }),

  // ── CEU Records ──────────────────────────────────────────────

  // List all CEU records for a specific BACB certification
  listCeuRecords: adminProcedure
    .input(z.object({ bacbCertId: z.number() }))
    .query(async ({ ctx, input }) => {
      return getCeuRecords(ctx.user.id, input.bacbCertId);
    }),

  // Add a CEU record (automatically updates totals on parent cert)
  addCeuRecord: writeProcedure
    .input(
      z.object({
        staffId: z.number(),
        bacbCertId: z.number(),
        title: z.string().max(255),
        provider: z.string().max(255).optional(),
        completedDate: z.string(),
        // hours stored as tenths*10: 15 = 1.5 hrs, 10 = 1.0 hr
        hours: z.number().int().min(1).max(1000),
        isEthics: z.boolean().default(false),
        certificateKey: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createCeuRecord({
        staffId: input.staffId,
        userId: ctx.user.id,
        bacbCertId: input.bacbCertId,
        title: input.title,
        provider: input.provider ?? null,
        completedDate: input.completedDate,
        hours: input.hours,
        isEthics: input.isEthics,
        certificateKey: input.certificateKey ?? null,
      });
      return { success: true };
    }),

  // Delete a CEU record (automatically updates totals on parent cert)
  deleteCeuRecord: writeProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteCeuRecord(input.id, ctx.user.id);
      return { success: true };
    }),

  // ── Supervision Ratio Procedures ─────────────────────────────

  // List supervision logs (optionally filtered by staffId or monthYear)
  listSupervision: adminProcedure
    .input(
      z.object({
        staffId: z.number().optional(),
        monthYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getSupervisionLogs(ctx.user.id, input.staffId, input.monthYear);
    }),

  // Get monthly compliance summary
  supervisionSummary: adminProcedure
    .input(z.object({ monthYear: z.string().regex(/^\d{4}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      return getSupervisionSummary(ctx.user.id, input.monthYear);
    }),

  // Log or update supervision hours for an RBT for a given month
  // De-identified: only staff IDs and hour counts — no client names, no session notes
  upsertSupervision: writeProcedure
    .input(
      z.object({
        staffId: z.number(),
        supervisorStaffId: z.number().optional(),
        monthYear: z.string().regex(/^\d{4}-\d{2}$/),
        totalHoursWorked: z.number().int().min(1),
        supervisionHoursLogged: z.number().int().min(0),
        notes: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await upsertSupervisionLog(ctx.user.id, {
        staffId: input.staffId,
        supervisorStaffId: input.supervisorStaffId,
        monthYear: input.monthYear,
        totalHoursWorked: input.totalHoursWorked,
        supervisionHoursLogged: input.supervisionHoursLogged,
        notes: input.notes,
      });
      return { success: true, ratioPercent: result?.ratioPercent, isCompliant: result?.isCompliant };
    }),

  // Delete a supervision log entry
  deleteSupervision: writeProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteSupervisionLog(input.id, ctx.user.id);
      return { success: true };
    }),

  // ── OIG LEIE Batch Exclusion Checks ─────────────────────────────

  // List all OIG batch check runs for this agency
  listOigChecks: adminProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(12) }))
    .query(async ({ ctx, input }) => {
      return getOigBatchChecks(ctx.user.id, input.limit);
    }),

  // Get details of a specific OIG batch check run
  getOigCheck: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return getOigBatchCheckById(input.id, ctx.user.id);
    }),

  // Manually trigger an OIG batch check for this agency
  runOigCheck: writeProcedure
    .mutation(async ({ ctx }) => {
      const result = await runOigCheckForUser(ctx.user.id);
      return result;
    }),
});
