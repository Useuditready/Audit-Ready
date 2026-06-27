/**
 * AuditReady — Features Page
 * "The Digital Compliance Folder" aesthetic
 * Folder tabs, document metadata, stamp accents, no generic icons.
 */

import { useState } from "react";
import { getLoginUrl, getSignUpUrl } from "@/const";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link } from "wouter";
import { C, MONOGRAM_URL } from "@/lib/design";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";



// ── Shared Nav ────────────────────────────────────────────────
function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleSignIn = () => { window.location.href = getLoginUrl(); };
  const handleSignUp = () => { window.location.href = getSignUpUrl(); };
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(244,240,232,0.97)",
      backdropFilter: "blur(12px)",
      borderBottom: `1px solid ${C.rule}`,
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, position: "relative", zIndex: 101 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", flexShrink: 0 }}>
          <img src={MONOGRAM_URL} alt="AR" style={{ height: 28, width: 28, objectFit: "contain", display: "block", filter: "contrast(1.15) brightness(0.92)" }} />
          <span style={{ fontFamily: C.display, fontSize: "1.1rem", fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1 }}>
            Audit<span style={{ color: C.forest }}>Ready</span>
          </span>
        </Link>

        <div className="hidden md:flex items-end gap-0" style={{ height: "100%", alignItems: "flex-end" }}>
          {[
            { label: "Features", href: "/features" },
            { label: "Who It's For", href: "/#clinics" },
            { label: "Pricing", href: "/pricing" },
            { label: "About", href: "/about" },
          ].map((l, i) => (
            <Link key={l.label} href={l.href} style={{
              fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.04em",
              textTransform: "none", color: l.href === "/features" ? C.ink : C.inkMid,
              textDecoration: "none", padding: "8px 16px 10px",
              background: l.href === "/features" ? C.paper : "transparent",
              borderLeft: i > 0 ? `1px solid ${C.rule}` : "none",
              borderBottom: l.href === "/features" ? `2px solid ${C.forest}` : "2px solid transparent",
              display: "inline-block",
            }}>{l.label}</Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3" style={{ flexShrink: 0 }}>
          <button onClick={handleSignIn} style={{ background: "transparent", color: C.inkMid, borderRadius: 3, padding: "8px 16px", fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.01em", border: `1px solid ${C.rule}`, cursor: "pointer", whiteSpace: "nowrap" }}>Sign In</button>
          <button onClick={handleSignUp} style={{
            background: C.ink, color: C.paper, borderRadius: 3, padding: "8px 20px",
            fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.01em",
            border: "none", cursor: "pointer", whiteSpace: "nowrap",
          }}>Start Free Pilot</button>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="flex md:hidden" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 4 }}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div style={{ background: C.paper, borderTop: `1px solid ${C.rule}`, padding: "16px 24px 20px" }}>
          {[
            { label: "Features", href: "/features" },
            { label: "Who It's For", href: "/#clinics" },
            { label: "Pricing", href: "/pricing" },
            { label: "About", href: "/about" },
          ].map(l => (
            <Link key={l.label} href={l.href} onClick={() => setMobileOpen(false)}
              style={{ display: "block", fontFamily: C.ui, fontSize: "0.78rem", letterSpacing: "0.01em", color: C.inkMid, padding: "11px 0", borderBottom: `1px solid ${C.rule}`, textDecoration: "none" }}
            >{l.label}</Link>
          ))}
          <button onClick={handleSignIn} style={{ display: "block", width: "100%", marginTop: 12, background: "transparent", color: C.inkMid, borderRadius: 3, padding: "11px 18px", textAlign: "center", fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.01em", border: `1px solid ${C.rule}`, cursor: "pointer" }}>Sign In</button>
          <button onClick={handleSignUp} style={{ display: "block", width: "100%", marginTop: 8, background: C.ink, color: C.paper, borderRadius: 3, padding: "11px 18px", textAlign: "center", fontFamily: C.ui, fontSize: "0.78rem", fontWeight: 600, letterSpacing: "0.01em", border: "none", cursor: "pointer" }}>Start Free Pilot</button>
        </div>
      )}
    </nav>
  );
}

// ── Folder tab header ─────────────────────────────────────────
function FolderHeader({ tab }: { tab: string; label?: string }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ display: "inline-flex", gap: 0 }}>
        <div style={{
          fontFamily: C.meta, fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.1em",
          textTransform: "uppercase", color: C.ink,
          padding: "7px 18px 9px", background: C.paper,
          border: `1px solid ${C.ruleDark}`, borderBottom: `1px solid ${C.paper}`,
          borderRadius: "3px 3px 0 0", position: "relative", top: 1, zIndex: 1,
        }}>{tab}</div>
      </div>
      <div style={{ borderTop: `1px solid ${C.ruleDark}` }} />
    </div>
  );
}

// ── Feature data ──────────────────────────────────────────────
type Feature = {
  ref: string;
  section: string;
  title: string;
  body: string;
  details: string[];
  aiNote?: string;
  status: "verified" | "coming_soon" | "expiring";
  accent: string;
};

const features: Feature[] = [
  {
    ref: "FEAT-001",
    section: "Credential Tracking",
    title: "Every credential. One folder.",
    body: "AuditReady maintains a permanent file for each staff member — licenses, certifications, CPR cards, background checks, training records, and supervision agreements. Every document has an expiration date, an issuing authority, and a status. Nothing falls through the cracks.",
    details: [
      "Unlimited credential types per staff member",
      "Issued date, expiration date, and issuing authority for every record",
      "Document attachment — upload the actual certificate or license",
      "Credential history preserved even after staff departure",
      "Bulk import from CSV or existing spreadsheets",
    ],
    status: "verified" as const,
    accent: C.forest,
  },
  {
    ref: "FEAT-002",
    section: "Expiration Reminders",
    title: "Automated notices at 90, 60, and 30 days.",
    body: "AuditReady sends email reminders to the responsible staff member and the agency administrator at three intervals before any credential expires. No more last-minute audit scrambles. No more lapsed RBT certifications discovered during a billing denial.",
    details: [
      "Reminders at 90, 60, and 30 days before expiration",
      "Separate notifications to staff member and administrator",
      "Configurable reminder recipients per credential type",
      "Dashboard view of all credentials expiring in the next 90 days",
      "Red/amber/green status indicators across all views",
    ],
    status: "verified" as const,
    accent: C.amber,
  },
  {
    ref: "FEAT-003",
    section: "AI-Assisted Document Extraction",
    title: "Photograph a license. The date is pre-filled automatically.",
    body: "Upload a photo or scan of any credential document. AuditReady's AI-assisted extraction reads the expiration date, credential type, and license number — and pre-fills the record for your review. You confirm before anything is saved. Works with NC state board licenses, BACB certificates, CPR cards, and most standard credential formats.",
    details: [
      "Supports JPG, PNG, and PDF uploads",
      "Extracts expiration date, credential type, and license number",
      "Confidence score shown for each extracted field",
      "Human confirmation required — AI suggestions are never saved automatically",
      "Manual override always available for every extracted field",
      "Works with NC Psychology Board, BACB, AHA, Red Cross, and more",
    ],
    aiNote: "AI-extracted values are suggestions only. You must review and confirm before anything is saved.",
    status: "verified" as const,
    accent: C.forest,
  },
  {
    ref: "FEAT-004",
    section: "License Verification Support",
    title: "Check credentials against NC state boards.",
    body: "For BCBA, RBT, LCMHC, LCSW, LMFT, and NC Psychology licenses, AuditReady provides verification support by checking the issuing board's registry. The result — active, inactive, or not found — is recorded on the credential file with a timestamp. Agencies remain responsible for confirming current board requirements. Available on Growth and Scale plans.",
    details: [
      "NC Psychology Board",
      "NC Board of Licensed Clinical Mental Health Counselors",
      "NC Social Work Certification and Licensure Board",
      "NC Marriage and Family Therapy Licensure Board",
      "BACB (BCBA, BCaBA, RBT, BCBA-D)",
      "OIG LEIE exclusion check",
      "NC Health Care Personnel Registry (NC HCPR)",
    ],
    status: "verified" as const,
    accent: C.forest,
  },
  {
    ref: "FEAT-005",
    section: "Audit-Ready Export",
    title: "One click. A clean report for any surveyor.",
    body: "Generate a complete credential report for your entire agency — or for a single staff member — in seconds. The export is formatted for state board surveyors and payer auditors: organized by staff member, sorted by credential type, with status indicators and expiration dates in a clean, readable layout.",
    details: [
      "Full agency credential report (PDF or CSV)",
      "Individual staff member credential packet",
      "Filtered exports by credential type, status, or department",
      "Audit narrative generator (Growth and Scale plans)",
      "Timestamped and signed with agency name",
    ],
    status: "coming_soon" as const,
    accent: C.amber,
  },
  {
    ref: "FEAT-006",
    section: "Ask AI",
    title: "Ask a compliance question. Get a specific answer.",
    body: "Ask AI is a built-in administrative guidance tool. Ask it general questions about credential types, accreditation standards, and common audit preparation steps. It draws on publicly available regulatory information and your agency's credential data to help you stay organized. It does not provide legal advice or guarantee compliance.",
    details: [
      "Answers general questions about NC state board credential types",
      "Explains BACB supervision and CE requirements",
      "Searches your credential data for specific staff or credential types",
      "Helps draft organizational notes for audit preparation",
      "20 questions/month on Starter · Unlimited on Growth and Scale",
    ],
    status: "expiring" as const,
    accent: C.inkMid,
  },
  {
    ref: "FEAT-007",
    section: "BACB Certification Tracking",
    title: "BCBA, BCaBA, and RBT credentials \u2014 tracked to the day.",
    body: "Track every BACB certification in your agency with expiration dates, renewal cycle countdowns, and CEU progress toward renewal. RBTs lapse constantly and the agency loses billing the second a cert expires. AuditReady ensures you see it coming 90 days out \u2014 not the day after.",
    details: [
      "BCBA, BCaBA, and RBT certification tracking with BACB number",
      "CEU progress bars \u2014 total hours and ethics hours toward renewal",
      "2-year renewal cycle countdown with days remaining",
      "Expiration alerts at 90, 60, and 30 days before cert lapses",
      "Per-staff CEU record log with provider, date, and hours",
      "Supports all BACB credential types including BCBA-D",
    ],
    status: "verified" as const,
    accent: C.forest,
  },
  {
    ref: "FEAT-008",
    section: "RBT Supervision Ratios",
    title: "5% minimum. Tracked monthly. Zero PHI.",
    body: "BACB requires BCBAs to provide ongoing supervision to RBTs at a minimum of 5% of monthly hours worked. AuditReady tracks this as numbers only \u2014 total hours worked, supervision hours logged, ratio, and a pass/fail flag. No client names, no session notes. Just \u2018RBT Jane: 8% supervision this month, compliant.\u2019 The #1 audit failure point, fully de-identified.",
    details: [
      "Monthly supervision ratio per RBT (hours worked vs. supervision hours)",
      "Automatic pass/fail flag at 5% BACB minimum threshold",
      "Agency-wide compliance summary: X of Y RBTs compliant this month",
      "Supervisor assignment tracking (which BCBA supervises which RBT)",
      "CSV export of supervision logs for BACB or payer audits",
      "De-identified \u2014 no client names, no session notes, no PHI",
    ],
    status: "verified" as const,
    accent: C.amber,
  },
  {
    ref: "FEAT-009",
    section: "OIG Exclusion Screening",
    title: "Monthly federal exclusion check. Automated. Audit-logged.",
    body: "Federal regulations require Medicaid-billing agencies to screen all employees against the OIG LEIE exclusion list monthly. AuditReady automates this \u2014 checking every active staff member against the federal database and generating a dated audit log proving the check was run. A flagged result means a name match was found; manual verification is always required to confirm identity.",
    details: [
      "Automated monthly batch screening of all active staff",
      "Checks against the official OIG LEIE federal exclusion database",
      "Dated audit log for each screening run \u2014 proof for auditors",
      "Immediate flagging if any staff member matches an excluded individual",
      "Manual \u2018Run Now\u2019 button for on-demand checks between monthly runs",
      "Per-staff result detail: cleared, flagged, or error with explanation",
    ],
    status: "verified" as const,
    accent: C.forest,
  },
];

// ── Main Component ────────────────────────────────────────────
export default function Features() {
  const handleSignUp = () => { window.location.href = getLoginUrl(); };

  return (
    <div style={{ fontFamily: C.body, background: C.paper, color: C.ink, minHeight: "100vh" }}>
      <MarketingNav active="Features" />

      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <section style={{ paddingTop: 58, background: C.paper, borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 24px" }}>
          <FolderHeader tab="Features" label="Capability Index" />
          <div style={{ paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: C.meta, fontSize: "0.58rem", color: C.inkFaint, letterSpacing: "0.1em", textTransform: "uppercase" }}>File: AR-FEATURES-2026</span>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
              <span style={{ fontFamily: C.meta, fontSize: "0.58rem", color: C.forest, letterSpacing: "0.1em", textTransform: "uppercase" }}>9 Capabilities</span>
            </div>
            <h1 style={{ fontFamily: C.display, fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 14 }}>
              What's in the folder.
            </h1>
            <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 520, lineHeight: 1.65 }}>
              AuditReady is purpose-built for behavioral health agencies. Every feature exists because a real agency needed it — not because a product manager added it to a roadmap.
            </p>
          </div>
        </div>
      </section>

      {/* ── FEATURE SECTIONS ────────────────────────────────── */}
      {features.map((feat, i) => (
        <section key={feat.ref} style={{
          background: i % 2 === 0 ? C.paperDark : C.paper,
          borderBottom: `1px solid ${C.rule}`,
          padding: "32px 24px",
        }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

              {/* Left: description */}
              <div>
                {/* Folder tab reference */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <span style={{ fontFamily: C.meta, fontSize: "0.55rem", color: C.inkFaint, letterSpacing: "0.1em", textTransform: "uppercase" }}>{feat.ref}</span>
                  <div style={{ width: 40, height: 1, background: C.rule }} />
                  <span style={{ fontFamily: C.meta, fontSize: "0.55rem", color: feat.accent, letterSpacing: "0.1em", textTransform: "uppercase" }}>{feat.section}</span>
                </div>

                <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.4rem, 2.8vw, 2rem)", fontWeight: 800, color: C.ink, letterSpacing: "-0.025em", lineHeight: 1.15, marginBottom: 16 }}>
                  {feat.title}
                </h2>

                <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: C.inkMid, lineHeight: 1.7, marginBottom: 0 }}>
                  {feat.body}
                </p>
              </div>

              {/* Right: detail list in a "document" card */}
              <div style={{
                background: C.paper,
                border: `1px solid ${C.ruleDark}`,
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: "0 2px 8px rgba(26,26,26,0.06)",
              }}>
                {/* Document header */}
                <div style={{
                  background: C.tab,
                  borderBottom: `1px solid ${C.rule}`,
                  padding: "10px 18px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontFamily: C.meta, fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>
                    {feat.ref} · Capability Details
                  </span>
                  <span style={{
                    fontFamily: C.meta, fontSize: "0.52rem", fontWeight: 700,
                    letterSpacing: "0.14em", textTransform: "uppercase",
                    color: feat.status === "verified" ? C.forest : feat.status === "coming_soon" ? "#7A6E64" : C.amber,
                    background: feat.status === "verified" ? C.forestBg : feat.status === "coming_soon" ? "#F0EBE3" : C.amberBg,
                    padding: "2px 8px", borderRadius: 2,
                  }}>
                    {feat.ref === "FEAT-003" ? "Live · AI-Assisted" : feat.status === "verified" ? "Live" : feat.status === "coming_soon" ? "Coming Soon" : "Growth+"}
                  </span>
                </div>

                <div style={{ padding: "20px 18px 22px" }}>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                    {feat.details.map((d, j) => (
                      <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 10, paddingBottom: j < feat.details.length - 1 ? 10 : 0, borderBottom: j < feat.details.length - 1 ? `1px solid ${C.rule}` : "none" }}>
                        <span style={{ fontFamily: C.meta, fontSize: "0.7rem", fontWeight: 700, color: feat.accent, flexShrink: 0, marginTop: 2 }}>✓</span>
                        <span style={{ fontFamily: C.body, fontSize: "0.85rem", color: C.inkMid, lineHeight: 1.65 }}>{d}</span>
                      </li>
                    ))}
                  </ul>
                  {feat.aiNote && (
                    <div style={{
                      marginTop: 16,
                      padding: "10px 14px",
                      background: C.amberBg,
                      border: `1px solid ${C.amber}33`,
                      borderLeft: `3px solid ${C.amber}`,
                      borderRadius: 3,
                    }}>
                      <span style={{ fontFamily: C.meta, fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.amber, display: "block", marginBottom: 4 }}>Human Confirmation Required</span>
                      <span style={{ fontFamily: C.body, fontSize: "0.8rem", color: C.inkMid, lineHeight: 1.6 }}>{feat.aiNote}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </section>
      ))}

      {/* ── PILOT CTA ────────────────────────────────────────── */}
      <section style={{ background: C.ink, padding: "44px 24px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontFamily: C.meta, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(244,240,232,0.35)", marginBottom: 16 }}>
            14-Day Free Pilot · No Credit Card · No Patient Data
          </div>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 800, color: C.paper, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
            Start your free pilot today.
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: "rgba(244,240,232,0.6)", lineHeight: 1.65, marginBottom: 32 }}>
            Surveyors don't give advance notice of which files they'll pull. AuditReady makes sure every file is ready before they ask.
          </p>
          <button
            onClick={handleSignUp}
            style={{
              background: C.paper, color: C.ink, border: "none", borderRadius: 3,
              padding: "13px 32px", fontFamily: C.ui, fontSize: "0.82rem", fontWeight: 600,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "opacity 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Start Free Pilot <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
