/**
 * AuditReady — Privacy Policy
 * Effective: May 2026
 * Covers: data collected, use, retention, user rights, no-PHI commitment
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

export default function PrivacyPolicy() {
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
            Privacy Policy
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkFaint }}>
            Effective date: May 1, 2026 &nbsp;·&nbsp; Last updated: June 9, 2026
          </p>
        </div>

        {/* Important notice box */}
        <div style={{ background: "#EDF4EF", border: `1px solid #B8D4C0`, borderRadius: 4, padding: "16px 20px", marginBottom: 40 }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.88rem", color: C.forest, margin: 0, lineHeight: 1.65 }}>
            <strong>AuditReady is not a HIPAA Business Associate and does not collect, store, or process Protected Health Information (PHI).</strong>{" "}
            AuditReady is a staff credential tracking tool for behavioral health agencies. It stores information about agency staff members (names, roles, license numbers, expiration dates) — not patient records, clinical notes, therapy documentation, billing records, or any other client health information.
          </p>
        </div>

        <Section title="1. Who We Are">
          <p>AuditReady is an administrative credential tracking platform for ABA agencies, mental health clinics, psychology practices, and home care agencies. AuditReady is operated by <strong>Vibemo Group</strong>. AuditReady is an administrative tool — it does not provide legal advice, compliance guarantees, or regulatory guidance.</p>
          <p style={{ marginTop: 12 }}>For questions about this Privacy Policy, contact us at: <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a></p>
        </Section>

        <Section title="2. What Information We Collect">
          <p><strong>Account information:</strong> When you create an account, we collect your name, email address, agency name, and account credentials (managed via Clerk authentication).</p>
          <p style={{ marginTop: 12 }}><strong>Staff data you enter:</strong> You may enter information about your agency's staff members, including their names, job roles, email addresses, phone numbers, hire dates, and employment status. This is operational data about your employees — not patient data.</p>
          <p style={{ marginTop: 12 }}><strong>Credential data you enter:</strong> You may enter credential records for staff, including license types, license numbers, issuing bodies, issue dates, expiration dates, and document files (PDFs, images of licenses and certifications). Uploaded documents are stored in encrypted cloud storage and are accessible only to your account administrators.</p>
          <p style={{ marginTop: 12 }}><strong>AI-processed document data:</strong> When you use the optional AI document extraction feature ("Upload &amp; Auto-Fill"), the document you upload is transmitted to an AI service for processing. The AI reads the document and returns suggested fields (credential type, expiration date, license number). The AI service does not retain your document or its contents beyond the duration of the request. You must review and approve all AI-suggested values before they are saved — nothing is saved automatically. Do not upload documents containing patient names, diagnoses, treatment records, or any other Protected Health Information (PHI). Upload staff credential documents only (licenses, certifications, CPR cards, training certificates).</p>
          <p style={{ marginTop: 12 }}><strong>Audit log data:</strong> AuditReady automatically records changes made to staff and credential records, including who made the change and when. This is used for compliance accountability and is visible to account administrators.</p>
          <p style={{ marginTop: 12 }}><strong>Usage data:</strong> We collect standard server logs (IP addresses, browser type, pages visited, timestamps) for security and performance monitoring.</p>
          <p style={{ marginTop: 12 }}><strong>What we do NOT collect:</strong> AuditReady does not collect, store, or process patient names, patient health information, clinical notes, therapy records, session notes, Medicaid records, billing records, diagnoses, treatment plans, or any other Protected Health Information (PHI) as defined under HIPAA.</p>
        </Section>

        <Section title="3. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 2 }}>
            <li>Provide and operate the AuditReady platform</li>
            <li>Send automated credential expiration reminder emails to account administrators</li>
            <li>Maintain audit logs of changes to staff and credential records</li>
            <li>Respond to support requests</li>
            <li>Improve platform performance and reliability</li>
            <li>Comply with applicable laws and regulations</li>
          </ul>
          <p style={{ marginTop: 12 }}>We do not sell your data to third parties. We do not use your data for advertising purposes.</p>
        </Section>

        <Section title="4. Data Sharing">
          <p>We do not sell your data. We share data only with the following service providers ("sub-processors") who help us operate AuditReady:</p>
          <ul style={{ marginTop: 12, paddingLeft: 20, lineHeight: 2.2 }}>
            <li><strong>Clerk</strong> — authentication and user account management (stores email and login credentials)</li>
            <li><strong>Stripe</strong> — payment processing (stores billing information; we do not store full credit card numbers)</li>
            <li><strong>Resend</strong> — transactional email delivery (processes recipient email addresses and message content for reminders and notifications)</li>
            <li><strong>OpenAI</strong> — AI features (processes uploaded credential documents and user queries to power AI document extraction and the Ask AuditReady chat; documents and queries are transmitted via API and are not retained by OpenAI for training purposes under their API data usage policy)</li>
            <li><strong>Manus</strong> — application hosting infrastructure and cloud file storage (uploaded credential documents are stored in Manus-managed encrypted object storage)</li>
            <li><strong>Neon</strong> — managed PostgreSQL database (operated under our direct account)</li>
          </ul>
          <p style={{ marginTop: 12 }}>We may also share data when required by law, in response to lawful government requests, or in connection with a business transfer (merger, acquisition, or asset sale), subject to the requirements of this Policy.</p>
        </Section>

        <Section title="5. Data Retention">
          <p>We retain your account and administrative credential tracking data for as long as your account is active. Before closing your account, you may export your credential tracking data and reports using the CSV export feature.</p>
          <p style={{ marginTop: 12 }}>After account closure, AuditReady may retain limited billing, security, backup, and operational records as required for legal, tax, fraud-prevention, or system integrity purposes. Inactive account data may be removed according to AuditReady retention policies. We do not guarantee immediate or complete deletion of all records upon account closure.</p>
          <p style={{ marginTop: 12 }}>Audit log records are retained for 7 years from the date of the logged action to support compliance documentation needs.</p>
        </Section>

        <Section title="6. Security">
          <p>AuditReady uses industry-standard security measures including encrypted data transmission (TLS), encrypted database storage, and access controls. All staff and credential data is isolated per agency account.</p>
          <p style={{ marginTop: 12 }}>Because AuditReady does not store PHI, it is not subject to HIPAA's Security Rule. However, we apply equivalent technical safeguards to protect the operational data you entrust to us.</p>
        </Section>

        <Section title="7. Your Rights">
          <p>As an account holder, you have the right to:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, lineHeight: 2 }}>
            <li><strong>Access</strong> the data stored in your account at any time via the platform</li>
            <li><strong>Export</strong> your administrative credential tracking data and reports at any time using the CSV export feature</li>
            <li><strong>Correct</strong> inaccurate data by editing records directly in the platform</li>
            <li><strong>Request account closure</strong> by contacting us (see Data Retention above for applicable retention terms)</li>
            <li><strong>Opt out</strong> of non-essential email communications by contacting us at <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a></li>
          </ul>
        </Section>

        <Section title="8. Cookies">
          <p>AuditReady uses session cookies to maintain your login state. We do not use advertising cookies or third-party tracking cookies. You can disable cookies in your browser, but this will prevent you from logging in to the platform.</p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>AuditReady is a professional tool intended for use by adults operating behavioral health agencies. We do not knowingly collect information from individuals under the age of 18.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify account administrators by email at least 14 days before material changes take effect. Continued use of AuditReady after the effective date constitutes acceptance of the updated policy.</p>
        </Section>

        <Section title="11. International Users">
          <p>AuditReady is operated from the United States. By using the platform, users outside the United States consent to having their data transferred to and processed in the United States.</p>
        </Section>

        <Section title="12. State Privacy Rights">
          <p>If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA) including the right to know what personal data we have collected, the right to delete it, and the right to opt out of sale (we do not sell data). Virginia residents have similar rights under the Virginia Consumer Data Protection Act (VCDPA). Colorado, Connecticut, and Utah residents have analogous rights under their respective state laws.</p>
          <p style={{ marginTop: 12 }}>To exercise these rights, contact <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a>.</p>
        </Section>

        <Section title="13. Data Breach Notification">
          <p>In the event of a data breach affecting your personal information, we will notify affected users within 72 hours of discovery, in compliance with applicable state notification laws.</p>
        </Section>

        <Section title="14. Contact">
          <p>For support, privacy questions, data deletion requests, or any other concerns, contact us at <a href="mailto:support@useauditready.com" style={{ color: C.sage }}>support@useauditready.com</a>.</p>
          <p style={{ marginTop: 12 }}>
            <strong>Vibemo Group</strong><br />
            North Carolina, United States
          </p>
        </Section>

        {/* Footer nav */}
        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 24, marginTop: 48, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <Link href="/terms"><span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.sage, cursor: "pointer" }}>Terms of Service</span></Link>
          <Link href="/refunds"><span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.sage, cursor: "pointer" }}>Refund Policy</span></Link>
          <Link href="/"><span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkFaint, cursor: "pointer" }}>← Back to Home</span></Link>
        </div>
      </main>
    </div>
  );
}
