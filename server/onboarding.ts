/**
 * ABA New-Hire Onboarding Checklist DB Helpers
 * ─────────────────────────────────────────────
 * Tracks required credential documents for new ABA staff.
 * Zero PHI — staff-side only. No patient data.
 */
import { eq, and, asc } from "drizzle-orm";
import { getDb } from "./db";
import {
  onboardingChecklists,
  onboardingChecklistItems,
  type OnboardingChecklist,
  type InsertOnboardingChecklist,
  type OnboardingChecklistItem,
  type InsertOnboardingChecklistItem,
} from "../drizzle/schema";

// ── Default ABA checklist items ──────────────────────────────────────────────
// Standard required documents for ABA new hires.
// Agencies can add custom items on top of these.
export const DEFAULT_ABA_CHECKLIST_ITEMS: Omit<InsertOnboardingChecklistItem, "checklistId" | "userId" | "staffId" | "createdAt" | "updatedAt">[] = [
  // Certifications
  { itemKey: "rbt_cert", label: "RBT Certification (BACB)", category: "certification", isRequired: true, isReceived: false, sortOrder: 10 },
  { itemKey: "bcba_license", label: "BCBA / BCaBA License (if applicable)", category: "certification", isRequired: false, isReceived: false, sortOrder: 20 },
  { itemKey: "cpr_first_aid", label: "CPR / First Aid Certification", category: "certification", isRequired: true, isReceived: false, sortOrder: 30 },
  // Training
  { itemKey: "40hr_training", label: "40-Hour RBT Training Certificate", category: "training", isRequired: true, isReceived: false, sortOrder: 40 },
  { itemKey: "bloodborne_pathogens", label: "Bloodborne Pathogens Training", category: "training", isRequired: true, isReceived: false, sortOrder: 50 },
  { itemKey: "hipaa_training", label: "HIPAA / Confidentiality Training", category: "training", isRequired: true, isReceived: false, sortOrder: 60 },
  { itemKey: "crisis_prevention", label: "Crisis Prevention / Safety Training", category: "training", isRequired: false, isReceived: false, sortOrder: 70 },
  // Background checks
  { itemKey: "criminal_background", label: "Criminal Background Check", category: "background_check", isRequired: true, isReceived: false, sortOrder: 80 },
  { itemKey: "sex_offender_registry", label: "Sex Offender Registry Check", category: "background_check", isRequired: true, isReceived: false, sortOrder: 90 },
  { itemKey: "oig_exclusion", label: "OIG LEIE Exclusion Check", category: "background_check", isRequired: true, isReceived: false, sortOrder: 100 },
  // Documentation
  { itemKey: "competency_assessment", label: "RBT Competency Assessment (BACB)", category: "documentation", isRequired: true, isReceived: false, sortOrder: 110 },
  { itemKey: "supervision_agreement", label: "Supervision Agreement (signed)", category: "documentation", isRequired: true, isReceived: false, sortOrder: 120 },
  { itemKey: "renewal_attestation", label: "Annual Renewal Attestation", category: "documentation", isRequired: false, isReceived: false, sortOrder: 130 },
];

// ── Checklists ───────────────────────────────────────────────────────────────

export async function getOnboardingChecklists(userId: number): Promise<OnboardingChecklist[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(onboardingChecklists)
    .where(eq(onboardingChecklists.userId, userId))
    .orderBy(asc(onboardingChecklists.createdAt));
}

export async function getOnboardingChecklistByStaff(userId: number, staffId: number): Promise<OnboardingChecklist | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(onboardingChecklists)
    .where(and(eq(onboardingChecklists.userId, userId), eq(onboardingChecklists.staffId, staffId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createOnboardingChecklist(
  userId: number,
  staffId: number,
  notes?: string
): Promise<{ checklistId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create the checklist
  const [result] = await db.insert(onboardingChecklists).values({
    userId,
    staffId,
    status: "in_progress",
    notes: notes ?? null,
  });
  const checklistId = result.insertId;

  // Seed with default ABA items
  const defaultItems = DEFAULT_ABA_CHECKLIST_ITEMS.map(item => ({
    ...item,
    checklistId,
    userId,
    staffId,
  }));
  await db.insert(onboardingChecklistItems).values(defaultItems);

  return { checklistId };
}

export async function deleteOnboardingChecklist(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Delete items first
  await db.delete(onboardingChecklistItems)
    .where(and(eq(onboardingChecklistItems.checklistId, id), eq(onboardingChecklistItems.userId, userId)));
  // Delete checklist
  await db.delete(onboardingChecklists)
    .where(and(eq(onboardingChecklists.id, id), eq(onboardingChecklists.userId, userId)));
}

// ── Checklist Items ──────────────────────────────────────────────────────────

export async function getChecklistItems(userId: number, checklistId: number): Promise<OnboardingChecklistItem[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(onboardingChecklistItems)
    .where(and(eq(onboardingChecklistItems.checklistId, checklistId), eq(onboardingChecklistItems.userId, userId)))
    .orderBy(asc(onboardingChecklistItems.sortOrder));
}

export async function updateChecklistItem(
  id: number,
  userId: number,
  data: Partial<Pick<OnboardingChecklistItem, "isReceived" | "receivedAt" | "expiresAt" | "documentNote">>
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(onboardingChecklistItems)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(onboardingChecklistItems.id, id), eq(onboardingChecklistItems.userId, userId)));
}

export async function addChecklistItem(data: InsertOnboardingChecklistItem): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(onboardingChecklistItems).values(data);
}

export async function deleteChecklistItem(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(onboardingChecklistItems)
    .where(and(eq(onboardingChecklistItems.id, id), eq(onboardingChecklistItems.userId, userId)));
}

// ── Auto-complete checklist when all required items are received ─────────────
export async function refreshChecklistStatus(checklistId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const items = await db.select().from(onboardingChecklistItems)
    .where(and(eq(onboardingChecklistItems.checklistId, checklistId), eq(onboardingChecklistItems.userId, userId)));

  const requiredItems = items.filter(i => i.isRequired);
  const allRequiredReceived = requiredItems.length > 0 && requiredItems.every(i => i.isReceived);

  await db.update(onboardingChecklists)
    .set({
      status: allRequiredReceived ? "complete" : "in_progress",
      completedAt: allRequiredReceived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(onboardingChecklists.id, checklistId), eq(onboardingChecklists.userId, userId)));
}
