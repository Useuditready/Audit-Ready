/**
 * AuditReady — Shared Design Tokens
 * ──────────────────────────────────
 * Single source of truth for all inline-styled pages.
 * Import as: import { C, spacing, radius } from "@/lib/design";
 *
 * These values mirror the CSS variables in index.css.
 * When updating colors, update BOTH this file AND index.css.
 */

export const C = {
  // ── Light section palette ──────────────────────────────────
  paper:        "#FFFFFF",
  paperDark:    "#F4F6F4",
  paperDeeper:  "#E8EDE8",
  tab:          "#EDF2ED",
  rule:         "#E5E7EB",
  ruleDark:     "#C0CEC0",

  // ── Ink palette ───────────────────────────────────────────
  ink:          "#0A0F0A",
  inkMid:       "#1E2A1E",
  inkLight:     "#374151",
  inkFaint:     "#6B7D6B",
  inkGhost:     "#9BAA9B",

  // ── Primary accent (forest green) ─────────────────────────
  forest:       "#3A8C5C",
  forestDark:   "#2D7A4F",
  forestBg:     "#DCFCE7",
  forestMid:    "#2A5240",

  // ── Status colors ─────────────────────────────────────────
  stampRed:     "#DC2626",
  stampRedBg:   "#FEE2E2",
  amber:        "#D97706",
  amberBg:      "#FEF3C7",
  amberLight:   "#F59E0B",

  // ── Dark section palette (hero, dark bands) ───────────────
  darkBg:       "#0F2318",
  darkBgMid:    "#162B1C",
  darkBgLight:  "#1E3A28",
  darkRule:     "rgba(255,255,255,0.08)",
  darkText:     "#F0EBE3",
  darkTextMid:  "rgba(240,235,227,0.70)",
  darkTextFaint:"rgba(240,235,227,0.40)",

  // ── Typography ────────────────────────────────────────────
  display:      "'DM Serif Display', 'Georgia', serif",
  body:         "'Plus Jakarta Sans', system-ui, sans-serif",
  ui:           "'Plus Jakarta Sans', system-ui, sans-serif",
  meta:         "'JetBrains Mono', 'Courier New', monospace",

  // ── Aliases for backward compatibility ──────────────────────────
  paperBg:      "#F4F6F4",
  mono:         "'JetBrains Mono', 'Courier New', monospace",
} as const;

/** Shared monogram URL used across marketing pages */
export const MONOGRAM_URL = "/manus-storage/auditready-monogram-v2_0b7ecdd4.png";

/**
 * Consistent spacing scale (px values as numbers).
 * Use: style={{ padding: spacing[6] }}  →  24px
 */
export const spacing = {
  1:  4,
  2:  8,
  3:  12,
  4:  16,
  5:  20,
  6:  24,
  8:  32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

/** Section vertical padding for marketing pages */
export const sectionPadding = {
  sm:  "64px 24px",
  md:  "80px 24px",
  lg:  "96px 24px",
  xl:  "120px 24px",
} as const;

/** Max-width containers */
export const maxWidth = {
  text:    760,
  content: 960,
  wide:    1200,
} as const;

export const radius = {
  sm: 2,
  md: 4,
  lg: 6,
  xl: 12,
} as const;
