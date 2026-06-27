/**
 * AuditReady — Billing Cancel Page
 * Shown when a user cancels or abandons the Stripe Checkout session.
 */

import { Link } from "wouter";
import { ArrowLeft, Mail } from "lucide-react";

const C = {
  forest:    "#3A4A2E",
  forestMid: "#3F5035",
  parchment: "#F7F3ED",
  cream:     "#FDFAF6",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  ui:        "'Plus Jakarta Sans', system-ui, sans-serif",
  serif:     "'DM Serif Display', Georgia, serif",
};

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

export default function BillingCancel() {
  return (
    <div style={{ minHeight: "100vh", background: C.cream, display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{ background: C.forest, padding: "16px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <img src={LOGO_URL} alt="AuditReady" style={{ height: 32, filter: "brightness(0) invert(1)", opacity: 0.92 }} />
        <span style={{ fontFamily: C.ui, fontSize: "0.85rem", color: "rgba(240,235,227,0.5)", marginLeft: 4 }}>
          · A Vibemo Group company
        </span>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 24px" }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>

          {/* Icon */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: C.linen, border: `1px solid ${C.rule}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 28px",
          }}>
            <ArrowLeft size={32} color={C.inkMid} strokeWidth={1.5} />
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: C.serif, fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 700, color: C.inkDark, letterSpacing: "-0.025em",
            marginBottom: 16,
          }}>
            No problem — come back when you're ready.
          </h1>

          <p style={{
            fontFamily: C.ui, fontSize: "0.95rem", color: C.inkMid,
            lineHeight: 1.7, marginBottom: 36,
          }}>
            Your checkout was cancelled and you have not been charged. Your free pilot is still available whenever you're ready to get started.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <Link href="/#pricing">
              <a style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: C.forest, color: "#F0EBE3",
                fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 600,
                padding: "13px 28px", borderRadius: 4, textDecoration: "none",
              }}>
                View Pricing Plans
              </a>
            </Link>

            <a
              href="mailto:support@useauditready.com?subject=AuditReady%20Pricing%20Question"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontFamily: C.ui, fontSize: "0.875rem", color: C.inkMid,
                textDecoration: "none", padding: "10px 20px",
              }}
            >
              <Mail size={15} />
              Have a question? Email us
            </a>
          </div>

          {/* Reassurance */}
          <div style={{
            marginTop: 48, padding: "20px 24px",
            background: C.linen, border: `1px solid ${C.rule}`,
            borderRadius: 6,
          }}>
            <p style={{
              fontFamily: C.ui, fontSize: "0.825rem", color: C.inkLight,
              lineHeight: 1.65, margin: 0,
            }}>
              AuditReady offers a <strong style={{ color: C.inkMid }}>14-day free pilot</strong> — no credit card required to get started. If you have questions about pricing or need a custom quote for your agency, reach out at{" "}
              <a href="mailto:support@useauditready.com" style={{ color: C.forest }}>support@useauditready.com</a>.
            </p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.rule}`, padding: "20px 32px", textAlign: "center" }}>
        <p style={{ fontFamily: C.ui, fontSize: "0.75rem", color: C.inkLight, margin: 0 }}>
          © 2026 AuditReady · A Vibemo Group company
        </p>
      </footer>
    </div>
  );
}
