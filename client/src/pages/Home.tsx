/**
 * AuditReady — "The Digital Compliance Folder" Landing Page
 * ──────────────────────────────────────────────────────────
 * Visual concept: A physical compliance folder brought to screen.
 * Paper texture, ink stamps, folder tab navigation, ID-card credentials,
 * date fields in monospace, signature lines, margin notes.
 *
 * Palette:
 *   Paper:    #F4F0E8  |  Ink:    #1A1A1A
 *   Stamp:    #C0392B  |  Forest: #3A4A2E  |  Amber: #8B6914
 *   Rule:     #D6CEBC  |  Tab:    #E8E2D4
 *
 * Typography:
 *   Display:  DM Serif Display (modern healthcare SaaS serif)
 *   Body:     Plus Jakarta Sans (16–17px, warm readable SaaS)
 *   Metadata: JetBrains Mono (dates, IDs)
 */

import { useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle, AlertCircle, AlertTriangle, Menu, X, Mail, Loader2, FolderOpen, Bell, ScanLine, BadgeCheck, FileDown, LayoutDashboard, Lock } from "lucide-react";
import { getLoginUrl, getSignUpUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AgencyProfileModal from "@/components/AgencyProfileModal";

// ── Asset URLs ────────────────────────────────────────────────
const LOGO_URL    = "/manus-storage/auditready-logo-clean_dc6a097d.png";
const HERO_PHOTO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663383634952/eSm9eowAagwqPSpdysCVxo/auditready-hero-compliance-ZqxLskEoTeX9BNS2jpNUbv.webp";
const MONOGRAM_URL = "/manus-storage/auditready-monogram-v2_0b7ecdd4.png";

// ── Design tokens ─────────────────────────────────────────────
// PREMIUM REDESIGN — High contrast, vivid, no opacity wash
// Dark sections: near-black base, vivid emerald accents, crisp white text
// Light sections: pure white / very light grey, deep ink, emerald highlights
const C = {
  // ── Light section palette ──────────────────────────────────
  paper:       "#FFFFFF",
  paperDark:   "#F4F6F4",
  paperDeeper: "#E8EDE8",
  tab:         "#EDF2ED",
  rule:        "#E5E7EB",
  ruleDark:    "#C0CEC0",
  ink:         "#0D1F10",
  inkMid:      "#1E2A1E",
  inkLight:    "#374151",
  inkFaint:    "#6B7D6B",
  inkGhost:    "#9BAA9B",
  // ── Accent colors ─────────────────────────────────────────
  forest:      "#3A8C5C",   // Emerald — unified primary accent/CTA color
  forestBg:    "#DCFCE7",
  emerald:     "#3A8C5C",   // Vivid emerald — primary accent on dark bg
  emeraldDim:  "#2D7A4F",
  emeraldGlow: "rgba(58,140,92,0.18)",
  // ── Status / alert ────────────────────────────────────────
  stampRed:    "#DC2626",
  stampRedBg:  "#FEE2E2",
  amber:       "#D97706",
  amberBg:     "#FEF3C7",
  // ── Typography ────────────────────────────────────────────
  display:     "'DM Serif Display', 'Georgia', serif",
  body:        "'Plus Jakarta Sans', system-ui, sans-serif",
  ui:          "'Plus Jakarta Sans', system-ui, sans-serif",
  meta:        "'JetBrains Mono', 'Courier New', monospace",
  // ── Dark section palette (hero, dark bands) ───────────────
  // Used inline in dark sections — kept here for reference
  // bg: #0F2318 | surface: rgba(255,255,255,0.04) | border: rgba(58,140,92,0.18)
  // text-primary: #FFFFFF | text-secondary: rgba(255,255,255,0.75) | text-muted: rgba(255,255,255,0.45)
  // accent: #3A8C5C | accent-dim: rgba(58,140,92,0.65)
};

// ── Count-up animation hook ──────────────────────────────────
function useCountUp(target: number | string, duration = 1200, start = false) {
  const [display, setDisplay] = useState<string>("0");
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    if (!start) return;
    const isNumeric = typeof target === "number" || /^\d+/.test(String(target));
    if (!isNumeric) { setDisplay(String(target)); return; }
    const numericTarget = parseFloat(String(target));
    const suffix = String(target).replace(/[\d.]/g, "");
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * numericTarget);
      setDisplay(current + suffix);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [start, target, duration]);
  return display;
}

// ── Pilot: direct OAuth redirect (self-serve, no form needed) ─
// handleSignUp() below redirects straight to OAuth login.
// On first login the server auto-grants a 14-day active_pilot.

// ── Demo Request Modal ────────────────────────────────────────
function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", agencyName: "", agencySize: "", message: "" });
  const [subscribeToUpdates, setSubscribeToUpdates] = useState(true);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const requestDemo = trpc.demo.request.useMutation({
    onSuccess: () => {
      toast.success("Demo request received! We'll reach out within 1 business day.");
      onClose();
      setForm({ name: "", email: "", agencyName: "", agencySize: "", message: "" });
      setSubscribeToUpdates(true);
    },
    onError: (err) => toast.error(err.message || "Something went wrong. Please try again."),
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    requestDemo.mutate({ ...form, subscribeToUpdates });
  };
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent style={{ maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle style={{ fontFamily: C.ui, fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em" }}>Request a Demo</DialogTitle>
          <p style={{ fontFamily: C.body, fontSize: "0.85rem", color: C.inkLight, marginTop: 4, lineHeight: 1.55 }}>We'll walk you through AuditReady in 20 minutes and answer any compliance questions you have.</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <Label htmlFor="demo-name" style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4, display: "block" }}>Full Name *</Label>
              <Input id="demo-name" value={form.name} onChange={set("name")} placeholder="Jane Smith" required />
            </div>
            <div>
              <Label htmlFor="demo-email" style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4, display: "block" }}>Work Email *</Label>
              <Input id="demo-email" type="email" value={form.email} onChange={set("email")} placeholder="jane@agency.com" required />
            </div>
          </div>
          <div>
            <Label htmlFor="demo-agency" style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4, display: "block" }}>Agency / Practice Name *</Label>
            <Input id="demo-agency" value={form.agencyName} onChange={set("agencyName")} placeholder="Bright Futures ABA" required />
          </div>
          <div>
            <Label style={{ fontSize: "0.78rem", fontWeight: 600, marginBottom: 4, display: "block" }}>Number of Staff</Label>
            <Select value={form.agencySize} onValueChange={v => setForm(f => ({ ...f, agencySize: v }))}>
              <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1-5">1–5 staff</SelectItem>
                <SelectItem value="6-15">6–15 staff</SelectItem>
                <SelectItem value="16-50">16–50 staff</SelectItem>
                <SelectItem value="51-100">51–100 staff</SelectItem>
                <SelectItem value="100+">100+ staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0 4px" }}>
            <input
              type="checkbox"
              id="demo-subscribe"
              checked={subscribeToUpdates}
              onChange={e => setSubscribeToUpdates(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: C.forest, cursor: "pointer", flexShrink: 0 }}
            />
            <label htmlFor="demo-subscribe" style={{ fontFamily: C.body, fontSize: "0.78rem", color: C.inkLight, cursor: "pointer", lineHeight: 1.4 }}>
              Keep me updated on AuditReady news and NC compliance tips
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
            <Button type="button" variant="outline" onClick={onClose} disabled={requestDemo.isPending}>Cancel</Button>
            <Button type="submit" disabled={requestDemo.isPending} style={{ background: C.forest, color: "#fff" }}>
              {requestDemo.isPending ? <><Loader2 size={14} className="animate-spin" style={{ marginRight: 6 }} />Sending…</> : "Request Demo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Scroll-triggered entrance ─────────────────────────────────
function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (prefersReducedMotion) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.03 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [prefersReducedMotion]);
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(14px)",
      transition: prefersReducedMotion ? "none" : `opacity 420ms cubic-bezier(0.23,1,0.32,1) ${delay}ms, transform 420ms cubic-bezier(0.23,1,0.32,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

// ── Screenshot Tabs component ───────────────────────────────
const SCREENSHOTS = [
  {
    id: "dashboard",
    label: "Compliance Dashboard",
    desc: "See your entire agency's credential status at a glance — who's current, who's expiring, and who needs immediate attention.",
    src: "/manus-storage/screenshot-dashboard-clean_1a9f89da.webp",
  },
  {
    id: "credentials",
    label: "Credential Registry",
    desc: "Every license, certification, CPR card, and background check in one searchable table — with expiration dates, verification status, and document links.",
    src: "/manus-storage/screenshot-credentials_f12bf5a0.webp",
  },
  {
    id: "staff",
    label: "Staff Directory",
    desc: "Your full team roster with credential counts and compliance status. Add staff, assign credentials, and track readiness across your entire organization.",
    src: "/manus-storage/screenshot-staff_e631dfa7.webp",
  },
];

function ScreenshotTabs() {
  const [active, setActive] = useState(0);
  const current = SCREENSHOTS[active];
  return (
    <div>
      {/* Tab buttons — horizontal scroll on mobile */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto" as const, WebkitOverflowScrolling: "touch" as const, scrollbarWidth: "none" as const, justifyContent: "center", paddingBottom: 2 }}>
        {SCREENSHOTS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActive(i)}
            style={{
              fontFamily: C.ui, fontSize: "0.82rem",
              fontWeight: active === i ? 700 : 500,
              padding: "9px 20px", borderRadius: 4, border: "none", cursor: "pointer",
              background: active === i ? "#3A8C5C" : "rgba(255,255,255,0.06)",
              color: active === i ? "#0F2318" : "rgba(255,255,255,0.6)",
              boxShadow: active === i ? "0 2px 12px rgba(58,140,92,0.3)" : "none",
              transition: "background 180ms, color 180ms",
            }}
          >{s.label}</button>
        ))}
      </div>
      {/* Screenshot + caption */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
        <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(244,240,232,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.45)" }}>
          <img
            key={current.src}
            src={current.src}
            alt={current.label}
            loading="lazy"
            decoding="async"
            style={{ width: "100%", height: "auto", display: "block", opacity: 1, transition: "opacity 220ms" }}
          />
          {/* Caption overlay */}
          <div style={{ padding: "20px 24px", background: "rgba(17,28,20,0.95)", borderTop: "1px solid rgba(244,240,232,0.08)" }}>
            <div style={{ fontFamily: C.ui, fontSize: "0.88rem", fontWeight: 700, color: "#F4F0E8", marginBottom: 6 }}>{current.label}</div>
            <div style={{ fontFamily: C.body, fontSize: "0.82rem", color: "rgba(244,240,232,0.55)", lineHeight: 1.6 }}>{current.desc}</div>
          </div>
        </div>
      </div>
      {/* CTA */}
      <div style={{ textAlign: "center", marginTop: 36 }}>
        <a
          href={getSignUpUrl()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#3A8C5C", color: "#0F2318",
            fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 700,
            padding: "13px 28px", borderRadius: 4, textDecoration: "none",
            transition: "background 150ms",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#8DC47C")}
          onMouseLeave={e => (e.currentTarget.style.background = "#3A8C5C")}
        >
          Start Your Free 14-Day Trial <ArrowRight size={15} />
        </a>
        <div style={{ fontFamily: C.body, fontSize: "0.72rem", color: "rgba(244,240,232,0.32)", marginTop: 12, display: "flex", flexWrap: "wrap" as const, gap: "4px 14px", alignItems: "center" }}>
          {[
            { label: "No credit card required", href: undefined },
            { label: "Cancel anytime", href: undefined },
            { label: "No patient data collected", href: "/security" },
            { label: "Encrypted storage", href: "/security" },
            { label: "SOC 2 in progress", href: "/security" },
          ].map((item, i) => (
            item.href ? (
              <a key={i} href={item.href} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "rgba(244,240,232,0.45)", textDecoration: "none", transition: "color 150ms" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(123,175,110,0.9)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(244,240,232,0.45)")}
              >
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(123,175,110,0.5)", display: "inline-block", flexShrink: 0 }} />
                {item.label} ↗
              </a>
            ) : (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(123,175,110,0.5)", display: "inline-block", flexShrink: 0 }} />
                {item.label}
              </span>
            )
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Stamp component ───────────────────────────────────────────
function Stamp({ label, variant }: { label: string; variant: "verified" | "expiring" | "expired" | "pending" }) {
  const styles = {
    verified: { color: C.forest, border: `1.5px solid ${C.forest}`, background: C.forestBg },
    expiring: { color: C.amber,  border: `1.5px solid ${C.amber}`,  background: C.amberBg  },
    expired:  { color: C.stampRed, border: `1.5px solid ${C.stampRed}`, background: C.stampRedBg },
    pending:  { color: C.inkFaint, border: `1.5px solid ${C.inkGhost}`, background: C.paperDark },
  }[variant];
  return (
    <span style={{
      fontFamily: C.meta, fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.18em",
      textTransform: "uppercase", padding: "2px 7px", borderRadius: 2, display: "inline-block",
      ...styles,
    }}>{label}</span>
  );
}

// ── Credential ID Card ────────────────────────────────────────
function CredentialCard({
  name, title, credType, credNumber, issued, expires,
  status, org, warning,
}: {
  name: string; title: string; credType: string; credNumber: string;
  issued: string; expires: string; status: "verified" | "expiring" | "expired";
  org: string; warning?: string;
}) {
  const statusBar = { verified: C.forest, expiring: C.amber, expired: C.stampRed }[status];
  return (
    <div style={{
      background: C.paper,
      border: `1px solid ${C.ruleDark}`,
      borderRadius: 6,
      overflow: "hidden",
      boxShadow: "0 3px 12px rgba(26,26,26,0.1), 0 1px 3px rgba(26,26,26,0.07)",
      width: "100%",
      maxWidth: 340,
    }}>
      {/* Status bar */}
      <div style={{ height: 4, background: statusBar }} />

      {/* Card header */}
      <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.rule}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: C.meta, fontSize: "0.55rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 3 }}>Staff Credential</div>
          <div style={{ fontFamily: C.display, fontSize: "1rem", fontWeight: 700, color: C.ink, letterSpacing: "-0.01em" }}>{name}</div>
          <div style={{ fontFamily: C.body, fontSize: "0.78rem", color: C.inkLight, marginTop: 1 }}>{title}</div>
        </div>
        {/* Photo placeholder */}
        <div style={{
          width: 42, height: 52, background: C.paperDark, border: `1px solid ${C.rule}`,
          borderRadius: 3, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ fontFamily: C.meta, fontSize: "0.45rem", color: C.inkGhost, textAlign: "center", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.4 }}>Photo<br/>ID</div>
        </div>
      </div>

      {/* Credential details */}
      <div style={{ padding: "10px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", marginBottom: 10 }}>
          <div>
            <div style={{ fontFamily: C.meta, fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 2 }}>Credential Type</div>
            <div style={{ fontFamily: C.body, fontSize: "0.8rem", fontWeight: 500, color: C.inkMid }}>{credType}</div>
          </div>
          <div>
            <div style={{ fontFamily: C.meta, fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 2 }}>License / Cert #</div>
            <div style={{ fontFamily: C.meta, fontSize: "0.78rem", color: C.inkMid }}>{credNumber}</div>
          </div>
          <div>
            <div style={{ fontFamily: C.meta, fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 2 }}>Issued</div>
            <div style={{ fontFamily: C.meta, fontSize: "0.78rem", color: C.inkMid }}>{issued}</div>
          </div>
          <div>
            <div style={{ fontFamily: C.meta, fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 2 }}>Expires</div>
            <div style={{ fontFamily: C.meta, fontSize: "0.78rem", color: status === "expired" ? C.stampRed : status === "expiring" ? C.amber : C.inkMid, fontWeight: status !== "verified" ? 600 : 400 }}>{expires}</div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: C.meta, fontSize: "0.55rem", color: C.inkFaint, letterSpacing: "0.06em" }}>{org}</div>
          <Stamp label={status === "verified" ? "Verified" : status === "expiring" ? "Expiring Soon" : "Expired"} variant={status} />
        </div>
      </div>

      {/* Warning banner */}
      {warning && (
        <div style={{ background: status === "expired" ? C.stampRedBg : C.amberBg, borderTop: `1px solid ${status === "expired" ? C.stampRed : C.amber}`, padding: "7px 16px", display: "flex", alignItems: "center", gap: 6 }}>
          <AlertCircle size={11} color={status === "expired" ? C.stampRed : C.amber} style={{ flexShrink: 0 }} />
          <span style={{ fontFamily: C.meta, fontSize: "0.6rem", color: status === "expired" ? C.stampRed : C.amber, letterSpacing: "0.04em" }}>{warning}</span>
        </div>
      )}
    </div>
  );
}

// ── Smooth scroll helper ─────────────────────────────────────
function scrollToSection(id: string) {
  if (!id) return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Clean Section Label (replaces old folder-tab widget) ──────
function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
      <div style={{ width: 28, height: 2, background: C.forest, borderRadius: 1, flexShrink: 0 }} />
      <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkFaint }}>{children}</span>
    </div>
  );
}

// ── FAQ Section ─────────────────────────────────────────────
const faqItems = [
  {
    q: "Is AuditReady HIPAA compliant?",
    a: "AuditReady is an administrative credential tracking platform — it does not collect, store, or process patient health information (PHI). We track staff credentials, license expiration dates, and document links only. No patient records, therapy notes, billing data, or client files are ever stored in AuditReady.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You have a 30-day data export window after cancellation. During that period you can download a full CSV export of all staff records, credential entries, and verification history. After 30 days, your data is permanently deleted from our servers.",
  },
  {
    q: "Does it work for multi-site agencies?",
    a: "Yes. The Enterprise plan supports unlimited staff members across multiple locations. All staff credentials are tracked in a single unified dashboard, so you get a complete compliance picture across your entire organization regardless of how many sites you operate.",
  },
  {
    q: "What credential types can you track?",
    a: "AuditReady supports 7 credential categories: professional licenses (BCBA, LCSW, LCMHC, etc.), certifications (RBT, CPR/First Aid), background checks, required trainings (bloodborne pathogens, HIPAA, etc.), malpractice insurance, NPI registration, and a custom 'Other' category for any credential type your agency needs.",
  },
  {
    q: "Do I need to provide any API keys or technical setup?",
    a: "No. All verification integrations — NPI Registry, OIG LEIE, SAM.gov exclusion checks, and BACB guided verification — are built in and require no configuration. You sign in with your Manus account and the system is ready to use in minutes.",
  },
  {
    q: "How does document upload work?",
    a: "When you upload a credential document (photo or PDF), AuditReady suggests the expiration date, credential type, and license number for your review. You confirm or edit the details before anything is saved — nothing is recorded automatically without your approval.",
  },
  {
    q: "What is the NCTracks April 2027 deadline?",
    a: "NC DHHS is requiring all behavioral health providers enrolled in NCTracks to maintain documented, current staff credentials as a condition of Medicaid billing. The April 2027 deadline is a hard compliance date tied to NCTracks enrollment status. AuditReady helps agencies build and maintain that credential record now, before the deadline.",
  },
  {
    q: "Can I export my credential data for an audit?",
    a: "Yes. Every plan includes one-click audit-ready export. You can generate a clean, organized report of all staff credentials — including expiration dates, verification status, and document links — in CSV format, ready to present to any state board, payer, or accreditation auditor.",
  },
];

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  return (
    <section id="faq" style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, padding: "clamp(48px, 6vw, 80px) clamp(16px, 4vw, 40px)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <FadeIn>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.inkFaint }}>FAQ</span>
            <div style={{ flex: 1, height: 1, background: C.rule }} />
          </div>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 12 }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, lineHeight: 1.7, marginBottom: 40, maxWidth: 560 }}>
            Everything you need to know about AuditReady. Can't find an answer? Email us at{" "}
            <a href="mailto:support@useauditready.com" style={{ color: C.forest, textDecoration: "none", fontWeight: 600 }}>support@useauditready.com</a>.
          </p>
        </FadeIn>

        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {faqItems.map((item, i) => (
            <FadeIn key={i} delay={i * 40}>
              <div
                style={{
                  borderTop: i === 0 ? `1px solid ${C.rule}` : "none",
                  borderBottom: `1px solid ${C.rule}`,
                }}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  style={{
                    width: "100%", textAlign: "left", background: "none", border: "none",
                    cursor: "pointer", padding: "20px 0",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  }}
                  aria-expanded={openIndex === i}
                >
                  <span style={{ fontFamily: C.ui, fontSize: "clamp(0.9rem, 1.8vw, 1rem)", fontWeight: 700, color: C.ink, lineHeight: 1.4, flex: 1 }}>{item.q}</span>
                  <span style={{
                    flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
                    background: openIndex === i ? C.forest : C.paperDark,
                    border: `1px solid ${openIndex === i ? C.forest : C.ruleDark}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 180ms, border-color 180ms",
                    color: openIndex === i ? "#F4F0E8" : C.inkLight,
                    fontSize: "1rem", fontWeight: 300, lineHeight: 1,
                  }}>{openIndex === i ? "−" : "+"}</span>
                </button>
                {openIndex === i && (
                  <div style={{
                    paddingBottom: 20,
                    fontFamily: C.body, fontSize: "0.92rem", color: C.inkMid, lineHeight: 1.75,
                    maxWidth: 680,
                  }}>
                    {item.a}
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Bottom CTA */}
        <FadeIn delay={100}>
          <div style={{ marginTop: 48, padding: "28px 32px", background: C.forestBg, border: `1px solid ${C.forest}20`, borderRadius: 6, display: "flex", flexDirection: "column" as const, gap: 14 }}>
            <div style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: C.forest }}>Still have questions?</div>
            <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: C.inkMid, lineHeight: 1.7, margin: 0 }}>
              We're happy to walk you through how AuditReady works for your specific agency type. Reach out directly — you'll hear back from a real person.
            </p>
            <a
              href="mailto:support@useauditready.com"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: C.forest, color: "#F4F0E8",
                fontFamily: C.ui, fontSize: "0.85rem", fontWeight: 700,
                padding: "11px 22px", borderRadius: 4, textDecoration: "none",
                alignSelf: "flex-start" as const,
              }}
            >
              <Mail size={14} />
              Send Us a Message
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ── Pricing tiers ──────────────────────────────────────────────────────────────────
const pricingTiers = [
  {
    name: "Starter", tagline: "1–10 staff members", staff: "1–10 staff",
    monthly: 129, annual: 116, highlight: false, setupFee: 199,
    features: [
      "Core credential tracking",
      "Expiration reminders: 90, 60, and 30 days",
      "Document upload & storage",
      "Audit-ready export",
      "Compliance AI assistant: 20 questions/month",
      "Email support",
    ],
    cta: "Subscribe Now",
  },
  {
    name: "Growth", tagline: "11–50 staff members", staff: "11–50 staff",
    monthly: 249, annual: 224, highlight: true, setupFee: 199,
    features: [
      "Everything in Starter",
      "Up to 50 staff members",
      "NC board license verification",
      "Audit narrative assistant",
      "Compliance AI assistant: unlimited",
      "Multi-state license tracking",
      "Priority support",
    ],
    cta: "Subscribe Now",
  },
  {
    name: "Enterprise", tagline: "51+ staff members", staff: "51+ staff",
    monthly: 449, annual: 404, highlight: false, setupFee: 199,
    features: [
      "Everything in Growth",
      "Unlimited staff members",
      "NC board license verification",
      "Compliance AI assistant: unlimited",
      "Custom credential types",
      "Priority support",
      "Multi-location support",
    ],
    cta: "Subscribe Now",
  },
];

// ── Main Component ────────────────────────────────────────────
export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [annualPricing, setAnnualPricing] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  // Count-up trigger — fires when stats row scrolls into view
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStatsVisible(true); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const stat90 = useCountUp(90, 1000, statsVisible);
  const stat3 = useCountUp(3, 800, statsVisible);
  const stat0 = useCountUp(0, 600, statsVisible);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Free Pilot = self-serve OAuth redirect — no form, no approval needed.
  // On first login the server auto-grants a 14-day active_pilot.
  const handleSignIn = () => { window.location.href = getLoginUrl(); };
  const handleSignUp = () => { window.location.href = getSignUpUrl(); };

    const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ plan: "starter" | "growth" | "enterprise"; interval: "monthly" | "annual" } | null>(null);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (err) => { alert(err.message || "Failed to start checkout. Please try again."); },
  });
  const handlePricingCta = (planName: string) => {
    const plan = planName.toLowerCase() as "starter" | "growth" | "enterprise";
    const interval = annualPricing ? "annual" : "monthly";
    // Show agency profile modal before proceeding to Stripe checkout
    setPendingPlan({ plan, interval });
    setAgencyModalOpen(true);
  };
  const handleAgencyProfileComplete = () => {
    setAgencyModalOpen(false);
    if (pendingPlan) {
      createCheckout.mutate({ plan: pendingPlan.plan, interval: pendingPlan.interval, origin: window.location.origin });
    }
  };

  return (
    <div style={{ fontFamily: C.body, background: C.paper, color: C.ink, minHeight: "100vh" }}>
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
      {agencyModalOpen && pendingPlan && (
        <AgencyProfileModal
          planName={pendingPlan.plan}
          billingInterval={pendingPlan.interval}
          onComplete={handleAgencyProfileComplete}
          onClose={() => { setAgencyModalOpen(false); setPendingPlan(null); }}
        />
      )}

      {/* ── NAVIGATION — Folder tab style ──────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? "rgba(3,7,4,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(1.8)" : "none",
        borderBottom: scrolled ? "1px solid rgba(58,140,92,0.14)" : "1px solid transparent",
        transition: "all 280ms cubic-bezier(0.23,1,0.32,1)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 4vw, 40px)", display: "flex", alignItems: "center", justifyContent: "space-between", height: 72 }}>
          {/* Logo */}
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 11, textDecoration: "none", flexShrink: 0 }}>
            <img src={MONOGRAM_URL} alt="AR" loading="eager" decoding="async" style={{ height: 34, width: 34, objectFit: "contain", display: "block", filter: "none", opacity: 1 }} />
            <span style={{ fontFamily: C.display, fontSize: "1.45rem", fontWeight: 700, color: "#F4F0E8", letterSpacing: "-0.025em", lineHeight: 1 }}>
              Audit<span style={{ color: "#3A8C5C" }}>Ready</span>
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center">
            {[
              { label: "Features", id: "features" },
              { label: "How It Works", id: "how-it-works", href: "/how-it-works" },
              { label: "Who It's For", id: "clinics" },
              { label: "Pricing", id: "pricing" },
              { label: "About", id: "about" },
            ].map((l) => (
              <button key={l.label}
                onClick={() => { if ((l as any).href) { window.location.href = (l as any).href; return; } const el = document.getElementById(l.id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); else window.location.href = `/#${l.id}`; }}
                style={{
                  fontFamily: C.ui, fontSize: "0.88rem", fontWeight: 500,
                  color: "rgba(255,255,255,0.6)", background: "transparent",
                  border: "none", cursor: "pointer", padding: "8px 18px",
                  transition: "color 150ms",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
              >{l.label}</button>
            ))}
            <a href="/security" style={{
              fontFamily: C.ui, fontSize: "0.88rem", fontWeight: 500,
              color: "rgba(255,255,255,0.6)", textDecoration: "none",
              padding: "8px 18px", transition: "color 150ms", display: "inline-block",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "#FFFFFF")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
            >Security</a>
          </div>

          <div className="hidden md:flex items-center gap-3" style={{ flexShrink: 0 }}>
            <button onClick={handleSignIn} style={{
              background: "transparent", color: "rgba(255,255,255,0.75)", borderRadius: 6, padding: "9px 18px",
              fontFamily: C.ui, fontSize: "0.85rem", fontWeight: 500,
              border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer",
              transition: "all 150ms", whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { e.currentTarget.style.color = "#FFFFFF"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.45)"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.75)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "transparent"; }}
            >Sign In</button>
            <button onClick={handleSignUp} style={{
              background: "#3A8C5C", color: "#020F05", borderRadius: 6, padding: "9px 22px",
              fontFamily: C.ui, fontSize: "0.85rem", fontWeight: 700,
              border: "none", cursor: "pointer",
              transition: "background 150ms, box-shadow 150ms", whiteSpace: "nowrap",
              boxShadow: "0 0 20px rgba(58,140,92,0.4)",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "#2D7A4F"; e.currentTarget.style.boxShadow = "0 0 30px rgba(58,140,92,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#3A8C5C"; e.currentTarget.style.boxShadow = "0 0 20px rgba(58,140,92,0.4)"; }}
            >Get Started</button>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? "Close menu" : "Open menu"} className="flex md:hidden" style={{ background: "none", border: "none", cursor: "pointer", color: "#F4F0E8", padding: 4 }}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

      </nav>

      {/* ── MOBILE DRAWER — slide-in from right ───────────────── */}
      {/* Backdrop */}
      <div
        onClick={() => setMobileOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(10,20,12,0.65)",
          backdropFilter: "blur(4px)",
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "opacity 240ms cubic-bezier(0.23,1,0.32,1)",
        }}
        aria-hidden="true"
      />
      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
          width: "min(300px, 85vw)",
          background: "#162B1C",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column",
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 260ms cubic-bezier(0.23,1,0.32,1)",
          willChange: "transform",
        }}
      >
        {/* Drawer header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <span style={{ fontFamily: C.display, fontSize: "1.1rem", fontWeight: 700, color: "#F4F0E8", letterSpacing: "-0.02em" }}>
            Audit<span style={{ color: "#3A8C5C" }}>Ready</span>
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(244,240,232,0.5)", padding: 4, display: "flex", alignItems: "center" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "8px 0" }}>
          {[
            { label: "Features",       id: "features" },
            { label: "How It Works",   id: "", href: "/how-it-works" },
            { label: "Who It's For",   id: "clinics" },
            { label: "Pricing",        id: "pricing" },
            { label: "FAQ",            id: "", href: "/faq" },
            { label: "Behavioral Health", id: "", href: "/behavioral-health-credentials" },
            { label: "About",          id: "about" },
            { label: "Security",       id: "security-section" },
          ].map((l, i) => (
            <button
              key={l.label}
              onClick={() => {
                setMobileOpen(false);
                if ((l as any).href) { setTimeout(() => { window.location.href = (l as any).href; }, 200); return; }
                // Small delay lets the drawer close before scrolling
                setTimeout(() => {
                  const el = document.getElementById(l.id);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 200);
              }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: "none", border: "none", cursor: "pointer",
                fontFamily: C.ui, fontSize: "1rem", fontWeight: 500,
                color: "rgba(244,240,232,0.7)",
                padding: "14px 24px",
                borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none",
                transition: "color 120ms, background 120ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#F4F0E8"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(244,240,232,0.7)"; e.currentTarget.style.background = "none"; }}
            >
              {l.label}
            </button>
          ))}
        </nav>

        {/* CTA buttons */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => { setMobileOpen(false); handleSignIn(); }}
            style={{
              width: "100%", background: "transparent", color: "rgba(244,240,232,0.75)",
              borderRadius: 4, padding: "12px 18px", textAlign: "center",
              fontFamily: C.ui, fontSize: "0.88rem", fontWeight: 500,
              border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer",
              transition: "color 150ms, border-color 150ms",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#F4F0E8"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(244,240,232,0.75)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMobileOpen(false); handleSignUp(); }}
            style={{
              width: "100%", background: "#3A8C5C", color: "#0F2318",
              borderRadius: 4, padding: "13px 18px", textAlign: "center",
              fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 700,
              border: "none", cursor: "pointer",
              boxShadow: "0 2px 12px rgba(123,175,110,0.3)",
              transition: "background 150ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#8FC880")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#3A8C5C")}
          >
            Start Free 14-Day Trial
          </button>
          <a
            href="mailto:support@useauditready.com"
            onClick={() => setMobileOpen(false)}
            style={{
              width: "100%", background: "transparent", color: "rgba(244,240,232,0.6)",
              borderRadius: 4, padding: "12px 18px", textAlign: "center",
              fontFamily: C.ui, fontSize: "0.88rem", fontWeight: 500,
              border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer",
              transition: "color 150ms, border-color 150ms", textDecoration: "none",
              display: "block",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "#F4F0E8"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.25)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(244,240,232,0.6)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
          >
            Questions? Email us →
          </a>
        </div>
      </div>



      {/* ── HERO — Full-width dark premium layout ─── */}
      <section id="hero" style={{
        background: "#0F2318",
        paddingTop: 80,
        paddingBottom: 0,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        boxSizing: "border-box",
        borderBottom: "1px solid rgba(58,140,92,0.1)",
      }}>
        {/* Premium background — deep dark with vivid emerald glow */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 65% 35%, rgba(58,140,92,0.12) 0%, transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 45% 35% at 15% 75%, rgba(22,163,74,0.08) 0%, transparent 60%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(58,140,92,0.4) 40%, rgba(58,140,92,0.4) 60%, transparent 100%)", pointerEvents: "none" }} />

        <div className="px-5 sm:px-8 lg:px-10" style={{ maxWidth: 1200, margin: "0 auto", paddingTop: "clamp(32px, 5vw, 56px)", paddingBottom: "clamp(32px, 5vw, 56px)", position: "relative", zIndex: 1, width: "100%" }}>

          {/* Top eyebrow */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28, background: "rgba(58,140,92,0.08)", border: "1px solid rgba(58,140,92,0.25)", borderRadius: 20, padding: "5px 14px 5px 10px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3A8C5C", boxShadow: "0 0 8px rgba(58,140,92,0.8)", flexShrink: 0 }} />
            <span style={{ fontFamily: C.ui, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4FAD74", lineHeight: 1 }}>Built for ABA agencies — zero PHI, zero HIPAA risk</span>
          </div>

          {/* Main headline + subheadline side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "clamp(24px, 4vw, 40px) 80px", alignItems: "start", marginBottom: "clamp(28px, 4vw, 40px)" }}>

            {/* Left — headline block */}
            <div>
              <h1 style={{
                fontFamily: C.display,
                fontSize: "clamp(2.4rem, 5vw, 4.8rem)",
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                marginBottom: 22,
                maxWidth: "13em",
              }}>
                Never Miss a Staff Credential Expiration Again.
              </h1>
              <p style={{ fontFamily: C.body, fontSize: "clamp(1rem, 1.9vw, 1.15rem)", color: "rgba(255,255,255,0.82)", lineHeight: 1.7, marginBottom: 10, maxWidth: "36em" }}>
                Expired license. Missing background check. Audit panic. Spreadsheet chaos. AuditReady gives behavioral health agencies one place to track every credential, get alerts before anything lapses, and walk into any audit with confidence.
              </p>
              <p style={{ fontFamily: C.body, fontSize: "clamp(0.9rem, 1.6vw, 1rem)", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, marginBottom: 32, maxWidth: "34em" }}>
                ABA agencies · mental health clinics · psychology practices · behavioral health organizations
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-start" }}>
                {/* Primary CTA */}
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 12, alignItems: "center" }}>
                  <button onClick={handleSignUp} style={{
                    background: "#3A8C5C", color: "#020F05", borderRadius: 8, padding: "16px 36px",
                    fontFamily: C.ui, fontSize: "0.95rem", fontWeight: 700, letterSpacing: "0.01em",
                    border: "none", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 8,
                    boxShadow: "0 0 32px rgba(58,140,92,0.45)",
                    transition: "background 150ms ease-out, transform 100ms ease-out, box-shadow 150ms ease-out",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#2D7A4F"; e.currentTarget.style.boxShadow = "0 0 44px rgba(58,140,92,0.65)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#3A8C5C"; e.currentTarget.style.boxShadow = "0 0 32px rgba(58,140,92,0.45)"; }}
                    onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
                    onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
                  >
                    Start Free 14-Day Trial <ArrowRight size={16} />
                  </button>
                  {/* Secondary CTA */}
                  <a href="mailto:support@useauditready.com" style={{
                    background: "transparent", color: "rgba(244,240,232,0.7)", borderRadius: 8, padding: "15px 28px",
                    fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 600, letterSpacing: "0.01em",
                    border: "1px solid rgba(255,255,255,0.18)", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
                    whiteSpace: "nowrap" as const,
                    transition: "color 150ms ease-out, border-color 150ms ease-out, transform 100ms ease-out",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = "#F4F0E8"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.35)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = "rgba(244,240,232,0.7)"; (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.18)"; }}
                  >
                    Questions? Email us →
                  </a>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <a href="/how-it-works" style={{ fontFamily: C.ui, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)", textDecoration: "none", letterSpacing: "0.01em", transition: "color 150ms" }}
                    onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.85)")}
                    onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)")}
                  >See how it works ↓</a>
                  <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "0.75rem" }}>·</span>
                  <span style={{ fontFamily: C.ui, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", letterSpacing: "0.01em" }}>No credit card required</span>
                </div>
                <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <Lock size={11} color="rgba(255,255,255,0.3)" />
                  <span style={{ fontFamily: C.ui, fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.02em" }}>Built for organization support — not legal advice</span>
                </div>
              </div>
            </div>

            {/* Right — Abstract network verification visual (no internal UI exposed) */}
            <div style={{ position: "relative", paddingTop: 8 }}>
              <div style={{
                position: "absolute",
                inset: "-20px -20px -40px -20px",
                background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(123,175,110,0.15) 0%, transparent 70%)",
                pointerEvents: "none",
                zIndex: 0,
              }} />
              <div style={{
                position: "relative",
                zIndex: 1,
                borderRadius: 12,
                border: "1px solid rgba(58,140,92,0.22)",
                background: "rgba(6,13,7,0.92)",
                padding: "28px 24px",
                boxShadow: "0 0 0 1px rgba(58,140,92,0.06), 0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(58,140,92,0.06)",
              }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                  <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(74,222,128,0.7)" }}>Live Credential Verification</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3A8C5C", boxShadow: "0 0 10px rgba(58,140,92,0.9)" }} />
                    <span style={{ fontFamily: C.ui, fontSize: "0.62rem", color: "#4FAD74", letterSpacing: "0.05em" }}>Connected</span>
                  </div>
                </div>

                {/* Verification result rows */}
                {[
                  { source: "NPI Registry", name: "J. Williams, BCBA", result: "Active", license: "NC · NPI 1234567890" },
                  { source: "BACB", name: "M. Torres, RBT", result: "Certified", license: "RBT #20-123456" },
                  { source: "NC State Board", name: "D. Carter, LCSW", result: "Active", license: "C012345 (NC)" },
                  { source: "OIG LEIE", name: "Agency-wide check", result: "No Exclusions", license: "14 staff verified" },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 14px",
                    borderRadius: 6,
                    background: i % 2 === 0 ? "rgba(255,255,255,0.04)" : "transparent",
                    marginBottom: 4,
                    gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 600, color: "rgba(255,255,255,0.9)", marginBottom: 2, whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
                      <div style={{ fontFamily: C.ui, fontSize: "0.6rem", color: "rgba(255,255,255,0.38)", letterSpacing: "0.04em" }}>{row.source} · {row.license}</div>
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      background: "rgba(58,140,92,0.12)",
                      border: "1px solid rgba(58,140,92,0.3)",
                      borderRadius: 20,
                      padding: "3px 10px",
                      flexShrink: 0,
                    }}>
                      <CheckCircle size={10} color="#3A8C5C" />
                      <span style={{ fontFamily: C.ui, fontSize: "0.62rem", fontWeight: 700, color: "#4FAD74", letterSpacing: "0.04em" }}>{row.result}</span>
                    </div>
                  </div>
                ))}

                {/* Footer — verified data sources */}
                <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(58,140,92,0.12)", display: "flex", flexWrap: "wrap" as const, gap: 8, justifyContent: "center" }}>
                  {["NPI Registry", "BACB", "NC State Boards", "OIG LEIE", "SAM.gov"].map(src => (
                    <span key={src} style={{ fontFamily: C.ui, fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.06em", color: "rgba(74,222,128,0.55)", textTransform: "uppercase" as const }}>{src}</span>
                  ))}
                </div>
              </div>
              {/* Caption */}
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3A8C5C", boxShadow: "0 0 6px rgba(58,140,92,0.7)", flexShrink: 0 }} />
                <span style={{ fontFamily: C.ui, fontSize: "0.7rem", color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>Verified against 5 national databases in real time</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div ref={statsRef} className="grid grid-cols-3" style={{ borderTop: "1px solid rgba(58,140,92,0.12)", paddingTop: 32, gap: 0 }}>
            {[
              { animated: stat90, suffix: "", unit: "DAYS", label: "Average notice before a credential expires" },
              { animated: stat3, suffix: "+", unit: "HRS/WK", label: "Saved vs. manual spreadsheet tracking" },
              { animated: null, suffix: "", unit: "No PHI", label: "No patient data collected" },
            ].map((s, i) => (
              <div key={i} style={{
                padding: "12px 0",
                paddingRight: i < 2 ? "clamp(8px, 2vw, 32px)" : 0,
                paddingLeft: i > 0 ? "clamp(8px, 2vw, 32px)" : 0,
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
                  {s.animated !== null ? (
                    <>
                      <span style={{ fontFamily: C.ui, fontSize: "clamp(1.6rem, 5vw, 4.5rem)", fontWeight: 800, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.04em" }}>{s.animated}{s.suffix}</span>
                      <span style={{ fontFamily: C.ui, fontSize: "clamp(0.55rem, 1.5vw, 0.75rem)", fontWeight: 700, letterSpacing: "0.1em", color: "#3A8C5C", textTransform: "uppercase" }}>{s.unit}</span>
                    </>
                  ) : (
                    <span style={{ fontFamily: C.ui, fontSize: "clamp(0.85rem, 2.5vw, 1.35rem)", fontWeight: 800, color: "#3A8C5C", lineHeight: 1.1, letterSpacing: "-0.01em", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                      {s.unit}
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: C.body, fontSize: "clamp(0.65rem, 1.8vw, 0.85rem)", color: "rgba(255,255,255,0.6)", lineHeight: 1.45, margin: 0 }}>{s.label}</p>
              </div>
            ))}
          </div>

        </div>


      </section>

      {/* ── SECTION: WHAT WE VERIFY — Data sources grid ─────────────────── */}
      <section style={{ background: "#0F2318", padding: "clamp(56px, 6vw, 80px) clamp(16px, 4vw, 40px)", borderBottom: "1px solid rgba(58,140,92,0.1)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 20, height: 1, background: "#3A8C5C" }} />
                <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#3A8C5C" }}>Verified Sources</span>
                <div style={{ width: 20, height: 1, background: "#3A8C5C" }} />
              </div>
              <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 10 }}>
                We verify against the databases that matter.
              </h2>
              <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", maxWidth: 520, margin: "0 auto", lineHeight: 1.65 }}>
                AuditReady connects directly to five national and state databases — so every credential check is authoritative, not manual.
              </p>
            </div>
          </FadeIn>

          {/* 5-source grid — 2 cols on sm, 3 on md, last 2 cards centered */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3" style={{ gap: 16, marginBottom: 48 }}>
            {[
              {
                name: "NPI Registry",
                authority: "CMS / NPPES",
                scope: "National Provider Identifier — confirms active enrollment and taxonomy",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                ),
              },
              {
                name: "BACB",
                authority: "Behavior Analyst Certification Board",
                scope: "BCBA, BCaBA, and RBT certification status — required for ABA agencies",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
                  </svg>
                ),
              },
              {
                name: "NC State Boards",
                authority: "NC DHHS & Licensing Boards",
                scope: "LCMHC, LCSW, LMFT, psychologist, and 14 other NC license types",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                ),
              },
              {
                name: "OIG LEIE",
                authority: "HHS Office of Inspector General",
                scope: "Excluded individuals and entities — mandatory for Medicaid/Medicare billing",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                ),
              },
              {
                name: "SAM.gov",
                authority: "GSA System for Award Management",
                scope: "Federal debarment and suspension — required for federally funded programs",
                icon: (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                ),
              },
            ].map((db, i) => (
              <FadeIn key={i} delay={i * 55} className={i === 3 ? "sm:col-span-1 md:col-start-1" : i === 4 ? "sm:col-span-1" : ""}>
                <div style={{
                  borderRadius: 8,
                  border: "1px solid rgba(58,140,92,0.18)",
                  background: "rgba(255,255,255,0.04)",
                  padding: "22px 18px",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column" as const,
                  gap: 12,
                  transition: "border-color 200ms, background 200ms",
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(58,140,92,0.45)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(58,140,92,0.07)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(58,140,92,0.18)"; (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: "rgba(58,140,92,0.1)", border: "1px solid rgba(58,140,92,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {db.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: C.ui, fontSize: "0.82rem", fontWeight: 700, color: "#4FAD74", marginBottom: 3 }}>{db.name}</div>
                    <div style={{ fontFamily: C.ui, fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.05em", color: "rgba(74,222,128,0.5)", textTransform: "uppercase" as const, marginBottom: 8 }}>{db.authority}</div>
                    <div style={{ fontFamily: C.body, fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.55 }}>{db.scope}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Outcome strip */}
          <FadeIn delay={300}>
            <div style={{
              borderRadius: 8,
              border: "1px solid rgba(58,140,92,0.18)",
              background: "rgba(58,140,92,0.05)",
              padding: "20px 28px",
              display: "flex",
              flexWrap: "wrap" as const,
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CheckCircle size={16} color="#3A8C5C" />
                <span style={{ fontFamily: C.body, fontSize: "0.88rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>
                  Every check runs automatically — no manual lookups, no spreadsheet updates.
                </span>
              </div>
              <button onClick={handleSignUp} style={{
                background: "#3A8C5C",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
                fontFamily: C.ui, fontSize: "0.82rem", fontWeight: 700,
                color: "#020F05",
                cursor: "pointer",
                letterSpacing: "0.03em",
                flexShrink: 0,
                transition: "background 150ms, box-shadow 150ms",
                boxShadow: "0 0 20px rgba(58,140,92,0.35)",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#2D7A4F"; e.currentTarget.style.boxShadow = "0 0 30px rgba(58,140,92,0.55)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#3A8C5C"; e.currentTarget.style.boxShadow = "0 0 20px rgba(58,140,92,0.35)"; }}
              >
                Start Free 14-Day Trial →
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION 2: TRUST BAND ──────────────────────────────── */}
      <section style={{ background: "#0F2318", borderBottom: "1px solid rgba(58,140,92,0.1)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 clamp(16px, 4vw, 40px)" }}>
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ borderBottom: "1px solid rgba(58,140,92,0.1)" }}>
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
                stat: "ABA & Autism",
                label: "BCBA, BCaBA, RBT certification and supervision tracking",
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.9 1.17h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                ),
                stat: "Mental Health",
                label: "LCMHC, LCSW, LMFT, LPC license and CEU tracking",
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                ),
                stat: "Psychology",
                label: "Psychologist license, NPI, CE credits, and malpractice COI",
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                ),
                stat: "Home Care",
                label: "Background checks, CPR, OIG LEIE, and SAM.gov exclusion screening",
              },
            ].map((item, i) => (
              <div key={i} style={{
                padding: "18px 24px",
                borderRight: (i % 2 === 0) ? "1px solid rgba(58,140,92,0.1)" : "none",
                borderBottom: i < 2 ? "1px solid rgba(58,140,92,0.1)" : "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  {item.icon}
                  <div style={{ fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 700, color: "#4FAD74", letterSpacing: "-0.01em" }}>{item.stat}</div>
                </div>
                <div style={{ fontFamily: C.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{
            display: "flex", flexWrap: "wrap", alignItems: "center",
            gap: "10px 20px",
            padding: "12px 24px",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
              {[
                "ABA · Mental Health · Psychology · Home Care",
                "NC Medicaid & CARF aware",
                "No IT setup required",
              ].map((label, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle size={10} color="#3A8C5C" />
                  <span style={{ fontFamily: C.ui, fontSize: "0.68rem", fontWeight: 500, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>{label}</span>
                </span>
              ))}
            </div>
            <a href="/how-it-works" style={{
              background: "transparent",
              border: "1px solid rgba(58,140,92,0.4)",
              borderRadius: 6,
              padding: "8px 20px",
              fontFamily: C.ui, fontSize: "0.78rem", fontWeight: 600,
              color: "#4FAD74",
              cursor: "pointer",
              letterSpacing: "0.03em",
              textDecoration: "none",
              display: "inline-flex", alignItems: "center", gap: 6,
              transition: "border-color 150ms, color 150ms, background 150ms",
              whiteSpace: "nowrap" as const,
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(58,140,92,0.75)"; (e.currentTarget as HTMLAnchorElement).style.color = "#3A8C5C"; (e.currentTarget as HTMLAnchorElement).style.background = "rgba(58,140,92,0.08)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(58,140,92,0.4)"; (e.currentTarget as HTMLAnchorElement).style.color = "#4FAD74"; (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
            >
              See How It Works →
            </a>
          </div>
        </div>
      </section>

      {/* ── SECTION: HOW IT WORKS ───────────────────────────────────── */}
      <section id="how-it-works" style={{ background: C.paper, borderBottom: `1px solid ${C.rule}`, padding: "clamp(40px, 6vw, 80px) clamp(20px, 5vw, 40px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <SectionLabel>How It Works</SectionLabel>
              <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
                Audit-ready in three steps.
              </h2>
              <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
                No IT setup. No spreadsheets. No last-minute scrambles.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "24px 0" }}>
            {[
              {
                step: "01",
                title: "Add Your Staff",
                desc: "Import your team or add them one by one. Takes 5 minutes. No IT help needed.",
                detail: "Upload a CSV or type names manually. Each staff member gets their own credential profile.",
              },
              {
                step: "02",
                title: "Verify Against National Databases",
                desc: "AuditReady checks your staff credentials live against national and state databases — NPI Registry, BACB, NC state license boards, OIG LEIE exclusion list, and more.",
                detail: "No manual lookups. No phone calls. One click confirms a credential is real, active, and in good standing.",
              },
              {
                step: "03",
                title: "Stay Audit-Ready",
                desc: "Get alerts before anything expires. Export a clean compliance report in one click.",
                detail: "Reminders go out at 90, 60, and 30 days. When an auditor arrives, your report is ready in seconds.",
              },
            ].map((item, i) => (
              <div key={i} className={`${i < 2 ? "md-border-right" : ""} how-it-works-step${i < 2 ? " how-it-works-step-divider" : ""}`} style={{
                padding: "0 clamp(12px, 2.5vw, 36px)",
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#3A8C5C",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                  boxShadow: "0 0 20px rgba(58,140,92,0.28)",
                  opacity: 1,
                }}>
                  <span style={{ fontFamily: C.ui, fontSize: "0.78rem", fontWeight: 800, color: "#fff", letterSpacing: "0.05em" }}>{item.step}</span>
                </div>
                <FadeIn delay={i * 120}>
                  <h3 style={{ fontFamily: C.display, fontSize: "1.25rem", fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", marginBottom: 8, lineHeight: 1.2 }}>
                    {item.title}
                  </h3>
                  <p style={{ fontFamily: C.body, fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.65, marginBottom: 10 }}>
                    {item.desc}
                  </p>
                  <p style={{ fontFamily: C.body, fontSize: "0.8rem", color: C.inkLight, lineHeight: 1.6, borderTop: `1px solid ${C.rule}`, paddingTop: 10 }}>
                    {item.detail}
                  </p>
                </FadeIn>
              </div>
            ))}
          </div>

          <FadeIn delay={360}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "10px 20px", marginTop: 40, marginBottom: 8 }}>
              <span style={{ fontFamily: C.ui, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Verified Sources</span>
              {["NPI Registry", "BACB", "NC State Boards", "OIG LEIE", "SAM.gov"].map(src => (
                <span key={src} style={{ fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 600, color: C.inkMid, background: C.tab, border: `1px solid ${C.rule}`, borderRadius: 3, padding: "4px 10px", letterSpacing: "0.02em" }}>{src}</span>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={400}>
            <div style={{ textAlign: "center", marginTop: 36 }}>
              <button onClick={handleSignUp} style={{
                background: "#3A8C5C",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                padding: "14px 36px",
                fontFamily: C.ui,
                fontSize: "0.92rem",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.01em",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 24px rgba(58,140,92,0.35)",
                transition: "background 150ms ease-out, transform 100ms ease-out, box-shadow 150ms",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#15803D"; e.currentTarget.style.boxShadow = "0 6px 32px rgba(22,101,52,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#2D7A4F"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(58,140,92,0.35)"; }}
                onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
                onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
              >
                Start Your Free 14-Day Trial <ArrowRight size={15} />
              </button>
                            <p style={{ fontFamily: C.ui, fontSize: "0.75rem", color: C.inkFaint, marginTop: 10, letterSpacing: "0.02em" }}>
                No credit card required · Cancel anytime · Setup in under 10 minutes
              </p>

            </div>
          </FadeIn>
        </div>
      </section>
      {/* ── SECTION 2b: PAIN / SAVINGS STATEMENT ─────────────────────────── */}
      <section style={{ background: "#0F2318", borderBottom: "1px solid rgba(58,140,92,0.1)", padding: "clamp(36px, 5vw, 52px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: 3, padding: "6px 14px", marginBottom: 24 }}>
              <AlertTriangle size={13} color="#F87171" />
              <span style={{ fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#F87171" }}>The real cost of manual tracking</span>
            </div>
            <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
              Avoid missed renewals, failed audits, and lost billing opportunities caused by expired credentials.
            </h2>
            <p style={{ fontFamily: C.body, fontSize: "1.05rem", color: "rgba(255,255,255,0.6)", maxWidth: 680, margin: "0 auto 32px", lineHeight: 1.75 }}>
              One expired BCBA license can trigger a billing denial, a corrective action plan, or a failed payer audit. AuditReady catches it 90 days before it happens — automatically.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, maxWidth: 780, margin: "0 auto" }}>
                {[
                {
                  svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
                  label: "Billing denial",
                  sub: "Lapsed RBT certification",
                  accentColor: "#F87171",
                  accentBg: "rgba(248,113,113,0.12)",
                  border: "rgba(248,113,113,0.25)",
                  labelColor: "#FFFFFF",
                  subColor: "rgba(255,255,255,0.55)",
                },
                {
                  svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
                  label: "Corrective action",
                  sub: "Failed payer audit",
                  accentColor: "#94A3B8",
                  accentBg: "rgba(148,163,184,0.10)",
                  border: "rgba(148,163,184,0.20)",
                  labelColor: "#FFFFFF",
                  subColor: "rgba(255,255,255,0.55)",
                },
                {
                  svg: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3A8C5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                  label: "Last-minute scramble",
                  sub: "License expires mid-audit",
                  accentColor: "#3A8C5C",
                  accentBg: "rgba(58,140,92,0.12)",
                  border: "rgba(58,140,92,0.25)",
                  labelColor: "#FFFFFF",
                  subColor: "rgba(255,255,255,0.55)",
                },
              ].map((item, i) => (
                <div key={i} style={{ background: item.accentBg, border: `1px solid ${item.border}`, borderRadius: 8, padding: "20px 16px", textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>{item.svg}</div>
                  <div style={{ fontFamily: C.ui, fontSize: "0.82rem", fontWeight: 700, color: item.labelColor, marginBottom: 4, lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ fontFamily: C.body, fontSize: "0.75rem", color: item.subColor, lineHeight: 1.5 }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION 2c: PRODUCT SCREENSHOTS ──────────────────────────────────── */}
      <section style={{ background: "#0F2318", padding: "clamp(48px, 6vw, 72px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
                <div style={{ width: 20, height: 1, background: "#3A8C5C" }} />
                <span style={{ fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3A8C5C" }}>See It In Action</span>
                <div style={{ width: 20, height: 1, background: "#3A8C5C" }} />
              </div>
              <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, color: "#F4F0E8", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
                What AuditReady actually looks like.
              </h2>
              <p style={{ fontFamily: C.body, fontSize: "1rem", color: "rgba(244,240,232,0.55)", maxWidth: 520, margin: "0 auto" }}>
                A clean, purpose-built dashboard — not a generic HR tool adapted for compliance. Dashboard theme is customizable to match your organization's branding.
              </p>
            </div>
          </FadeIn>

          {/* Tab-style screenshot switcher */}
          <ScreenshotTabs />
        </div>
      </section>

      {/* ── SECTION 2d: WALKTHROUGH VIDEO ─────────────────────────────────── */}
      <section id="walkthrough" style={{ background: "#0A1A0F", padding: "clamp(56px, 6vw, 80px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 20, height: 1, background: "#3A8C5C" }} />
                <span style={{ fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#3A8C5C" }}>Product Walkthrough</span>
                <div style={{ width: 20, height: 1, background: "#3A8C5C" }} />
              </div>
              <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
                See AuditReady in 90 seconds.
              </h2>
              <p style={{ fontFamily: C.body, fontSize: "1rem", color: "rgba(255,255,255,0.55)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
                A quick walkthrough of the dashboard, credential registry, and one-click audit export.
              </p>
            </div>
          </FadeIn>
          <FadeIn delay={120}>
            <div style={{
              borderRadius: 10,
              overflow: "hidden",
              border: "1px solid rgba(58,140,92,0.2)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
              background: "#000",
            }}>
              <video
                controls
                preload="metadata"
                poster="/manus-storage/screenshot-dashboard-clean_1a9f89da.webp"
                style={{ width: "100%", display: "block", maxHeight: 540, objectFit: "contain" }}
              >
                <source src="/manus-storage/auditready-walkthrough-final_66c50fd7.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION 3: KEY FEATURES ────────────────────────────────────────── */}
      <section id="features" style={{ background: C.paper, padding: "clamp(48px, 5vw, 64px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 20, height: 1, background: C.forest, borderRadius: 1 }} />
                <span style={{ fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: C.forest }}>Features</span>
              </div>
              <h2 style={{ fontFamily: C.display, fontSize: "clamp(2.2rem, 4vw, 3.2rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", marginBottom: 16, lineHeight: 1.05 }}>
                Built for ABA agencies. Purpose-built for BACB compliance.
              </h2>
              <p style={{ fontFamily: C.body, fontSize: "1.05rem", color: C.inkLight, maxWidth: 560, lineHeight: 1.75, marginBottom: 0 }}>
                Track BCBA, BCaBA, and RBT certifications. Monitor supervision ratios. Run OIG exclusion checks. Walk into any audit with confidence — without storing a single patient record.
              </p>
            </div>
          </FadeIn>

          {/* Feature grid — 3 columns, clean SaaS cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 1, background: C.ruleDark, border: `1px solid ${C.ruleDark}`, borderRadius: 8, overflow: "hidden", marginTop: 8 }}>
            {[
              {
                icon: FolderOpen,
                title: "Credential Tracking",
                body: "Every license, certification, CPR card, background check, and training record in one dashboard. Each credential has its own status, expiration date, document location, and verification history.",
                tag: "BCBA · RBT · LCMHC · LCSW · CPR · and more",
              },
              {
                icon: Bell,
                title: "Expiration Reminders",
                body: "Automatic email alerts at 90, 60, and 30 days before any credential expires. Reminders go to the admin and optionally to the staff member directly.",
                tag: "Configurable per credential type",
              },
              {
                icon: ScanLine,
                title: "Document Upload & Storage",
                body: "Attach licenses, certifications, and background checks directly to each staff credential record. Documents are stored securely and linked to the credential they support.",
                tag: "PDF · photo · any file type",
              },
              {
                icon: BadgeCheck,
                title: "Verification Support",
                body: "Check BCBA, RBT, LCMHC, LCSW, and other license types against NC state boards and the BACB. AuditReady records the verification date — your agency confirms the result.",
                tag: "CARF · Joint Commission · NC Medicaid",
              },
              {
                icon: FileDown,
                title: "Audit-Ready Export",
                body: "One click generates a clean, organized report of every staff credential — ready for any state board review, accreditation survey, or internal audit.",
                tag: "PDF summary · CSV data · per-staff packet",
              },
              {
                icon: LayoutDashboard,
                title: "Readiness Dashboard",
                body: "See at a glance who is fully compliant, who has credentials expiring soon, and who needs immediate attention. Color-coded by status — no spreadsheet hunting.",
                tag: "Filter by type, window, role, or department",
              },
            ].map((f, i) => (
              <FadeIn key={i} delay={i * 40}>
                <div
                  style={{
                    padding: "28px 26px",
                    background: "#FFFFFF",
                    height: "100%",
                    border: "1px solid #E8EDE8",
                    borderRadius: 8,
                    transition: "border-color 160ms ease-out, box-shadow 160ms ease-out",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#3A8C5C"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(58,140,92,0.12)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "#E8EDE8"; (e.currentTarget as HTMLDivElement).style.boxShadow = "none"; }}
                >
                  <div style={{ marginBottom: 14, color: "#3A8C5C" }}><f.icon size={22} strokeWidth={1.75} /></div>
                  <h3 style={{ fontFamily: C.ui, fontSize: "1rem", fontWeight: 700, color: "#0A0F0A", letterSpacing: "-0.01em", marginBottom: 10, lineHeight: 1.3 }}>{f.title}</h3>
                  <p style={{ fontFamily: C.body, fontSize: "0.88rem", color: "#1E2A1E", lineHeight: 1.75, marginBottom: 14 }}>{f.body}</p>
                  <div style={{ fontFamily: C.meta, fontSize: "0.62rem", color: "#3A8C5C", letterSpacing: "0.04em", lineHeight: 1.5 }}>{f.tag}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: BEFORE / AFTER COMPARISON ─────────────────────────── */}
      <section style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, padding: "clamp(40px, 5vw, 64px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 20, height: 1, background: C.ruleDark }} />
                <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: C.inkFaint }}>Why Switch</span>
                <div style={{ width: 20, height: 1, background: C.ruleDark }} />
              </div>
              <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
                Spreadsheet vs. AuditReady.
              </h2>
              <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
                Here's the specific difference when you replace manual tracking with AuditReady.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={80}>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 2, borderRadius: 6, overflow: "hidden", border: `1px solid ${C.ruleDark}` }}>
              {/* Before column */}
              <div style={{ background: C.paperDark, padding: "28px 32px" }}>
                <div style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.inkFaint, marginBottom: 20 }}>
                  Spreadsheet
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
                  {[
                    { label: "Manual reminders", sub: "Rely on memory or calendar alerts" },
                    { label: "Multiple files", sub: "Scattered across email, Drive, and binders" },
                    { label: "Manual audit prep", sub: "Hours of gathering and formatting docs" },
                    { label: "No verification workflow", sub: "You look it up yourself, one by one" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <span style={{ color: "#C0392B", fontSize: "1rem", lineHeight: 1.5, flexShrink: 0 }}>✕</span>
                      <div>
                        <div style={{ fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{item.label}</div>
                        <div style={{ fontFamily: C.body, fontSize: "0.78rem", color: C.inkFaint, lineHeight: 1.5, marginTop: 2 }}>{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* After column */}
              <div style={{ background: "#0F2318", padding: "28px 32px" }}>
                <div style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.55)", marginBottom: 20 }}>
                  AuditReady
                </div>
                <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
                  {[
                    { label: "Automatic alerts", sub: "90, 60, and 30 days before expiration" },
                    { label: "One dashboard", sub: "Every credential, every staff member, one view" },
                    { label: "One-click audit export", sub: "PDF or CSV, organized and ready instantly" },
                    { label: "Built-in verification", sub: "BACB, NPI, OIG LEIE, NC State Boards" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <CheckCircle size={16} color="#4FAD74" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.3 }}>{item.label}</div>
                        <div style={{ fontFamily: C.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.5, marginTop: 2 }}>{item.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={160}>
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <button onClick={handleSignUp} style={{
                background: "#3A8C5C", color: "#0F2318", border: "none",
                borderRadius: 8, padding: "12px 32px",
                fontFamily: C.ui, fontSize: "0.88rem", fontWeight: 700,
                cursor: "pointer", letterSpacing: "0.01em",
                transition: "background 150ms, box-shadow 150ms",
                boxShadow: "0 4px 20px rgba(58,140,92,0.3)",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#15803D"; e.currentTarget.style.boxShadow = "0 6px 28px rgba(22,101,52,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#2D7A4F"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(58,140,92,0.3)"; }}
              >
                Start Free 14-Day Trial →
              </button>
              <p style={{ fontFamily: C.body, fontSize: "0.72rem", color: C.inkFaint, marginTop: 10 }}>No credit card required · Cancel anytime</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION: TRUST SIGNAL BAR ─────────────────────────────────────── */}
      <section style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, borderBottom: `1px solid ${C.rule}`, padding: "clamp(20px, 3vw, 32px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <span style={{ fontFamily: C.ui, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.inkFaint }}>
                Built for ABA, Mental Health, and Behavioral Health Agencies
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" style={{ gap: "10px 16px", marginTop: 4 }}>
              {[
                { icon: "✓", label: "OIG LEIE exclusion screening" },
                { icon: "✓", label: "NPI Registry verification" },
                { icon: "✓", label: "BACB certification status" },
                { icon: "✓", label: "NC state board license checks" },
                { icon: "✓", label: "SAM.gov federal debarment" },
                { icon: "✓", label: "Expiration reminders (90/60/30 days)" },
                { icon: "✓", label: "Audit-ready export in one click" },
                { icon: "✓", label: "Staff compliance dashboard" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontFamily: C.ui, fontSize: "0.75rem", fontWeight: 700, color: C.forest, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                  <span style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkMid, lineHeight: 1.45 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION: WHO IT'S FOR ───────────────────────────────── */}
      <section id="clinics" style={{ background: C.paperDark, borderTop: `1px solid ${C.rule}`, padding: "clamp(40px, 5vw, 56px) clamp(16px, 3vw, 24px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Who It's For</span>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
            </div>
            <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
              Built for your agency type — not a generic HR checklist.
            </h2>
            <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 560, lineHeight: 1.7, marginBottom: 36 }}>
              AuditReady tracks the exact credential types each agency type is audited on — not a generic HR checklist.
            </p>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4" style={{ gap: 1, background: C.ruleDark, border: `1px solid ${C.ruleDark}`, borderRadius: 6, overflow: "hidden" }}>
            {[
              {
                title: "ABA Agencies",
                sub: "BACB & state board compliance",
                color: C.forest,
                bg: C.forestBg,
                href: "/who-its-for",
                cta: "See how ABA agencies use AuditReady",
                items: ["RBT certification", "BCBA / BCaBA license", "CPR / First Aid", "Background checks", "Supervision agreements", "Training certificates"],
              },
              {
                title: "Mental Health Clinics",
                sub: "State licensure & payer credentialing",
                color: C.amber,
                bg: C.amberBg,
                href: "/who-its-for",
                cta: "See how mental health clinics use AuditReady",
                items: ["LCSW / LMHC / LMFT / LPC", "CE credits (40 hrs/cycle)", "Malpractice insurance COI", "NPI registration", "CAQH profile", "Required trainings"],
              },
              {
                title: "Psychology Practices",
                sub: "Private practice & group practice",
                color: C.forest,
                bg: C.forestBg,
                href: "/who-its-for",
                cta: "See how psychology practices use AuditReady",
                items: ["Psychologist license", "CE credits", "Malpractice insurance COI", "NPI registration", "CAQH profile", "Required trainings"],
              },
              {
                title: "Home Care Agencies",
                sub: "State & payer compliance",
                color: C.amber,
                bg: C.amberBg,
                href: "/who-its-for",
                cta: "See how home care agencies use AuditReady",
                items: ["Caregiver training certificates", "CPR / First Aid", "Background checks", "TB / health clearance", "Onboarding documents", "Annual in-service training"],
              },
            ].map((col, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div style={{ background: C.paper, padding: "28px 24px", height: "100%", display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: C.ui, fontSize: "0.62rem", fontWeight: 700, color: col.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{col.title}</span>
                  </div>
                  <div style={{ fontFamily: C.body, fontSize: "0.78rem", color: C.inkLight, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${C.rule}` }}>{col.sub}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                    {col.items.map((item, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: col.color, flexShrink: 0, marginTop: 6 }} />
                        <span style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkMid, lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href={col.href || "/how-it-works"}
                    style={{
                      marginTop: 22,
                      display: "flex", alignItems: "center", gap: 6,
                      background: "none", border: "none", cursor: "pointer", padding: 0,
                      fontFamily: C.ui, fontSize: "0.78rem", fontWeight: 600,
                      color: col.color, textDecoration: "none",
                    }}
                  >
                    {col.cta}
                    <span style={{ fontSize: "0.9em" }}>→</span>
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      {/* ── SECTION 4: DASHBOARD PREVIEW ─────────────────────────── */}
      <section style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, padding: "clamp(36px, 5vw, 52px) clamp(16px, 3vw, 24px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Product Preview</span>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
            </div>
            <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
              This is what your compliance dashboard looks like.
            </h2>
            <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 520, lineHeight: 1.7, marginBottom: 28 }}>
              The mock below shows a sample agency with 55 staff. Every credential, every expiration date, every renewal — visible in one place. No spreadsheet, no manual tracking.
            </p>
          </FadeIn>

          <FadeIn delay={60}>
            <div style={{ background: "#fff", border: `1px solid ${C.ruleDark}`, borderRadius: 8, overflow: "hidden", boxShadow: "0 8px 40px rgba(26,26,26,0.1), 0 2px 8px rgba(26,26,26,0.06)" }}>
              <div style={{ background: C.forest, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src={MONOGRAM_URL} alt="AR" loading="lazy" decoding="async" style={{ height: 20, width: 20, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.9 }} />
                  <span style={{ fontFamily: C.meta, fontSize: "0.62rem", color: "rgba(244,240,232,0.85)", letterSpacing: "0.1em", textTransform: "uppercase" }}>AuditReady — Compliance Dashboard</span>
                  <span style={{ fontFamily: C.meta, fontSize: "0.52rem", color: "rgba(244,240,232,0.45)", letterSpacing: "0.06em", marginLeft: 8 }}>Example agency dashboard</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3A8C5C" }} />
                  <span style={{ fontFamily: C.meta, fontSize: "0.55rem", color: "rgba(244,240,232,0.5)" }}>Live</span>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4" style={{ borderBottom: `1px solid ${C.rule}` }}>
                {[
                  { label: "Total Staff", value: "55", sub: "Active members", color: C.ink },
                  { label: "Current", value: "47", sub: "All credentials valid", color: "#2D6A4F" },
                  { label: "Expiring Soon", value: "6", sub: "Within 90 days", color: C.amber },
                  { label: "Expired / Critical", value: "2", sub: "Immediate action needed", color: C.stampRed },
                ].map((kpi, i) => (
                  <div key={i} style={{ padding: "18px 20px", borderRight: i < 3 ? `1px solid ${C.rule}` : "none" }}>
                    <div style={{ fontFamily: C.meta, fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 6 }}>{kpi.label}</div>
                    <div style={{ fontFamily: C.meta, fontSize: "1.8rem", fontWeight: 600, color: kpi.color, lineHeight: 1, letterSpacing: "-0.03em" }}>{kpi.value}</div>
                    <div style={{ fontFamily: C.body, fontSize: "0.68rem", color: C.inkFaint, marginTop: 4 }}>{kpi.sub}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ borderBottom: `1px solid ${C.rule}` }}>
                <div className="border-b md:border-b-0 md:border-r" style={{ borderColor: C.rule }}>
                  <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.rule}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontFamily: C.meta, fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkLight }}>Expiring in 90 Days</span>
                    <span style={{ fontFamily: C.meta, fontSize: "0.55rem", color: C.amber }}>6 credentials</span>
                  </div>
                  {[
                    { name: "Thompson, James", cred: "RBT Certification", expires: "Jun 30, 2025", days: 41, status: "expiring" as const },
                    { name: "Rivera, Carmen", cred: "CPR / First Aid", expires: "Jul 14, 2025", days: 55, status: "expiring" as const },
                    { name: "Patel, Anita", cred: "LCMHC License", expires: "Mar 01, 2024", days: -1, status: "expired" as const },
                    { name: "Chen, Wei", cred: "Bloodborne Pathogens", expires: "Aug 02, 2025", days: 74, status: "expiring" as const },
                  ].map((row, i) => {
                    const cfg = row.status === "expired"
                      ? { dot: C.stampRed, label: "Expired", labelColor: C.stampRed, bg: "#FAEAE8" }
                      : { dot: "#F59E0B", label: `${row.days}d`, labelColor: C.amber, bg: "#FEF3CD" };
                    return (
                      <div key={i} style={{ padding: "10px 20px", borderBottom: i < 3 ? `1px solid ${C.rule}` : "none", display: "flex", alignItems: "center", gap: 12, transition: "background 140ms" }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.paperDark)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: C.body, fontSize: "0.78rem", fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
                          <div style={{ fontFamily: C.meta, fontSize: "0.55rem", color: C.inkFaint, marginTop: 1 }}>{row.cred} · Exp {row.expires}</div>
                        </div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: cfg.bg, borderRadius: 3, padding: "2px 7px", flexShrink: 0 }}>
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }} />
                          <span style={{ fontFamily: C.meta, fontSize: "0.52rem", fontWeight: 600, color: cfg.labelColor, letterSpacing: "0.08em" }}>{cfg.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.rule}` }}>
                    <span style={{ fontFamily: C.meta, fontSize: "0.58rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkLight }}>Quick Actions</span>
                  </div>
                  {[
                    { label: "Export Audit Packet", sub: "PDF + CSV credential report", icon: "↓" },
                    { label: "Run License Verification", sub: "Check BACB & NC state boards", icon: "✓" },
                    { label: "Send Expiration Reminders", sub: "Email staff with upcoming expirations", icon: "✉" },
                    { label: "Add Staff Member", sub: "Import from CSV or add manually", icon: "+" },
                  ].map((action, i) => (
                    <div key={i} style={{ padding: "12px 20px", borderBottom: i < 3 ? `1px solid ${C.rule}` : "none", display: "flex", alignItems: "center", gap: 12, transition: "background 140ms", cursor: "default" }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.paperDark)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: 3, background: C.forestBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontFamily: C.meta, fontSize: "0.75rem", color: C.forest }}>{action.icon}</span>
                      </div>
                      <div>
                        <div style={{ fontFamily: C.body, fontSize: "0.8rem", fontWeight: 600, color: C.ink }}>{action.label}</div>
                        <div style={{ fontFamily: C.meta, fontSize: "0.55rem", color: C.inkFaint, marginTop: 1 }}>{action.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding: "10px 20px", background: C.paperDark, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: C.meta, fontSize: "0.55rem", color: C.inkFaint }}>55 staff members · Last synced just now</span>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#3A8C5C" }} />
                  <span style={{ fontFamily: C.meta, fontSize: "0.55rem", color: "#2D6A4F" }}>Audit-ready</span>
                </div>
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={80}>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.forest, flexShrink: 0 }} />
              <p style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkLight, margin: 0, lineHeight: 1.6 }}>
                Click any staff member to view their credential file, expiration dates, document location, and verification status.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
      {/* ── SECTION 5: COMPLIANCE FRAMEWORKS ───────────────────────── */}
      <section style={{ background: C.paperDark, borderTop: `1px solid ${C.rule}`, padding: "clamp(36px, 5vw, 52px) clamp(16px, 3vw, 24px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Compliance Frameworks</span>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
            </div>
            <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
              Built for the standards that matter.
            </h2>
            <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 520, lineHeight: 1.7, marginBottom: 52 }}>
              AuditReady maps every credential requirement to the specific accreditation standard it satisfies — so your team knows exactly what’s required and why.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 0, border: `1px solid ${C.rule}`, borderRadius: 4, overflow: "hidden" }}>
            {[
              {
                code: "CARF",
                full: "Commission on Accreditation of Rehabilitation Facilities",
                standard: "HR 2.A — Personnel Qualifications",
                items: [
                  "Current license or certification on file",
                  "Primary source verification documented",
                  "Background check current and on file",
                  "Training records complete",
                  "Supervision agreements for provisionally licensed staff",
                ],
                color: C.forest,
              },
              {
                code: "Joint Commission",
                full: "The Joint Commission",
                standard: "HR.01.02.01 — Staff Qualifications",
                items: [
                  "Verified credentials before patient contact",
                  "Ongoing competency assessment",
                  "License expiration monitoring",
                  "OIG/LEIE exclusion check",
                  "Continuing education documented",
                ],
                color: C.inkMid,
              },
              {
                code: "NC Medicaid",
                full: "NC DHHS Medicaid Enrollment",
                standard: "NC Gen Stat § 122C-81",
                items: [
                  "National accreditation within 1–3 years of enrollment",
                  "Staff credential files available on demand",
                  "BACB verification support for ABA providers",
                  "NC state board verification for licensed staff",
                  "Expiration tracking evidence",
                ],
                color: C.amber,
              },
            ].map((fw, i) => (
              <FadeIn key={i} delay={i * 80} className="h-full">
                <div style={{
                  padding: "28px 24px",
                  borderLeft: i > 0 ? `1px solid ${C.rule}` : "none",
                  height: "100%",
                  background: i === 1 ? C.paperDark : C.paper,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: fw.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: C.meta, fontSize: "0.72rem", fontWeight: 700, color: fw.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{fw.code}</span>
                  </div>
                  <div style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkLight, marginBottom: 6 }}>{fw.full}</div>
                  <div style={{ fontFamily: C.meta, fontSize: "0.72rem", color: C.inkMid, letterSpacing: "0.03em", marginBottom: 20, paddingBottom: 16, borderBottom: `1px solid ${C.rule}` }}>{fw.standard}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {fw.items.map((item, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <CheckCircle size={13} color={fw.color} style={{ flexShrink: 0, marginTop: 2 }} />
                        <span style={{ fontFamily: C.body, fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.55 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={100}>
            <div style={{ marginTop: 28, padding: "14px 20px", background: "rgba(184,122,90,0.06)", border: "1px solid rgba(184,122,90,0.18)", borderRadius: 4, display: "flex", alignItems: "flex-start", gap: 10 }}>
              <AlertCircle size={13} color="#B87A5A" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontFamily: C.body, fontSize: "0.85rem", color: C.inkMid, margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: C.ink }}>Surveyors don't give advance notice of which files they'll pull.</strong> Your agency needs to produce any staff's complete credential file on demand, within minutes.
              </p>
            </div>
          </FadeIn>
        </div>
      </section>
      {/* ── SECTION 6: AI WORKFLOW EXPLANATION ──────────────────── */}
      <section style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, padding: "clamp(36px, 5vw, 52px) clamp(16px, 3vw, 24px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>How It Works</span>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
            </div>
            <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
              From spreadsheet to compliance dashboard.
            </h2>
            <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 480, lineHeight: 1.7, marginBottom: 56 }}>
              Three steps, no IT setup, no patient data required.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 0, border: `1px solid ${C.rule}`, borderRadius: 4, overflow: "hidden" }}>
            {[
              {
                step: "01",
                title: "Upload your staff list",
                body: "Import a CSV or add staff manually. AuditReady pre-configures credential requirements for your agency type — ABA, mental health, psychology, or home care.",
                detail: "Takes 5–10 minutes for most agencies.",
              },
              {
                step: "02",
                title: "Add credentials for each staff member",
                body: "Enter the credential type, license number, and expiration date for each staff member. Upload the supporting document directly to the record for instant access during an audit.",
                detail: "Takes 2–3 minutes per staff member. Import tools available for larger teams.",
              },
              {
                step: "03",
                title: "Stay audit-ready automatically",
                body: "Automatic expiration alerts keep your team ahead of renewals. Export a complete audit packet in one click when surveyors arrive.",
                detail: "Designed to support CARF, Joint Commission, and NC Medicaid audit preparation. Agency remains responsible for confirming current requirements.",
              },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{
                  padding: "24px 24px 24px",
                  borderLeft: i > 0 ? `1px solid ${C.rule}` : "none",
                  position: "relative",
                  background: i === 1 ? C.paperDark : C.paper,
                }}>
                  {i < 2 && (
                    <div className="hidden md:block" style={{
                      position: "absolute", top: 44, right: -1, width: 1, height: 32,
                      background: C.ruleDark,
                    }} />
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: C.forest, display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      <span style={{ fontFamily: C.meta, fontSize: "0.65rem", fontWeight: 700, color: "#F4F0E8", letterSpacing: "0.04em" }}>{s.step}</span>
                    </div>
                    <div style={{ flex: 1, height: 1, background: C.rule }} />
                  </div>
                  <h3 style={{ fontFamily: C.ui, fontSize: "1rem", fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ fontFamily: C.body, fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.7, marginBottom: 10 }}>{s.body}</p>
                  <p style={{ fontFamily: C.meta, fontSize: "0.62rem", color: C.inkFaint, letterSpacing: "0.04em", margin: 0 }}>{s.detail}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: TESTIMONIALS / DEMO ───────────────────────── */}
      <section id="about" style={{ background: C.paperDark, borderTop: `1px solid ${C.rule}`, padding: "clamp(32px, 4vw, 48px) clamp(16px, 3vw, 24px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <FadeIn>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Why AuditReady</span>
                <div style={{ flex: 1, height: 1, background: C.rule }} />
              </div>
              <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
                Credential tracking built for care agencies — not generic HR systems.
              </h2>
              <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: C.inkMid, lineHeight: 1.7, marginBottom: 14 }}>
                Enterprise HR software was built for hospitals. It costs $10,000/year and doesn't know the difference between an RBT, an LCSW, or a home care aide. Generic spreadsheets work until they don't — and they always fail at the worst time.
              </p>
              <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: C.inkMid, lineHeight: 1.7, marginBottom: 28 }}>
                AuditReady is an administrative tracking tool built specifically for ABA agencies, mental health clinics, psychology practices, and home care agencies. Every credential type pre-configured. Your agency remains responsible for confirming current requirements with the relevant licensing board or accreditation body.
              </p>

              {/* Comparison table — document style */}
              <div style={{ border: `1px solid ${C.ruleDark}`, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px 80px", padding: "8px 14px", background: C.tab, borderBottom: `1px solid ${C.rule}` }}>
                  <span style={{ fontFamily: C.meta, fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }} />
                  {["AuditReady", "Enterprise HR", "Spreadsheet"].map((h, i) => (
                    <span key={i} style={{ fontFamily: C.meta, fontSize: "0.52rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: i === 0 ? C.forest : C.inkFaint, textAlign: "center" }}>{h}</span>
                  ))}
                </div>
                {[
                  { label: "Care agency credential types", ar: true, ent: false, gen: false },
                  { label: "BACB verification support",     ar: true, ent: false, gen: false },
                  { label: "Document upload & secure storage",  ar: true, ent: false, gen: false },
                  { label: "No patient data required",      ar: true, ent: false, gen: true  },
                  { label: "No enterprise HR contract",       ar: true, ent: false, gen: false },
                  { label: "NC state board verification",   ar: true, ent: false, gen: false },
                ].map((row, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 70px 90px 80px", padding: "9px 14px", background: i % 2 === 0 ? C.paper : C.paperDark, borderBottom: i < 5 ? `1px solid ${C.rule}` : "none" }}>
                    <span style={{ fontFamily: C.body, fontSize: "0.78rem", color: C.inkMid }}>{row.label}</span>
                    {[row.ar, row.ent, row.gen].map((v, j) => (
                      <div key={j} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                        {v ? <CheckCircle size={12} color={j === 0 ? C.forest : C.inkGhost} /> : <span style={{ color: C.inkGhost, fontSize: "0.9rem" }}>—</span>}
                      </div>
                    ))}
                  </div>
                ))}
                <div style={{ padding: "10px 14px", background: C.forest }}>
                  <p style={{ fontFamily: C.meta, fontSize: "0.62rem", color: "rgba(244,240,232,0.8)", margin: 0, letterSpacing: "0.04em" }}>
                    An administrative tracking platform for ABA, mental health, psychology, and home care agencies.
                  </p>
                </div>
              </div>{/* end scrollable wrapper */}
              </div>{/* end table border wrapper */}
            </FadeIn>

            {/* Pre-launch social proof — founding agency framing */}
            <FadeIn delay={100}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Early Access</span>
                <div style={{ flex: 1, height: 1, background: C.rule }} />
              </div>

              {/* Founding agency callout */}
              <div style={{ background: "#0F2318", borderRadius: 6, padding: "24px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.forest}, transparent)` }} />
                <div style={{ fontFamily: C.ui, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.forest, marginBottom: 10 }}>Founding Agency Program</div>
                <p style={{ fontFamily: C.body, fontSize: "0.88rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.65, margin: "0 0 14px" }}>
                  We're onboarding a limited cohort of founding agencies who help shape the product roadmap. Founding agencies receive locked-in pricing, direct access to the team, and early access to every new feature.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    "Locked-in founding rate — never increases",
                    "Direct line to the product team",
                    "First access to new verification sources",
                    "Your workflows influence the roadmap",
                  ].map((item) => (
                    <div key={item} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={12} color={C.forest} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                      <span style={{ fontFamily: C.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Industry trust signals */}
              <div style={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "20px", marginBottom: 16 }}>
                <div style={{ fontFamily: C.ui, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.forest, marginBottom: 14 }}>Built Around Industry Standards</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { name: "BACB Ethics Code", desc: "BCBA, BCaBA, RBT certification and supervision tracking" },
                    { name: "NC Medicaid / NCTracks", desc: "Credential requirements for NC behavioral health providers" },
                    { name: "OIG LEIE & SAM.gov", desc: "Federal exclusion screening for Medicaid-funded programs" },
                    { name: "CARF Accreditation", desc: "Documentation and expiration tracking for survey readiness" },
                  ].map((f) => (
                    <div key={f.name} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <CheckCircle size={12} color={C.forest} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <span style={{ fontFamily: C.ui, fontSize: "0.78rem", fontWeight: 600, color: C.ink }}>{f.name}</span>
                        <span style={{ fontFamily: C.body, fontSize: "0.75rem", color: C.inkLight, marginLeft: 6 }}>{f.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* No PHI / privacy trust signal */}
              <div style={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 4, background: "rgba(58,140,92,0.08)", border: "1px solid rgba(58,140,92,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Lock size={16} color={C.forest} />
                </div>
                <div>
                  <div style={{ fontFamily: C.ui, fontSize: "0.78rem", fontWeight: 700, color: C.ink, marginBottom: 3 }}>No patient data. No PHI. Ever.</div>
                  <div style={{ fontFamily: C.body, fontSize: "0.75rem", color: C.inkLight, lineHeight: 1.6 }}>AuditReady tracks staff credentials and agency documents only. Patient records are never required, collected, or stored. Built for organization support — not legal advice.</div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>


      {/* ── WHY TRUST AUDITREADY ──────────────────────────────────────── */}
      <section id="trust" style={{ background: C.paperDark, borderTop: `1px solid ${C.rule}`, padding: "clamp(40px, 5vw, 64px) clamp(16px, 3vw, 24px)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <FadeIn>
            {/* Section label */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Why Trust AuditReady</span>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
            </div>

            {/* Heading */}
            <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.5rem, 2.8vw, 2.1rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 28 }}>
              Built for Real Agency Operations
            </h2>

            {/* Body copy */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 36 }}>
              <p style={{ fontFamily: C.body, fontSize: "0.97rem", color: C.inkMid, lineHeight: 1.78, margin: 0 }}>
                AuditReady was created after seeing how many small care agencies still manage staff credentials, trainings, expirations, and onboarding through spreadsheets, disconnected folders, paper files, and multiple systems that rarely communicate with each other.
              </p>
              <p style={{ fontFamily: C.body, fontSize: "0.97rem", color: C.inkMid, lineHeight: 1.78, margin: 0 }}>
                Our goal is simple: help behavioral health, mental health, psychology, ABA, and home care agencies organize credential operations in one place — with clearer visibility, expiration tracking, verification support, and audit readiness workflows.
              </p>
              <p style={{ fontFamily: C.body, fontSize: "0.97rem", color: C.inkMid, lineHeight: 1.78, margin: 0 }}>
                AuditReady is developed by Vibemo Group LLC with a focus on practical operational tools for growing care agencies. We believe small and mid-sized agencies deserve software that is modern, understandable, and affordable — without enterprise complexity.
              </p>
            </div>

            {/* Trust badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
              {[
                "No patient data stored",
                "Administrative tracking platform",
                "Built for operational organization and credential visibility",
              ].map((label) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "8px 14px",
                  background: C.paper,
                  border: `1px solid ${C.rule}`,
                  borderRadius: 3,
                }}>
                  <CheckCircle size={12} color={C.forest} strokeWidth={2.5} />
                  <span style={{ fontFamily: C.ui, fontSize: "0.78rem", fontWeight: 500, color: C.inkMid }}>{label}</span>
                </div>
              ))}
            </div>

            {/* Company identity + address */}
            <div style={{ paddingTop: 20, borderTop: `1px solid ${C.rule}`, display: "flex", flexWrap: "wrap" as const, gap: 20, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontFamily: C.ui, fontSize: "0.78rem", fontWeight: 600, color: C.inkMid, margin: "0 0 4px 0" }}>Vibemo Group LLC</p>
                <p style={{ fontFamily: C.meta, fontSize: "0.7rem", color: C.inkFaint, margin: 0, lineHeight: 1.6 }}>
                  Raleigh, North Carolina · United States<br />
                  contact@useauditready.com
                </p>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontFamily: C.meta, fontSize: "0.65rem", color: C.inkFaint, margin: 0, lineHeight: 1.7, fontStyle: "italic" }}>
                  AuditReady is an administrative tracking platform. Claims related to NC Medicaid, HIPAA, CARF, and audit readiness describe organizational support capabilities — not legal compliance guarantees. Agencies remain responsible for verifying current requirements with the relevant licensing board, payer, or accreditation body.
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>



      {/* ── SECTION: SECURITY & PRIVACY ──────────────────────────────────── */}
      <section id="security" style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, padding: "clamp(40px, 5vw, 64px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 20, height: 1, background: C.forest }} />
                <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: C.forest }}>Security & Privacy</span>
              </div>
              <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 12 }}>
                Your agency's data is protected.
              </h2>
              <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 560, lineHeight: 1.7 }}>
                AuditReady is an administrative credential tracking platform. We do not collect, store, or process patient health information. Here's exactly how your data is handled.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" style={{ gap: 1, background: C.ruleDark, border: `1px solid ${C.ruleDark}`, borderRadius: 8, overflow: "hidden" }}>
            {[
              {
                icon: "🔒",
                title: "No Patient Data",
                body: "AuditReady tracks staff credentials only — licenses, certifications, background checks, and training records. No patient names, therapy notes, billing records, or health information are ever stored.",
                badge: "Zero PHI",
                link: undefined,
              },
              {
                icon: "🛡️",
                title: "Encrypted in Transit & at Rest",
                body: "All data is transmitted over HTTPS/TLS. Your credential records and uploaded documents are encrypted at rest in our database and file storage. No unencrypted data at any layer.",
                badge: "TLS 1.2+",
                link: undefined,
              },
              {
                icon: "🏢",
                title: "Agency-Scoped Access",
                body: "Each agency's data is completely isolated. Your staff records, credentials, and documents are only accessible to your account. No cross-tenant data access is possible.",
                badge: "Tenant isolation",
                link: undefined,
              },
              {
                icon: "📁",
                title: "Secure Document Storage",
                body: "Uploaded license and certification documents are stored in encrypted cloud storage with signed access URLs. Documents are never publicly accessible — only your account can retrieve them.",
                badge: "Signed URLs only",
                link: undefined,
              },
              {
                icon: "🔑",
                title: "Session-Based Authentication",
                body: "Login sessions use secure, httpOnly cookies with short expiration windows. Passwords are never stored in plaintext. Sessions are invalidated immediately on logout.",
                badge: "Secure cookies",
                link: undefined,
              },
              {
                icon: "📋",
                title: "SOC 2 In Progress",
                body: "We are actively working toward SOC 2 Type II certification. In the meantime, we follow SOC 2 security principles across access control, encryption, monitoring, and incident response.",
                badge: "Coming 2026",
                link: "/security" as string | undefined,
              },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 40}>
                <div style={{
                  padding: "26px 24px",
                  background: C.paper,
                  height: "100%",
                  transition: "background 160ms ease-out",
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.paperDark)}
                  onMouseLeave={e => (e.currentTarget.style.background = C.paper)}
                >
                  <div style={{ fontSize: "1.4rem", marginBottom: 12, lineHeight: 1 }}>{item.icon}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <h3 style={{ fontFamily: C.ui, fontSize: "0.95rem", fontWeight: 700, color: C.ink, letterSpacing: "-0.01em", margin: 0, lineHeight: 1.3 }}>{item.title}</h3>
                    <span style={{ fontFamily: C.meta, fontSize: "0.55rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: C.forest, background: C.forestBg, border: `1px solid ${C.forest}`, borderRadius: 2, padding: "2px 6px", whiteSpace: "nowrap" as const }}>{item.badge}</span>
                  </div>
                  <p style={{ fontFamily: C.body, fontSize: "0.83rem", color: C.inkMid, lineHeight: 1.7, margin: 0 }}>{item.body}</p>
                  {item.link && (
                    <a href={item.link} style={{ fontFamily: C.ui, fontSize: "0.75rem", fontWeight: 600, color: C.forest, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10 }}>
                      View our security page →
                    </a>
                  )}
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={260}>
            <div style={{ marginTop: 24, padding: "16px 20px", background: C.paperDark, border: `1px solid ${C.rule}`, borderRadius: 4, display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ color: C.inkFaint, fontSize: "0.9rem", flexShrink: 0, marginTop: 1 }}>ℹ️</span>
              <p style={{ fontFamily: C.body, fontSize: "0.78rem", color: C.inkLight, lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: C.inkMid }}>Administrative tool, not a legal compliance service.</strong> AuditReady helps you organize and track credential records. Your agency remains responsible for confirming current requirements with the relevant licensing board, accreditation body, or payer. <a href="/security" style={{ color: C.forest, textDecoration: "none" }}>Full security details →</a>
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── NCTRACKS DEADLINE SECTION ─────────────────────────────── */}
      <section id="nctracks" style={{ background: "#0F2318", borderTop: "1px solid rgba(58,140,92,0.12)", padding: "clamp(48px, 6vw, 72px) clamp(16px, 3vw, 24px)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 20, height: 1, background: "#3A8C5C", borderRadius: 1, flexShrink: 0 }} />
              <span style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3A8C5C" }}>NC Medicaid Compliance</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: "clamp(32px, 5vw, 64px)", alignItems: "center" }}>

              {/* Left — headline and explanation */}
              <div>
                <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.8rem, 3.5vw, 3rem)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.025em", lineHeight: 1.1, marginBottom: 20 }}>
                  NC Medicaid Requires Documented, Current Staff Credentials.
                </h2>
                <p style={{ fontFamily: C.body, fontSize: "1rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.75, marginBottom: 24, maxWidth: 520 }}>
                  NC DHHS requires all behavioral health providers enrolled in NCTracks to maintain documented, current staff credentials as a condition of Medicaid billing.
                </p>
                <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.7, marginBottom: 32, maxWidth: 520 }}>
                  Credential requirements are tied directly to NCTracks enrollment status. Agencies that cannot produce records on demand risk billing denials, corrective action plans, and enrollment suspension. Building a clean credential record now means you are ready when an auditor asks.
                </p>
                <button
                  onClick={handleSignUp}
                  style={{
                    background: "#3A8C5C", color: "#0F2318",
                    borderRadius: 4, padding: "14px 32px",
                    fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 700,
                    border: "none", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 8,
                    boxShadow: "0 4px 20px rgba(58,140,92,0.3)",
                    transition: "background 150ms ease-out, transform 100ms ease-out",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#4FAD74"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#3A8C5C"; }}
                  onMouseDown={e => (e.currentTarget.style.transform = "scale(0.97)")}
                  onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
                >
                  Start Free 14-Day Trial <ArrowRight size={15} />
                </button>
              </div>

              {/* Right — Medicaid & State Licensing Requirements checklist */}
              <div style={{ background: "rgba(58,140,92,0.04)", border: "1px solid rgba(58,140,92,0.18)", borderRadius: 8, padding: "32px 28px" }}>
                <div style={{ fontFamily: C.ui, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3A8C5C", marginBottom: 6 }}>Medicaid &amp; State Licensing Requirements</div>
                <div style={{ fontFamily: C.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginBottom: 20, lineHeight: 1.5 }}>State Medicaid programs, licensing boards, and payer audits</div>
                {[
                  "Credential files available on demand",
                  "State license verification support",
                  "National certification verification",
                  "Background check documentation",
                  "Exclusion screening records",
                  "Expiration tracking evidence",
                  "Accreditation readiness support",
                ].map((item, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 12,
                    paddingBottom: i < 6 ? 13 : 0,
                    marginBottom: i < 6 ? 13 : 0,
                    borderBottom: i < 6 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  }}>
                    <CheckCircle size={14} color="#3A8C5C" style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: C.ui, fontSize: "0.85rem", fontWeight: 500, color: "rgba(255,255,255,0.9)", lineHeight: 1.4 }}>{item}</span>
                  </div>
                ))}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <p style={{ fontFamily: C.body, fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0, fontStyle: "italic" }}>
                    AuditReady supports national accreditation standards and state-specific credential requirements as your organization expands.
                  </p>
                </div>
                <div style={{ marginTop: 14, display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <AlertCircle size={13} color="#C4862A" style={{ flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontFamily: C.body, fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.6, margin: 0 }}>
                    Always verify current requirements with the relevant licensing board, accreditation body, or NCTracks enrollment specialist.
                  </p>
                </div>
              </div>

            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── PRICING (between sections 8 and 9) ──────────────────────── */}
      <section id="pricing" style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, padding: "clamp(36px, 5vw, 52px) clamp(16px, 3vw, 24px)" }}>      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ marginBottom: 40 }}>
              <SectionLabel>Pricing</SectionLabel>
              <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", marginBottom: 12 }}>
                Simple, seat-based pricing.
              </h2>
              <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 460, lineHeight: 1.7, marginBottom: 24 }}>
                Pay for the size of your agency, not the number of features. Starter and Growth plans include a 14-day free pilot — no credit card required. All plans include a $199 one-time setup fee.
              </p>
              {/* Toggle */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.paperDark, border: `1px solid ${C.rule}`, borderRadius: 3, padding: "3px" }}>
                <button onClick={() => setAnnualPricing(false)} style={{ fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.01em", textTransform: "none", padding: "6px 14px", borderRadius: 2, border: "none", cursor: "pointer", background: !annualPricing ? C.ink : "transparent", color: !annualPricing ? C.paper : C.inkLight, transition: "all 150ms" }}>Monthly</button>
                <button onClick={() => setAnnualPricing(true)} style={{ fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.01em", textTransform: "none", padding: "6px 14px", borderRadius: 2, border: "none", cursor: "pointer", background: annualPricing ? C.ink : "transparent", color: annualPricing ? C.paper : C.inkLight, transition: "all 150ms", display: "flex", alignItems: "center", gap: 7 }}>
                  Annual
                  <span style={{ fontFamily: C.ui, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: C.forest, color: "#F4F0E8", padding: "2px 7px", borderRadius: 2 }}>Save 10%</span>
                </button>
              </div>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
            {pricingTiers.map((tier, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{
                  background: tier.highlight ? C.ink : C.paper,
                  border: tier.highlight ? `1px solid ${C.inkMid}` : `1px solid ${C.ruleDark}`,
                  borderRadius: 6,
                  padding: "32px 28px",
                  boxShadow: tier.highlight ? "0 12px 40px rgba(26,26,26,0.22)" : "0 2px 8px rgba(26,26,26,0.04)",
                  position: "relative",
                }}>
                  {tier.highlight && (
                    <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)" }}>
                      <Stamp label="Most Popular" variant="verified" />
                    </div>
                  )}

                  <div style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.01em", textTransform: "none", color: tier.highlight ? "rgba(244,240,232,0.5)" : C.inkFaint, marginBottom: 4 }}>{tier.tagline}</div>
                  <h3 style={{ fontFamily: C.ui, fontSize: "1.25rem", fontWeight: 700, color: tier.highlight ? "#F4F0E8" : C.ink, letterSpacing: "-0.01em", marginBottom: 2 }}>{tier.name}</h3>
                  <div style={{ fontFamily: C.ui, fontSize: "0.72rem", color: tier.highlight ? "rgba(244,240,232,0.4)" : C.inkFaint, marginBottom: 18 }}>{tier.staff}</div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 4 }}>
                    <span style={{ fontFamily: C.meta, fontSize: "2.1rem", fontWeight: 600, color: tier.highlight ? "#F4F0E8" : C.ink, letterSpacing: "-0.03em" }}>
                      ${annualPricing ? (tier.annual * 12).toLocaleString() : tier.monthly}
                    </span>
                    <span style={{ fontFamily: C.ui, fontSize: "0.75rem", color: tier.highlight ? "rgba(244,240,232,0.4)" : C.inkFaint }}>{annualPricing ? "/yr" : "/mo"}</span>
                  </div>
                  {annualPricing && (
                    <div style={{ fontFamily: C.ui, fontSize: "0.68rem", color: C.forest, letterSpacing: "0.04em", fontWeight: 600, marginBottom: 2 }}>
                      Billed as ${(tier.annual * 12).toLocaleString()} upfront
                    </div>
                  )}
                  {annualPricing && (
                    <div style={{ fontFamily: C.ui, fontSize: "0.68rem", color: tier.highlight ? "rgba(244,240,232,0.35)" : C.inkFaint, marginBottom: 4 }}>
                      ${tier.annual}/mo equivalent · Save ${(tier.monthly - tier.annual) * 12}/yr
                    </div>
                  )}
                  <div style={{ fontFamily: C.ui, fontSize: "0.68rem", color: tier.highlight ? "rgba(244,240,232,0.35)" : C.inkFaint, marginBottom: 4, whiteSpace: "nowrap" }}>
                    + $199 one-time setup fee
                  </div>

                  <div style={{ height: 1, background: tier.highlight ? "rgba(244,240,232,0.1)" : C.rule, margin: "18px 0" }} />

                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {tier.features.map((f, j) => (
                      <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <CheckCircle size={11} color={tier.highlight ? C.forest : C.forest} style={{ flexShrink: 0, marginTop: 4 }} />
                        <span style={{ fontFamily: C.body, fontSize: "0.82rem", color: tier.highlight ? "rgba(244,240,232,0.75)" : C.inkMid, lineHeight: 1.5 }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePricingCta(tier.name)}
                    disabled={createCheckout.isPending}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      width: "100%", textAlign: "center", cursor: createCheckout.isPending ? "not-allowed" : "pointer",
                      background: tier.highlight ? C.paper : C.ink,
                      color: tier.highlight ? C.ink : C.paper,
                      fontFamily: C.ui, fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.01em",
                      textTransform: "none",
                      padding: "11px 20px", borderRadius: 3, border: "none",
                      transition: "background 150ms, color 150ms",
                      opacity: createCheckout.isPending ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!createCheckout.isPending) (e.currentTarget as HTMLElement).style.background = tier.highlight ? C.paperDark : C.inkMid; }}
                    onMouseLeave={e => { if (!createCheckout.isPending) (e.currentTarget as HTMLElement).style.background = tier.highlight ? C.paper : C.ink; }}
                  >
                    {createCheckout.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                    {tier.cta}
                  </button>
                  <div style={{ fontFamily: C.meta, fontSize: "0.58rem", color: tier.highlight ? "rgba(26,26,26,0.35)" : C.inkFaint, letterSpacing: "0.05em", textAlign: "center", marginTop: 10 }}>Cancel anytime.</div>
                  <a href="/security" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, padding: "8px 12px", borderRadius: 3, border: `1px solid ${tier.highlight ? "rgba(244,240,232,0.1)" : C.rule}`, textDecoration: "none", transition: "border-color 150ms" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = tier.highlight ? "rgba(244,240,232,0.25)" : C.ruleDark)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = tier.highlight ? "rgba(244,240,232,0.1)" : C.rule)}
                  >
                    <Lock size={10} color={tier.highlight ? "rgba(244,240,232,0.35)" : C.inkFaint} />
                    <span style={{ fontFamily: C.meta, fontSize: "0.58rem", color: tier.highlight ? "rgba(244,240,232,0.35)" : C.inkFaint, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>Encrypted · No PHI · SOC 2 in progress</span>
                  </a>
                </div>
              </FadeIn>
            ))}
          </div>


        </div>
      </section>

      {/* ── SECTION 9: CTA ───────────────────────────────────────── */}
      <section id="pilot" style={{ background: C.ink, padding: "clamp(40px, 5vw, 60px) clamp(16px, 4vw, 40px)", position: "relative", overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* Subtle radial glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 800, height: 400, background: "radial-gradient(ellipse, rgba(58,140,92,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <FadeIn>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(58,140,92,0.1)", border: "1px solid rgba(58,140,92,0.3)", borderRadius: 100, padding: "6px 18px", marginBottom: 32 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3A8C5C" }} />
              <span style={{ fontFamily: C.ui, fontSize: "0.75rem", fontWeight: 600, color: "#3A8C5C", letterSpacing: "0.04em" }}>14-Day Free Pilot — No Credit Card Required</span>
            </div>

            <h2 style={{ fontFamily: C.display, fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.025em", marginBottom: 12, lineHeight: 1.1 }}>
              The easiest way to stay audit-ready.
            </h2>
            <p style={{ fontFamily: C.body, fontSize: "1rem", color: "rgba(255,255,255,0.65)", lineHeight: 1.7, marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
              Set up your credential dashboard in one session. No IT, no spreadsheets, no patient data. Just a clear view of who’s compliant and what’s expiring next.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 28 }}>
              <button
                onClick={handleSignUp}
                style={{
                  background: "#3A8C5C", color: "#0F2318", borderRadius: 4, padding: "14px 32px",
                  fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 700,
                  border: "none", cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  transition: "background 150ms",
                  boxShadow: "0 4px 20px rgba(58,140,92,0.35)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "#4FAD74")}
                onMouseLeave={e => (e.currentTarget.style.background = "#3A8C5C")}
              >
                Start Free 14-Day Trial <ArrowRight size={14} />
              </button>
              <a
                href="mailto:support@useauditready.com"
                style={{
                  background: "transparent", color: "rgba(244,240,232,0.75)", borderRadius: 4, padding: "14px 28px",
                  fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 600,
                  border: "1px solid rgba(244,240,232,0.15)", cursor: "pointer",
                  transition: "border-color 150ms, color 150ms", textDecoration: "none",
                  display: "inline-flex", alignItems: "center",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(244,240,232,0.35)"; (e.currentTarget as HTMLAnchorElement).style.color = "#F4F0E8"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(244,240,232,0.15)"; (e.currentTarget as HTMLAnchorElement).style.color = "rgba(244,240,232,0.75)"; }}
              >
                Questions? Email us →
              </a>
            </div>
            <p style={{ fontFamily: C.meta, fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}>
              Serving ABA agencies, behavioral health centers, and home care agencies in North Carolina and beyond.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      {/* ── DIRECTOR CONTACT SECTION ─────────────────────────────────────── */}
      <section style={{ background: C.paperDark, borderTop: `1px solid ${C.rule}`, borderBottom: `1px solid ${C.rule}`, padding: "clamp(40px, 5vw, 56px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <FadeIn>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 20, height: 1, background: C.forest }} />
              <span style={{ fontFamily: C.ui, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: C.forest }}>Have a question?</span>
              <div style={{ width: 20, height: 1, background: C.forest }} />
            </div>
            <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.5rem, 2.8vw, 2.1rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: 12 }}>
              You'll hear back from a real person.
            </h2>
            <p style={{ fontFamily: C.body, fontSize: "0.97rem", color: C.inkLight, lineHeight: 1.75, marginBottom: 28, maxWidth: 520, margin: "0 auto 28px" }}>
              AuditReady is run by Lisset Fernandez out of Raleigh, NC. Every pilot, every demo, every support email is handled personally. Reach out — you'll get a direct reply.
            </p>
            <a
              href="mailto:support@useauditready.com?subject=AuditReady%20Question"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: C.forest, color: "#F4F0E8",
                fontFamily: C.ui, fontSize: "0.88rem", fontWeight: 700,
                padding: "13px 28px", borderRadius: 4, textDecoration: "none",
                transition: "background 150ms",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#163028")}
              onMouseLeave={e => (e.currentTarget.style.background = C.forest)}
            >
              <Mail size={15} />
              Email support@useauditready.com
            </a>
            <p style={{ fontFamily: C.meta, fontSize: "0.7rem", color: C.inkFaint, marginTop: 14, letterSpacing: "0.02em" }}>Typically replies within 1 business day.</p>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ SECTION ─────────────────────────────────────── */}
      <FAQSection />

      <footer style={{ background: C.ink, padding: "52px 24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            <div>
              {/* Big brand statement */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <img src={MONOGRAM_URL} alt="AR" loading="lazy" decoding="async" style={{ height: 40, width: 40, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.95 }} />
                  <span style={{ fontFamily: C.display, fontSize: "2rem", fontWeight: 700, color: "rgba(244,240,232,0.97)", letterSpacing: "-0.03em", lineHeight: 1 }}>Audit<span style={{ color: "#3A8C5C" }}>Ready</span></span>
                </div>
                <div style={{ fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 400, color: "rgba(244,240,232,0.35)", letterSpacing: "0.02em", lineHeight: 1.2, marginTop: 2 }}>A Vibemo Group company</div>
              </div>
              <p style={{ fontFamily: C.body, fontSize: "0.9rem", color: "rgba(244,240,232,0.6)", lineHeight: 1.7, maxWidth: 340, marginBottom: 18 }}>
                Credential compliance and audit-readiness for ABA, behavioral health, and home care agencies.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a href="/about" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
                  <Mail size={12} color="rgba(244,240,232,0.55)" />
                  <span style={{ fontFamily: C.meta, fontSize: "0.85rem", color: "rgba(244,240,232,0.7)", letterSpacing: "0.04em" }}>Contact Us</span>
                </a>
                <a href="https://www.linkedin.com/company/auditready" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.75")}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(244,240,232,0.55)" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  <span style={{ fontFamily: C.meta, fontSize: "0.85rem", color: "rgba(244,240,232,0.7)", letterSpacing: "0.04em", opacity: 0.75 }}>LinkedIn</span>
                </a>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(244,240,232,0.45)", marginBottom: 16 }}>Product</div>
              {[
                { label: "Features", href: "/#features" },
                { label: "How It Works", href: "/how-it-works" },
                { label: "Pricing", href: "/pricing" },
                { label: "Who It's For", href: "/#clinics" },
                { label: "FAQ", href: "/faq" },
                { label: "Behavioral Health", href: "/behavioral-health-credentials" },
                { label: "About", href: "/about" },
                { label: "Security", href: "/security" },
              ].map(l => (
                <a key={l.label} href={l.href} style={{ display: "block", fontFamily: C.body, fontSize: "0.88rem", color: "rgba(244,240,232,0.55)", marginBottom: 11, textDecoration: "none", transition: "color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(244,240,232,0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(244,240,232,0.55)")}
                >{l.label}</a>
              ))}
            </div>
            <div>
              <div style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(244,240,232,0.45)", marginBottom: 16 }}>Legal</div>
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms of Service", href: "/terms" },
                { label: "Refund Policy", href: "/refunds" },
                { label: "Security & Privacy", href: "/security" },
              ].map(l => (
                <a key={l.label} href={l.href} style={{ display: "block", fontFamily: C.body, fontSize: "0.88rem", color: "rgba(244,240,232,0.55)", marginBottom: 11, textDecoration: "none", transition: "color 150ms" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(244,240,232,0.9)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(244,240,232,0.55)")}
                >{l.label}</a>
              ))}
            </div>
          </div>
          <div style={{ height: 1, background: "rgba(244,240,232,0.07)", marginBottom: 14 }} />
          <div style={{ marginBottom: 10, padding: "10px 14px", background: "rgba(244,240,232,0.03)", borderRadius: 3, border: "1px solid rgba(244,240,232,0.06)" }}>
            <p style={{ fontFamily: C.body, fontSize: "0.7rem", color: "rgba(244,240,232,0.28)", margin: 0, lineHeight: 1.7 }}>
              <strong style={{ color: "rgba(244,240,232,0.4)" }}>Document Storage Disclaimer:</strong> AuditReady stores credential tracking information and document links only. Agencies are responsible for controlling access to their own document storage systems. AuditReady does not store uploaded credential files, patient information, PHI, therapy records, billing records, or client files.
            </p>
          </div>
          <div style={{ marginBottom: 10, padding: "8px 14px" }}>
            <p style={{ fontFamily: C.body, fontSize: "0.68rem", color: "rgba(244,240,232,0.22)", margin: 0, lineHeight: 1.6 }}>
              AuditReady is an administrative tracking platform. No patient data is collected or stored. Agencies remain responsible for confirming licensing, payer, and regulatory requirements. <a href="/security" style={{ color: "rgba(244,240,232,0.35)", textDecoration: "underline" }}>Security details →</a>
            </p>
          </div>
          <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(244,240,232,0.03)", borderRadius: 3, border: "1px solid rgba(244,240,232,0.06)" }}>
            <p style={{ fontFamily: C.body, fontSize: "0.7rem", color: "rgba(244,240,232,0.28)", margin: 0, lineHeight: 1.7 }}>
              <strong style={{ color: "rgba(244,240,232,0.4)" }}>Not Legal or Compliance Advice:</strong> Credential checklists, requirement summaries, and compliance tools are for informational purposes only. Requirements change. Always verify current requirements with the relevant licensing board, accreditation body, or qualified legal counsel. AuditReady is not a law firm and does not provide legal advice.
            </p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <span style={{ fontFamily: C.ui, fontSize: "0.68rem", color: "rgba(244,240,232,0.25)" }}>© 2026 AuditReady by Vibemo Group · All rights reserved</span>
            <span style={{ fontFamily: C.ui, fontSize: "0.65rem", color: "rgba(244,240,232,0.2)" }}>AuditReady does not collect, store, or process patient health information (PHI).</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
