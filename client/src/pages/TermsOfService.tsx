/**
 * AuditReady — Terms of Service
 * Effective: May 2026
 * Operated by Vibemo Group
 */

import { Link } from "wouter";

const C = {
  forest:    "#1D3D2F",
  sage:      "#3D6B52",
  amber:     "#C4862A",
  parchment: "#F7F3ED",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
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

function WarningBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFF8EC", border: `1px solid #E8C97A`, borderRadius: 4, padding: "14px 18px", marginBottom: 16 }}>
      <p style={{ margin: 0, color: "#7A5010", fontFamily: C.sans, fontSize: "0.92rem", lineHeight: 1.75 }}>
        {children}
      </p>
    </div>
  );
}

export default function TermsOfService() {
  return (
    <div style={{ background: C.parchment, minHeight: "100vh" }}>
      {/* Nav */}
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
        {/* Header */}
        <div style={{ marginBottom: 48, borderBottom: `1px solid ${C.rule}`, paddingBottom: 32 }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 12 }}>Legal</p>
          <h1 style={{ fontFamily: C.serif, fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 700, color: C.inkDark, letterSpacing: "-0.025em", marginBottom: 12 }}>
            Terms of Service
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkFaint }}>
            Effective date: May 1, 2026 &nbsp;·&nbsp; Last updated: May 19, 2026
          </p>
        </div>

        <Section title="1. Acceptance of Terms">
          <p>By creating an account or using AuditReady ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you are using AuditReady on behalf of an organization, you represent that you have authority to bind that organization to these Terms.</p>
          <p style={{ marginTop: 12 }}>If you do not agree to these Terms, do not use the Service.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>AuditReady is an administrative credential tracking platform for ABA agencies, mental health clinics, psychology practices, and home care agencies, operated by <strong>Vibemo Group</strong>. It allows agencies to organize staff licenses, certifications, and training records, receive automated expiration reminders, and export credential reports. AuditReady is not a compliance guarantee, legal service, or substitute for a compliance officer.</p>
          <p style={{ marginTop: 12 }}>AuditReady is a staff management tool only. It is not a clinical records system, billing platform, or electronic health record (EHR). It is not designed to store, process, or transmit Protected Health Information (PHI) as defined under HIPAA.</p>
        </Section>

        <Section title="3. No PHI — Your Obligations">
          <WarningBox>
            <strong>You must not enter patient health information into AuditReady.</strong> This includes patient names, diagnoses, treatment plans, session notes, therapy records, Medicaid records, billing records, or any other Protected Health Information (PHI). AuditReady is not a HIPAA Business Associate and does not execute Business Associate Agreements (BAAs).
          </WarningBox>
          <p>You are solely responsible for ensuring that the data you enter into AuditReady does not include PHI. Violation of this obligation may result in immediate account termination.</p>
        </Section>

        <Section title="4. Free Pilot and Subscription">
          <p>AuditReady offers a <strong>14-day free pilot</strong> on all plans — Starter ($129/month), Growth ($249/month), and Enterprise ($449/month). No credit card is required to start the pilot.</p>
          <p style={{ marginTop: 12 }}>All plans include a <strong>$199 one-time setup fee</strong> charged at the time of subscription. This fee is non-refundable once account setup has begun.</p>
          <p style={{ marginTop: 12 }}>At the end of the pilot period, continued access requires a paid subscription. Subscription fees are billed monthly or annually as selected at sign-up. Annual subscriptions are billed in full upfront at a 10% discount. See the <Link href="/refunds"><span style={{ color: C.sage, cursor: "pointer" }}>Refund Policy</span></Link> for details on cancellations and refunds.</p>
        </Section>

        <Section title="4B. Auto-Renewal">
          <p>Paid subscriptions automatically renew at the end of each billing period at the then-current rate. You may cancel at any time via your account Settings page or by emailing <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a>. Cancellations take effect at the end of the current billing period. <strong>No refunds are issued for partial billing periods.</strong></p>
        </Section>

        <Section title="5. Account Responsibilities">
          <p>You are responsible for:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 2 }}>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activity that occurs under your account</li>
            <li>Ensuring that staff members with access to AuditReady understand these Terms</li>
            <li>Notifying us immediately of any unauthorized use of your account</li>
          </ul>
        </Section>

        <Section title="6. Audit Logging">
          <p>AuditReady automatically records all changes made to staff and credential records, including the identity of the user who made the change and the timestamp. This audit log is visible to account administrators and is retained for 7 years. By using AuditReady, all users of your account consent to this logging.</p>
          <p style={{ marginTop: 12 }}>We recommend informing your staff that their actions within AuditReady are logged for compliance purposes.</p>
        </Section>

        <Section title="7. Automated Email Reminders">
          <p>By using AuditReady, the account administrator consents to receive automated credential expiration reminder emails. These emails are sent to the account administrator's email address and contain only staff credential information — no patient data.</p>
          <p style={{ marginTop: 12 }}>To stop receiving reminder emails, contact <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a> or cancel your account.</p>
        </Section>

        <Section title="8. Not Legal or Compliance Advice">
          <WarningBox>
            <strong>AuditReady does not provide legal advice, compliance advice, or regulatory guidance.</strong> The credential checklists, requirement summaries, and compliance tools in AuditReady are provided for informational purposes only and are based on publicly available regulatory information as of the date shown. Requirements change. Always verify current requirements with the relevant licensing board, accreditation body, or qualified legal counsel before making hiring or compliance decisions.
          </WarningBox>
        </Section>

        <Section title="8B. AI-Generated Content">
          <p>AuditReady uses artificial intelligence for features including document extraction, license research, audit narrative generation, and the Ask AuditReady chat assistant. <strong>AI outputs are research aids only and may contain errors, omissions, or outdated information.</strong></p>
          <p style={{ marginTop: 12 }}>Users are responsible for independently verifying all AI-generated content with the relevant state licensing board, payer, accreditation body, or qualified legal counsel before taking any action. Vibemo Group makes no warranties regarding the accuracy, completeness, or fitness for purpose of any AI-generated output.</p>
        </Section>

        <Section title="9. Intellectual Property">
          <p>AuditReady and its content (software, design, text, and data structures) are owned by <strong>Vibemo Group</strong> and protected by copyright and other intellectual property laws. You may not copy, modify, distribute, or reverse-engineer any part of the Service.</p>
          <p style={{ marginTop: 12 }}>Customers retain ownership of the data they enter into AuditReady. By using the Service, you grant Vibemo Group a limited license to store and process your data solely to provide the Service.</p>
        </Section>

        <Section title="10. Limitation of Liability">
          <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, VIBEMO GROUP SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, AUDIT PENALTIES, MEDICAID CLAWBACKS, WAGE DISPUTES, OR BUSINESS INTERRUPTION, ARISING FROM YOUR USE OF THE SERVICE.</p>
          <p style={{ marginTop: 12 }}>VIBEMO GROUP'S TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE LESSER OF (A) THE TOTAL FEES YOU PAID TO AUDITREADY IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) ONE THOUSAND DOLLARS ($1,000).</p>
        </Section>

        <Section title="11. Termination">
          <p>Either party may terminate the agreement at any time. You may cancel your subscription at any time; your access will remain active through the end of the current billing period. Before account closure, you may export your administrative credential tracking data and reports using the CSV export feature.</p>
          <p style={{ marginTop: 12 }}>After account closure, AuditReady may retain limited billing, security, backup, and operational records as required for legal, tax, fraud-prevention, or system integrity purposes. Inactive account data may be removed according to AuditReady retention policies. See the <Link href="/privacy"><span style={{ color: C.sage, cursor: "pointer" }}>Privacy Policy</span></Link> for full details.</p>
          <p style={{ marginTop: 12 }}>Vibemo Group may suspend or terminate your account immediately if you violate these Terms, including the no-PHI obligation.</p>
        </Section>

        <Section title="12. Governing Law">
          <p>These Terms are governed by the laws of the State of North Carolina, without regard to its conflict of law provisions. Any disputes not subject to arbitration under Section 12B shall be resolved exclusively in the state or federal courts located in <strong>Wake County, North Carolina</strong>.</p>
        </Section>

        <Section title="12B. Dispute Resolution and Arbitration">
          <p>Except for claims seeking injunctive or equitable relief related to intellectual property or confidentiality obligations, any dispute, claim, or controversy arising out of or relating to these Terms or the Service shall be resolved by <strong>binding arbitration</strong> administered by the American Arbitration Association (AAA) under its Commercial Arbitration Rules. Arbitration shall take place in Wake County, North Carolina.</p>
          <p style={{ marginTop: 12 }}><strong>Both parties waive the right to a jury trial and the right to participate in any class action, class arbitration, or representative proceeding.</strong> The arbitrator's decision shall be final and binding and may be entered as a judgment in any court of competent jurisdiction.</p>
          <p style={{ marginTop: 12 }}>Nothing in this section prevents either party from seeking emergency injunctive relief from a court of competent jurisdiction to prevent irreparable harm pending arbitration.</p>
        </Section>

        <Section title="13. Changes to Terms">
          <p>We may update these Terms from time to time. We will notify account administrators by email at least 14 days before material changes take effect. Continued use of AuditReady after the effective date constitutes acceptance of the updated Terms.</p>
        </Section>

        <Section title="14. Contact">
          <p>For questions about these Terms or the Service, contact us at <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a>.</p>
          <p style={{ marginTop: 16 }}>
            <strong>Vibemo Group</strong><br />
            North Carolina, United States
          </p>
        </Section>

        {/* Footer nav */}
        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 24, marginTop: 48, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/privacy"><span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.sage, cursor: "pointer" }}>Privacy Policy</span></Link>
          <Link href="/refunds"><span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.sage, cursor: "pointer" }}>Refund Policy</span></Link>
          <Link href="/"><span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkFaint, cursor: "pointer" }}>← Back to Home</span></Link>
        </div>
      </main>
    </div>
  );
}
