/**
 * AuditReady — Refund Policy
 * Effective: May 2026
 * Operated by Vibemo Group
 */

import { Link } from "wouter";

const C = {
  forest:    "#1D3D2F",
  sage:      "#3D6B52",
  parchment: "#F7F3ED",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkFaint:  "#A89880",
  serif:     "'DM Serif Display', Georgia, serif",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: C.serif, fontSize: "1.5rem", fontWeight: 700, color: C.inkDark, marginBottom: 12, letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <div style={{ fontFamily: C.sans, fontSize: "0.92rem", color: C.inkMid, lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
  );
}

export default function RefundPolicy() {
  return (
    <div style={{ background: C.parchment, minHeight: "100vh" }}>
      <header style={{ background: C.forest, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/">
          <span style={{ fontFamily: C.serif, fontSize: "1.3rem", fontWeight: 700, color: "#F0EBE3", cursor: "pointer", letterSpacing: "-0.02em" }}>
            AuditReady
          </span>
        </Link>
        <Link href="/">
          <span style={{ fontFamily: C.sans, fontSize: "0.8rem", color: "rgba(240,235,227,0.6)", cursor: "pointer" }}>← Back to Home</span>
        </Link>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 80px" }}>
        <div style={{ marginBottom: 40, borderBottom: `1px solid ${C.rule}`, paddingBottom: 32 }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 12 }}>Legal</p>
          <h1 style={{ fontFamily: C.serif, fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 700, color: C.inkDark, letterSpacing: "-0.025em", marginBottom: 12 }}>
            Refund Policy
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkFaint }}>
            Effective date: May 1, 2026 &nbsp;·&nbsp; Last updated: May 21, 2026
          </p>
        </div>

        <div style={{ background: "#EDF4EF", border: `1px solid #B8D4C0`, borderRadius: 4, padding: "20px 24px", marginBottom: 48 }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.forest, marginBottom: 12 }}>Quick Summary</p>
          <ul style={{ fontFamily: C.sans, fontSize: "0.88rem", color: C.forest, margin: 0, paddingLeft: 20, lineHeight: 2.2 }}>
            <li><strong>14-day Free Pilot</strong> — no charge, no credit card required</li>
            <li><strong>Monthly subscriptions</strong> — cancel anytime, no prorated refunds for partial months</li>
            <li><strong>Annual subscriptions</strong> — billed in full upfront, non-refundable once processed</li>
            <li><strong>$199 setup fee</strong> — non-refundable once account setup has begun</li>
            <li><strong>Exceptions:</strong> duplicate billing, billing after confirmed cancellation, 72+ hour outage</li>
          </ul>
        </div>

        <Section title="1. Free 14-Day Pilot">
          <p>AuditReady offers a <strong>14-day free pilot</strong> for all new accounts on the Starter ($129/month), Growth ($249/month), and Enterprise ($449/month) plans. No credit card is required to start the pilot. You can use the full platform during the pilot period at no charge.</p>
          <p style={{ marginTop: 12 }}>At the end of the pilot period, you will be prompted to select a paid plan to continue. If you do not subscribe, your account will be deactivated. Before account closure, you may export your administrative credential tracking data using the CSV export feature. AuditReady may retain limited billing, security, and operational records as required for legal or system integrity purposes. Inactive account data may be removed according to AuditReady retention policies.</p>
        </Section>

        <Section title="2. One-Time Setup Fee">
          <p>All plans include a <strong>$199 one-time setup fee</strong> charged at the time of subscription. This fee covers account configuration, credential type setup, and AI system initialization for your agency.</p>
          <p style={{ marginTop: 12 }}>The setup fee is <strong>non-refundable</strong> once account setup has begun. If you cancel before setup begins, the setup fee will be refunded in full.</p>
        </Section>

        <Section title="3. Monthly Subscriptions">
          <p>Monthly subscriptions are billed at the start of each billing period. You may cancel at any time via your account <strong>Settings page</strong> or by emailing <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a>. Cancellation takes effect at the end of the current billing period.</p>
          <p style={{ marginTop: 12 }}><strong>Refunds:</strong> Monthly subscription fees are non-refundable once the billing period has begun. Cancellation mid-month does not result in a prorated refund.</p>
        </Section>

        <Section title="4. Annual Subscriptions">
          <p>Annual subscriptions are billed in full upfront at a 10% discount. Annual billing amounts are:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 2 }}>
            <li><strong>Starter:</strong> $1,392/year ($116/month equivalent)</li>
            <li><strong>Growth:</strong> $2,688/year ($224/month equivalent)</li>
            <li><strong>Enterprise:</strong> $4,848/year ($404/month equivalent)</li>
          </ul>
          <p style={{ marginTop: 12 }}>Annual subscriptions are <strong>non-refundable</strong> once payment has been processed. You may cancel at any time to prevent renewal at the next annual cycle.</p>
        </Section>

        <Section title="5. Exceptions">
          <p>We will consider refund requests on a case-by-case basis in the following circumstances:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 2 }}>
            <li>A billing error resulted in a duplicate charge</li>
            <li>You were charged after submitting a cancellation request and can provide documentation</li>
            <li>A significant service outage (more than 72 consecutive hours) occurred during your paid period</li>
          </ul>
          <p style={{ marginTop: 12 }}>To request a refund, contact <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a> within 14 days of the charge.</p>
        </Section>

        <Section title="6. Chargebacks">
          <p>Initiating a chargeback or payment dispute before contacting us to resolve the issue directly violates these Terms. We will dispute any fraudulent chargebacks with documentation of services rendered, including account activity logs, subscription records, and email correspondence.</p>
          <p style={{ marginTop: 12 }}>Accounts that initiate chargebacks may be permanently banned from AuditReady and all Vibemo Group services.</p>
        </Section>

        <Section title="7. How to Cancel">
          <p>You can cancel your subscription at any time using either of the following methods:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 2 }}>
            <li>Go to <strong>Settings → Subscription</strong> in your AuditReady account and follow the cancellation steps</li>
            <li>Email <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a> with your account email address</li>
          </ul>
          <p style={{ marginTop: 12 }}>We will confirm cancellation within 1 business day. Your access remains active through the end of the current billing period. Before account closure, you may export your administrative credential tracking data and reports using the CSV export feature. AuditReady may retain limited billing, security, backup, and operational records as required for legal, tax, fraud-prevention, or system integrity purposes.</p>
        </Section>

        <Section title="8. Contact">
          <p>For billing questions, refund requests, or cancellations:</p>
          <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 2.4 }}>
            <li><strong>Cancel / refund requests:</strong> <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a></li>
            <li><strong>Billing disputes:</strong> <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a></li>
            <li><strong>Legal:</strong> <a href="mailto:legal@useauditready.com" style={{ color: C.sage }}>legal@useauditready.com</a></li>
          </ul>
          <p style={{ marginTop: 16 }}>
            <strong>Vibemo Group</strong><br />
            North Carolina, United States
          </p>
        </Section>

        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 24, marginTop: 48, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/privacy"><span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.sage, cursor: "pointer" }}>Privacy Policy</span></Link>
          <Link href="/terms"><span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.sage, cursor: "pointer" }}>Terms of Service</span></Link>
          <Link href="/"><span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkFaint, cursor: "pointer" }}>← Back to Home</span></Link>
        </div>
      </main>
    </div>
  );
}
