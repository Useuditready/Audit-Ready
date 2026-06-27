/**
 * rep router — Sales Rep Code validation, management, and commission tracking.
 *
 * Public:
 *   rep.validateCode   — validate a rep code before checkout (returns rep name or error)
 *
 * Admin-only (enforced at middleware level via adminProcedure):
 *   rep.list           — list all sales reps
 *   rep.create         — create a new sales rep with a unique code
 *   rep.listCommissions — list all commission records with rep + agency info
 *   rep.markCommissionPaid — mark a commission as paid
 *   rep.salesReport    — summary: direct vs rep signups, setup fee revenue, commissions owed/paid
 */
import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  getSalesRepByCode,
  getAllSalesReps,
  createSalesRep,
  getAllCommissions,
  markCommissionPaid,
  getAcquisitionReport,
} from "../db";

export const repRouter = router({
  /**
   * Validate a rep code entered by an agency at checkout.
   * Returns { valid: true, repName } or { valid: false, message }.
   * Public — no auth required (called before login).
   */
  validateCode: publicProcedure
    .input(z.object({ code: z.string().min(1).max(32) }))
    .query(async ({ input }) => {
      const rep = await getSalesRepByCode(input.code.trim());
      if (!rep) {
        return { valid: false as const, message: "Code not found. You can continue without a rep code or check with your representative." };
      }
      return { valid: true as const, repName: rep.name, repId: rep.id };
    }),

  /**
   * List all sales reps. Admin only.
   */
  list: adminProcedure.query(async () => {
    return getAllSalesReps();
  }),

  /**
   * Create a new sales rep. Admin only.
   */
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      email: z.string().email(),
      code: z.string().min(2).max(32).regex(/^[A-Z0-9\-]+$/i, "Code must be letters, numbers, and hyphens only"),
      notes: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const id = await createSalesRep({
          name: input.name,
          email: input.email,
          code: input.code.toUpperCase(),
          notes: input.notes,
        });
        return { id };
      } catch (err: any) {
        // Duplicate code constraint
        if (err?.code === "ER_DUP_ENTRY" || String(err?.message).includes("Duplicate")) {
          throw new TRPCError({ code: "CONFLICT", message: `Rep code "${input.code.toUpperCase()}" is already in use. Choose a different code.` });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create sales rep." });
      }
    }),

  /**
   * List all commission records with rep name and agency info. Admin only.
   */
  listCommissions: adminProcedure.query(async () => {
    return getAllCommissions();
  }),

  /**
   * Mark a commission as paid. Admin only.
   */
  markCommissionPaid: adminProcedure
    .input(z.object({ commissionId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await markCommissionPaid(input.commissionId);
      return { success: true };
    }),

  /**
   * Acquisition summary report. Admin only.
   * Returns: directCount, repCount, setup fee revenue by source, commissions owed/paid.
   */
  salesReport: adminProcedure.query(async () => {
    return getAcquisitionReport();
  }),
});
