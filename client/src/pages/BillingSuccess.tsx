/**
 * AuditReady — Billing Success Page
 * Shown after a successful Stripe Checkout session.
 * Matches the "Digital Compliance Folder" aesthetic.
 */

import { useEffect, useState } from "react";
import { CheckCircle, ArrowRight, FileText, Bell, Shield, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";

const C = {
  paper:     "#F4F0E8",
  paperDark: "#EAE4D6",
  rule:      "#D6CEBC",
  ink:       "#1A1A1A",
  inkMid:    "#4A4035",
  inkLight:  "#7A6E64",
  forest:    "#3A4A2E",
  sage:      "#5A7A4A",
  amber:     "#8B6914",
  display:   "'DM Serif Display', Georgia, serif",
  body:      "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
};

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

const NEXT_STEPS = [
  {
    icon: FileText,
    step: "01",
    title: "Add your first staff member",
    desc: "Enter their name, role, and hire date to begin tracking credentials.",
    href: "/staff",
  },
  {
    icon: Upload,
    step: "02",
    title: "Upload credential documents",
    desc: "Photograph or link licenses, CPR cards, and background checks. AI reads expiration dates automatically.",
    href: "/staff",
  },
  {
    icon: Bell,
    step: "03",
    title: "Configure expiration reminders",
    desc: "Set up email alerts at 90, 60, and 30 days before any credential expires.",
    href: "/settings",
  },
  {
    icon: Shield,
    step: "04",
    title: "Run your first compliance check",
    desc: "Verify licenses against NC state boards and BACB directly from the dashboard.",
    href: "/dashboard",
  },
];

export default function BillingSuccess() {
  const [countdown, setCountdown] = useState(10);
  const { data: profile } = trpc.settings.getProfile.useQuery(undefined, { retry: false });

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = "/dashboard";
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const planLabel = profile?.plan
    ? profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: C.body, color: C.ink, display: "flex", flexDirection: "column" }}>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav style={{ background: C.forest, padding: "0 32px", height: 60, display: "flex", alignItems: "center", gap: 12, borderBottom: "3px solid rgba(255,255,255,0.06)" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src={LOGO_URL} alt="AuditReady" style={{ height: 28, filter: "brightness(0) invert(1)", opacity: 0.9 }} />
          <span style={{ fontFamily: C.display, fontSize: "1.2rem", fontWeight: 700, color: "#F4F0E8", letterSpacing: "-0.02em" }}>
            Audit<span style={{ color: "#7BAF6E" }}>Ready</span>
          </span>
        </a>
        <span style={{ fontFamily: C.body, fontSize: "0.8rem", color: "rgba(240,235,227,0.4)", marginLeft: 4 }}>
          · A Vibemo Group company
        </span>
      </nav>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 24px 64px" }}>
        <div style={{ maxWidth: 640, width: "100%" }}>

          {/* ── Folder-style success card ─────────────────────── */}
          <div style={{ background: C.paperDark, border: `1px solid ${C.rule}`, borderRadius: "0 6px 6px 6px", position: "relative", overflow: "visible" }}>
            {/* Folder tab */}
            <div style={{ position: "absolute", top: -36, left: 0, background: C.paperDark, border: `1px solid ${C.rule}`, borderBottom: "none", borderRadius: "6px 6px 0 0", padding: "8px 20px", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={13} color={C.forest} strokeWidth={2.5} />
              <span style={{ fontFamily: C.mono, fontSize: "0.68rem", fontWeight: 600, color: C.forest, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                Subscription Confirmed
              </span>
            </div>

            {/* Card body */}
            <div style={{ padding: "36px 40px 40px" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#E8F2E4", border: `2px solid ${C.sage}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                <CheckCircle size={32} color={C.forest} strokeWidth={1.75} />
              </div>

              <h1 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.025em", margin: "0 0 12px" }}>
                You're all set.
              </h1>

              <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkMid, lineHeight: 1.7, margin: "0 0 8px" }}>
                {planLabel ? <><strong>{planLabel} plan</strong> is now active. </> : "Your AuditReady subscription is now active. "}
                Your agency's compliance dashboard is ready to use.
              </p>

              <p style={{ fontFamily: C.body, fontSize: "0.875rem", color: C.inkLight, lineHeight: 1.6, margin: "0 0 32px" }}>
                A confirmation receipt has been sent to your email. Questions?{" "}
                <a href="mailto:support@useauditready.com" style={{ color: C.forest }}>support@useauditready.com</a>
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" as const }}>
                <a href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.forest, color: "#F4F0E8", fontFamily: C.body, fontSize: "0.9rem", fontWeight: 600, padding: "13px 28px", borderRadius: 4, textDecoration: "none" }}>
                  Go to Dashboard <ArrowRight size={16} />
                </a>
                <span style={{ fontFamily: C.mono, fontSize: "0.72rem", color: C.inkLight }}>
                  Redirecting in {countdown}s…
                </span>
              </div>
            </div>
          </div>

          {/* ── Getting Started Steps ─────────────────────────── */}
          <div style={{ marginTop: 40 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingBottom: 12, borderBottom: `1px solid ${C.rule}` }}>
              <span style={{ fontFamily: C.mono, fontSize: "0.65rem", fontWeight: 700, color: C.amber, letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
                Getting Started
              </span>
              <div style={{ flex: 1, height: 1, background: C.rule }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column" as const, gap: 10 }}>
              {NEXT_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <a key={i} href={step.href} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 20px", background: C.paperDark, border: `1px solid ${C.rule}`, borderRadius: 4, textDecoration: "none" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 4, background: C.paper, border: `1px solid ${C.rule}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={16} color={C.forest} strokeWidth={1.75} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontFamily: C.mono, fontSize: "0.6rem", color: C.inkLight, letterSpacing: "0.06em" }}>STEP {step.step}</span>
                      <p style={{ fontFamily: C.body, fontSize: "0.9rem", fontWeight: 600, color: C.ink, margin: "2px 0 4px", lineHeight: 1.3 }}>{step.title}</p>
                      <p style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkMid, margin: 0, lineHeight: 1.55 }}>{step.desc}</p>
                    </div>
                    <ArrowRight size={16} color={C.forest} style={{ flexShrink: 0, alignSelf: "center" }} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.rule}`, padding: "16px 32px", textAlign: "center", background: C.paperDark }}>
        <p style={{ fontFamily: C.mono, fontSize: "0.68rem", color: C.inkLight, margin: 0, letterSpacing: "0.04em" }}>
          © 2026 AUDITREADY · A VIBEMO GROUP COMPANY
        </p>
      </footer>
    </div>
  );
}
