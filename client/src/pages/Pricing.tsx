/**
 * AuditReady — Pricing Page
 * "The Digital Compliance Folder" aesthetic
 * Folder tabs, paper texture, ink typography, stamp accents.
 * No gradients, no stock photos, no generic SaaS patterns.
 */

import { useState } from "react";
import { getLoginUrl, getSignUpUrl } from "@/const";
import { ArrowRight, CheckCircle, Menu, X, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import AgencyProfileModal from "@/components/AgencyProfileModal";
import { C, MONOGRAM_URL } from "@/lib/design";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";

// ── Design tokens (mirrored from Home.tsx) ────────────────────


// ── Nav (shared pattern) ──────────────────────────────────────
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
              textTransform: "none", color: l.href === "/pricing" ? C.ink : C.inkMid,
              textDecoration: "none", padding: "8px 16px 10px",
              background: l.href === "/pricing" ? C.paper : "transparent",
              borderLeft: i > 0 ? `1px solid ${C.rule}` : "none",
              borderBottom: l.href === "/pricing" ? `2px solid ${C.forest}` : "2px solid transparent",
              display: "inline-block",
            }}>{l.label}</Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3" style={{ flexShrink: 0 }}>
          <button onClick={handleSignIn} style={{ background: "transparent", color: C.inkMid, borderRadius: 3, padding: "8px 16px", fontFamily: C.meta, fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.1em", border: `1px solid ${C.rule}`, cursor: "pointer", whiteSpace: "nowrap" }}>Sign In</button>
          <button onClick={handleSignUp} style={{
            background: C.ink, color: C.paper, borderRadius: 3, padding: "8px 20px",
            fontFamily: C.meta, fontSize: "0.65rem", fontWeight: 600, letterSpacing: "0.1em",
            textTransform: "uppercase", border: "none", cursor: "pointer", whiteSpace: "nowrap",
          }}>Subscribe Now</button>
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
              style={{ display: "block", fontFamily: C.meta, fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkMid, padding: "11px 0", borderBottom: `1px solid ${C.rule}`, textDecoration: "none" }}
            >{l.label}</Link>
          ))}
          <button onClick={handleSignIn} style={{ display: "block", width: "100%", marginTop: 12, background: "transparent", color: C.inkMid, borderRadius: 3, padding: "11px 18px", textAlign: "center", fontFamily: C.meta, fontSize: "0.65rem", fontWeight: 500, letterSpacing: "0.1em", border: `1px solid ${C.rule}`, cursor: "pointer" }}>Sign In</button>
          <button onClick={handleSignUp} style={{ display: "block", width: "100%", marginTop: 8, background: C.ink, color: C.paper, borderRadius: 3, padding: "11px 18px", textAlign: "center", fontFamily: C.meta, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", cursor: "pointer" }}>Subscribe Now</button>
        </div>
      )}
    </nav>
  );
}

// ── Folder tab section header ─────────────────────────────────
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

// ── Pricing tiers ─────────────────────────────────────────────
const tiers = [
  {
    ref: "PLAN-001",
    name: "Starter",
    tagline: "1–10 staff",
    staff: "1–10 staff",
    monthly: 129,
    annual: 116,
    highlight: false,
    accentColor: C.inkMid,
    setupFee: 199,
    features: [
      "Core credential tracking",
      "Expiration reminders: 90, 60, and 30 days",
      "Document upload or document location/link",
      "AI-assisted document extraction",
      "Audit-ready export",
      "Ask AI: 20 questions/month",
      "Email support",
    ],
    cta: "Subscribe Now",
    note: "14-day free pilot · No credit card required",
  },
  {
    ref: "PLAN-002",
    name: "Growth",
    tagline: "11–50 staff",
    staff: "11–50 staff",
    monthly: 249,
    annual: 224,
    highlight: true,
    accentColor: C.forest,
    setupFee: 199,
    features: [
      "Everything in Starter",
      "Up to 50 staff members",
      "NC board license verification",
      "Audit narrative assistant",
      "Ask AI: unlimited",
      "Multi-state license tracking",
      "Priority support",
    ],
    cta: "Subscribe Now",
    note: "Most agencies start here",
  },
  {
    ref: "PLAN-003",
    name: "Enterprise",
    tagline: "51+ staff",
    staff: "51+ staff",
    monthly: 449,
    annual: 404,
    highlight: false,
    accentColor: C.inkMid,
    setupFee: 199,
    features: [
      "Everything in Growth",
      "Unlimited staff members",
      "NC board license verification",
      "Ask AI: unlimited",
      "Custom credential types",
      "Priority support",
      "Multi-location support",
      "+ $199 one-time onboarding & setup fee",
    ],
    cta: "Subscribe Now",
    note: "No credit card required for 14-day trial",
  },
];

// ── FAQ items ─────────────────────────────────────────────────────
const faqs = [
  {
    q: "What counts as a 'staff member'?",
    a: "Any person whose credentials you track in AuditReady — BCBAs, RBTs, therapists, LCSWs, LMFTs, psychologists, home care aides, office staff, contractors, or anyone else who needs a credential file. You can archive inactive staff without losing their history.",
  },
  {
    q: "Is there a contract or long-term commitment?",
    a: "No contracts. Month-to-month billing. Cancel anytime — your access remains active through the end of the current billing period. Annual billing saves 10% and is billed once per year.",
  },
  {
    q: "What happens during the 14-day free pilot?",
    a: "You get full access to your plan tier with no credit card required. You can add staff, track credentials, and use AI-assisted document extraction. At the end of 14 days, subscribe to continue. If you choose not to, you may export your administrative credential tracking data before account closure.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "You may cancel your subscription at any time. Your access will remain active through the end of your current billing period. Before account closure, you may export your administrative credential tracking data and reports. AuditReady may retain limited billing, security, backup, or operational records as required for legal, tax, fraud-prevention, or system integrity purposes. Inactive account data may be removed according to AuditReady retention policies.",
  },
  {
    q: "Does AuditReady store patient data?",
    a: "No patient data is stored. AuditReady is an administrative tracking platform for staff credentials only — licenses, certifications, training certificates, and document locations. No patient records, no PHI, no BAA required.",
  },
  {
    q: "How does AI-assisted document extraction work?",
    a: "Upload or photograph a credential document (license, CPR card, certification). AuditReady's AI reads the credential type and expiration date automatically — no manual data entry required. You review and confirm before anything is saved. AI-assisted extraction supports the admin's review; it does not replace it.",
  },
  {
    q: "What is Ask AI and how many questions do I get?",
    a: "Ask AI is AuditReady's built-in administrative guidance tool. Ask it general questions about credential types, accreditation standards, or common audit preparation steps. It provides general organizational guidance — not legal advice, Medicaid billing advice, or a substitute for a compliance officer. Starter plans include 20 questions per month; Growth and Enterprise plans include unlimited Ask AI access.",
  },
  {
    q: "What is credential tracking vs. document storage?",
    a: "AuditReady tracks the credential record — credential type, expiration date, verification status, and document location or link. You store the actual document in your existing system (Google Drive, SharePoint, paper file, HR system). AuditReady records where it lives so you can find it quickly when needed.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade or downgrade at any time. Upgrades take effect immediately; downgrades take effect at the next billing cycle.",
  },
  {
    q: "What NC state boards does verification support cover?",
    a: "AuditReady provides verification support for NC Psychology Board, NC Board of Licensed Clinical Mental Health Counselors, NC Social Work Certification and Licensure Board, NC Marriage and Family Therapy Licensure Board, and BACB for BCBA/RBT credentials. Agencies remain responsible for confirming current board requirements. Additional boards are added regularly.",
  },
  {
    q: "Does AuditReady provide legal or compliance advice?",
    a: "No. AuditReady is an administrative tracking platform. Ask AI provides general organizational guidance based on publicly available accreditation standards — it is not legal advice, Medicaid billing advice, or a substitute for a compliance officer or attorney. Agencies remain responsible for confirming current licensing, payer, and regulatory requirements.",
  },
];

// ── Main Component ────────────────────────────────────────────
export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const handleSignUp = () => { window.location.href = getLoginUrl(); };

    const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ plan: "starter" | "growth" | "enterprise"; interval: "monthly" | "annual" } | null>(null);
  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (err) => { alert(err.message || "Failed to start checkout. Please try again."); },
  });
  const handlePricingCta = (planName: string) => {
    const plan = planName.toLowerCase() as "starter" | "growth" | "enterprise";
    const interval = annual ? "annual" : "monthly";
    // Show agency profile modal before proceeding to Stripe checkout
    setPendingPlan({ plan, interval });
    setAgencyModalOpen(true);
  };
  const handleAgencyProfileComplete = (repCode?: string) => {
    setAgencyModalOpen(false);
    if (pendingPlan) {
      createCheckout.mutate({ plan: pendingPlan.plan, interval: pendingPlan.interval, origin: window.location.origin, repCode });
    }
  };

  return (
    <div style={{ fontFamily: C.body, background: C.paper, color: C.ink, minHeight: "100vh" }}>
      <MarketingNav active="Pricing" />
      {agencyModalOpen && pendingPlan && (
        <AgencyProfileModal
          planName={pendingPlan.plan}
          billingInterval={pendingPlan.interval}
          onComplete={handleAgencyProfileComplete}
          onClose={() => { setAgencyModalOpen(false); setPendingPlan(null); }}
        />
      )}

      {/* ── PAGE HEADER ─────────────────────────────────────── */}
      <section style={{ paddingTop: 58, background: C.paper, borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 24px 24px" }}>
          <FolderHeader tab="Pricing" label="Plan Selection" />
          <div style={{ paddingTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span style={{ fontFamily: C.meta, fontSize: "0.58rem", color: C.inkFaint, letterSpacing: "0.1em", textTransform: "uppercase" }}>File: AR-PRICING-2026</span>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
              <span style={{ fontFamily: C.meta, fontSize: "0.58rem", color: C.forest, letterSpacing: "0.1em", textTransform: "uppercase" }}>14-Day Free Pilot</span>
            </div>
            <h1 style={{ fontFamily: C.display, fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 900, color: C.ink, letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 14 }}>
              Simple, seat-based pricing.
            </h1>
            <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, maxWidth: 480, lineHeight: 1.65, marginBottom: 28 }}>
              Pay for the size of your agency, not the number of features. Every plan includes a 14-day free pilot — no credit card required.
            </p>

            {/* Billing toggle */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 0, border: `1px solid ${C.ruleDark}`, borderRadius: 3, overflow: "hidden" }}>
              <button
                onClick={() => setAnnual(false)}
                style={{
                  fontFamily: C.meta, fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em",
                  textTransform: "uppercase", padding: "8px 18px", border: "none", cursor: "pointer",
                  background: !annual ? C.ink : C.tab,
                  color: !annual ? C.paper : C.inkLight,
                  transition: "all 150ms",
                }}
              >Monthly</button>
              <button
                onClick={() => setAnnual(true)}
                style={{
                  fontFamily: C.meta, fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.08em",
                  textTransform: "uppercase", padding: "8px 18px", border: "none", cursor: "pointer",
                  borderLeft: `1px solid ${C.ruleDark}`,
                  background: annual ? C.ink : C.tab,
                  color: annual ? C.paper : C.inkLight,
                  transition: "all 150ms",
                }}
              >Annual <span style={{ color: C.forest, marginLeft: 4 }}>−10%</span></button>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING CARDS ───────────────────────────────────── */}
      <section style={{ background: C.paperDark, borderBottom: `1px solid ${C.rule}`, padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {tiers.map((tier, i) => (
              <div key={i} style={{
                background: tier.highlight ? C.ink : C.paper,
                border: `1px solid ${tier.highlight ? C.ink : C.ruleDark}`,
                borderRadius: 4,
                overflow: "hidden",
                boxShadow: tier.highlight ? "0 4px 24px rgba(26,26,26,0.18)" : "0 2px 8px rgba(26,26,26,0.06)",
                position: "relative",
              }}>
                {/* Folder tab strip */}
                <div style={{
                  background: tier.highlight ? "rgba(255,255,255,0.06)" : C.tab,
                  borderBottom: `1px solid ${tier.highlight ? "rgba(255,255,255,0.1)" : C.rule}`,
                  padding: "8px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontFamily: C.meta, fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: tier.highlight ? "rgba(244,240,232,0.45)" : C.inkFaint }}>
                    Folder {tier.ref}
                  </span>
                  {tier.highlight && (
                    <span style={{ fontFamily: C.meta, fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.forest, background: C.forestBg, padding: "2px 8px", borderRadius: 2 }}>
                      Most Popular
                    </span>
                  )}
                </div>

                <div style={{ padding: "24px 24px 28px" }}>
                  {/* Plan name */}
                  <div style={{ fontFamily: C.meta, fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: tier.highlight ? "rgba(244,240,232,0.5)" : C.inkFaint, marginBottom: 4 }}>{tier.tagline}</div>
                  <h2 style={{ fontFamily: C.display, fontSize: "1.6rem", fontWeight: 800, color: tier.highlight ? C.paper : C.ink, letterSpacing: "-0.03em", marginBottom: 4 }}>{tier.name}</h2>
                  <div style={{ fontFamily: C.meta, fontSize: "0.6rem", color: tier.highlight ? "rgba(244,240,232,0.45)" : C.inkFaint, letterSpacing: "0.06em", marginBottom: 20 }}>{tier.staff}</div>

                  {/* Price */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                    <span style={{ fontFamily: C.meta, fontSize: "0.8rem", color: tier.highlight ? "rgba(244,240,232,0.6)" : C.inkFaint }}>$</span>
                    <span style={{ fontFamily: C.display, fontSize: "2.8rem", fontWeight: 900, color: tier.highlight ? C.paper : C.ink, lineHeight: 1, letterSpacing: "-0.04em" }}>
                      {annual ? (tier.annual * 12).toLocaleString() : tier.monthly}
                    </span>
                    <span style={{ fontFamily: C.meta, fontSize: "0.6rem", color: tier.highlight ? "rgba(244,240,232,0.45)" : C.inkFaint, letterSpacing: "0.06em" }}>{annual ? "/yr" : "/mo"}</span>
                  </div>
                  {annual && (
                    <div style={{ fontFamily: C.meta, fontSize: "0.58rem", color: C.forest, letterSpacing: "0.08em", marginBottom: 4 }}>
                      Billed as ${(tier.annual * 12).toLocaleString()} upfront
                    </div>
                  )}
                  {annual && (
                    <div style={{ fontFamily: C.meta, fontSize: "0.58rem", color: tier.highlight ? "rgba(244,240,232,0.45)" : C.inkFaint, letterSpacing: "0.06em", marginBottom: 20 }}>
                      ${tier.annual}/mo equivalent · Save ${(tier.monthly - tier.annual) * 12}/yr
                    </div>
                  )}
                  {!annual && <div style={{ marginBottom: 20 }} />}

                  {/* Divider */}
                  <div style={{ height: 1, background: tier.highlight ? "rgba(255,255,255,0.1)" : C.rule, marginBottom: 20 }} />

                  {/* Features */}
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {tier.features.map((f, j) => {
                      const isNote = f.startsWith("+");
                      return (
                        <li key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: isNote ? 4 : 0, paddingTop: isNote ? 8 : 0, borderTop: isNote ? `1px solid ${tier.highlight ? "rgba(244,240,232,0.12)" : C.rule}` : "none" }}>
                          <span style={{ fontFamily: C.meta, fontSize: "0.75rem", fontWeight: 700, color: isNote ? C.inkFaint : C.forest, flexShrink: 0, marginTop: 2 }}>{isNote ? "·" : "✓"}</span>
                          <span style={{ fontFamily: C.body, fontSize: isNote ? "0.78rem" : "0.85rem", color: isNote ? (tier.highlight ? "rgba(244,240,232,0.45)" : C.inkFaint) : (tier.highlight ? "rgba(244,240,232,0.75)" : C.inkMid), lineHeight: 1.55, fontStyle: isNote ? "italic" : "normal" }}>{f}</span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => handlePricingCta(tier.name)}
                    disabled={createCheckout.isPending}
                    style={{
                      width: "100%", padding: "11px 20px",
                      fontFamily: C.meta, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em",
                      textTransform: "uppercase", border: "none", borderRadius: 3,
                      cursor: createCheckout.isPending ? "not-allowed" : "pointer",
                      background: tier.highlight ? C.paper : C.ink,
                      color: tier.highlight ? C.ink : C.paper,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "opacity 150ms",
                      opacity: createCheckout.isPending ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!createCheckout.isPending) e.currentTarget.style.opacity = "0.88"; }}
                    onMouseLeave={e => { if (!createCheckout.isPending) e.currentTarget.style.opacity = "1"; }}
                  >
                    {createCheckout.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                    {tier.cta} {!createCheckout.isPending && <ArrowRight size={13} />}
                  </button>
                  <div style={{ fontFamily: C.meta, fontSize: "0.55rem", color: tier.highlight ? "rgba(244,240,232,0.35)" : C.inkFaint, letterSpacing: "0.06em", textAlign: "center", marginTop: 10 }}>{tier.note}</div>
                  {(tier as any).setupFee && (
                    <div style={{ fontFamily: C.meta, fontSize: "0.55rem", color: tier.highlight ? "rgba(244,240,232,0.4)" : C.inkFaint, letterSpacing: "0.06em", textAlign: "center", marginTop: 4, whiteSpace: "nowrap" }}>
                      + ${(tier as any).setupFee} one-time setup fee
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────────────────── */}
      <section style={{ background: C.paper, borderBottom: `1px solid ${C.rule}`, padding: "40px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#A89880", marginBottom: 8 }}>Feature Matrix</div>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.8rem", fontWeight: 700, color: "#1C1917", letterSpacing: "-0.025em" }}>Compare plans</h2>
          </div>
          <div style={{ paddingTop: 32, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: C.body }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.ruleDark}` }}>
                  <th style={{ textAlign: "left", padding: "10px 16px 10px 0", fontFamily: C.meta, fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, fontWeight: 500 }}>Feature</th>
                  {tiers.map(t => (
                    <th key={t.name} style={{ textAlign: "center", padding: "10px 16px", fontFamily: C.meta, fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: t.highlight ? C.forest : C.inkMid, fontWeight: 700 }}>{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Staff members", "Up to 10", "Up to 50", "Unlimited"],
                  ["Credential tracking", "✓", "✓", "✓"],
                  ["Expiration reminders", "✓", "✓", "✓"],
                  ["AI document extraction", "✓", "✓", "✓"],
                  ["Audit-ready export", "✓", "✓", "✓"],
                  ["Ask AI", "20/month", "Unlimited", "Unlimited + priority"],
                  ["Live NC board verification", "—", "✓", "✓"],
                  ["Audit narrative generator", "—", "✓", "✓"],
                  ["Multi-state tracking", "—", "✓", "✓"],
                  ["Payer credentialing module", "—", "—", "✓"],
                  ["Monthly compliance review", "—", "—", "✓"],
                  ["AI-guided credential setup", "—", "—", "✓"],
                  ["Custom credential types", "—", "—", "✓"],
                  ["Support", "Email", "Priority email", "Priority"],
                ].map(([feature, ...vals], i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.rule}`, background: i % 2 === 0 ? "transparent" : C.paperDark }}>
                    <td style={{ padding: "11px 16px 11px 0", fontFamily: C.body, fontSize: "0.85rem", color: C.inkMid }}>{feature}</td>
                    {vals.map((v, j) => (
                      <td key={j} style={{ padding: "11px 16px", textAlign: "center", fontFamily: C.meta, fontSize: "0.72rem", color: v === "—" ? C.inkGhost : v === "✓" ? C.forest : C.inkMid, fontWeight: v === "✓" ? 700 : 400 }}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section style={{ background: C.paperDark, borderBottom: `1px solid ${C.rule}`, padding: "40px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <FolderHeader tab="FAQ" label="Common Questions" />
          <div style={{ paddingTop: 32 }}>
            <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.025em", marginBottom: 32 }}>
              Questions before you file.
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {faqs.map((faq, i) => (
                <div key={i} style={{ borderTop: `1px solid ${C.rule}` }}>
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    style={{
                      width: "100%", textAlign: "left", background: "none", border: "none",
                      cursor: "pointer", padding: "18px 0",
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
                    }}
                  >
                    <span style={{ fontFamily: C.body, fontSize: "0.95rem", fontWeight: 600, color: C.ink, lineHeight: 1.4 }}>{faq.q}</span>
                    <span style={{ fontFamily: C.meta, fontSize: "0.9rem", color: C.inkFaint, flexShrink: 0, marginTop: 2, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 200ms", display: "inline-block" }}>+</span>
                  </button>
                  {openFaq === i && (
                    <div style={{ paddingBottom: 18 }}>
                      <p style={{ fontFamily: C.body, fontSize: "0.9rem", color: C.inkLight, lineHeight: 1.65, margin: 0 }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.rule}` }} />
            </div>
            {/* FAQ disclaimer note */}
            <div style={{ marginTop: 24, padding: "12px 16px", background: "rgba(58,74,46,0.05)", border: "1px solid rgba(58,74,46,0.12)", borderRadius: 3 }}>
              <p style={{ fontFamily: C.body, fontSize: "0.78rem", color: C.inkLight, lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: C.inkMid }}>Administrative platform only.</strong> AuditReady is an administrative tracking platform. Agencies remain responsible for confirming licensing, payer, and regulatory requirements with the relevant licensing board, accreditation body, or qualified legal counsel.
              </p>
            </div>
          </div>
        </div>
      </section>

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
              padding: "13px 32px", fontFamily: C.meta, fontSize: "0.7rem", fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 8,
              transition: "opacity 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            Subscribe Now <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
