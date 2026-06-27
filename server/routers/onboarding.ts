/**
 * ABA New-Hire Onboarding Checklist tRPC Router
 * ──────────────────────────────────────────────
 * Procedures for managing ABA new-hire onboarding checklists.
 * Tracks required credential documents per staff member.
 * Zero PHI — staff-side only.
 */
import { z } from "zod";
import { writeProcedure, router } from "../_core/trpc";
import {
  getOnboardingChecklists,
  getOnboardingChecklistByStaff,
  createOnboardingChecklist,
  deleteOnboardingChecklist,
  getChecklistItems,
  updateChecklistItem,
  addChecklistItem,
  deleteChecklistItem,
  refreshChecklistStatus,
  DEFAULT_ABA_CHECKLIST_ITEMS,
} from "../onboarding";

export const onboardingRouter = router({
  // ── List all checklists for the agency ──────────────────────
  list: writeProcedure.query(async ({ ctx }) => {
    return getOnboardingChecklists(ctx.user.id);
  }),

  // ── Get checklist for a specific staff member ───────────────
  getByStaff: writeProcedure
    .input(z.object({ staffId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return getOnboardingChecklistByStaff(ctx.user.id, input.staffId);
    }),

  // ── Create a new checklist for a staff member ───────────────
  create: writeProcedure
    .input(z.object({
      staffId: z.number().int().positive(),
      notes: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if one already exists
      const existing = await getOnboardingChecklistByStaff(ctx.user.id, input.staffId);
      if (existing) {
        throw new Error("An onboarding checklist already exists for this staff member.");
      }
      return createOnboardingChecklist(ctx.user.id, input.staffId, input.notes);
    }),

  // ── Delete a checklist ──────────────────────────────────────
  delete: writeProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await deleteOnboardingChecklist(input.id, ctx.user.id);
      return { ok: true };
    }),

  // ── Get items for a checklist ───────────────────────────────
  getItems: writeProcedure
    .input(z.object({ checklistId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return getChecklistItems(ctx.user.id, input.checklistId);
    }),

  // ── Toggle item received / not received ─────────────────────
  toggleItem: writeProcedure
    .input(z.object({
      id: z.number().int().positive(),
      checklistId: z.number().int().positive(),
      isReceived: z.boolean(),
      receivedAt: z.date().optional(),
      expiresAt: z.date().optional().nullable(),
      documentNote: z.string().max(500).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await updateChecklistItem(input.id, ctx.user.id, {
        isReceived: input.isReceived,
        receivedAt: input.isReceived ? (input.receivedAt ?? new Date()) : null,
        expiresAt: input.expiresAt ?? null,
        documentNote: input.documentNote ?? null,
      });
      // Refresh checklist completion status
      await refreshChecklistStatus(input.checklistId, ctx.user.id);
      return { ok: true };
    }),

  // ── Add a custom item to a checklist ────────────────────────
  addItem: writeProcedure
    .input(z.object({
      checklistId: z.number().int().positive(),
      staffId: z.number().int().positive(),
      itemKey: z.string().max(64),
      label: z.string().max(255),
      category: z.enum(["certification", "training", "background_check", "documentation", "insurance", "other"]),
      isRequired: z.boolean().default(true),
      expiresAt: z.date().optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await addChecklistItem({
        checklistId: input.checklistId,
        userId: ctx.user.id,
        staffId: input.staffId,
        itemKey: input.itemKey,
        label: input.label,
        category: input.category,
        isRequired: input.isRequired,
        isReceived: false,
        expiresAt: input.expiresAt ?? null,
        sortOrder: 999,
      });
      return { ok: true };
    }),

  // ── Delete a custom item ─────────────────────────────────────
  deleteItem: writeProcedure
    .input(z.object({
      id: z.number().int().positive(),
      checklistId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      await deleteChecklistItem(input.id, ctx.user.id);
      await refreshChecklistStatus(input.checklistId, ctx.user.id);
      return { ok: true };
    }),

  // ── Get default ABA checklist template ──────────────────────
  getDefaultTemplate: writeProcedure.query(async () => {
    return DEFAULT_ABA_CHECKLIST_ITEMS;
  }),
});
