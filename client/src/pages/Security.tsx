/**
 * AuditReady — /security page
 * Honest, plain-language security posture for compliance officers and IT reviewers.
 */

import { Link } from "wouter";
import { ArrowLeft, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

const C = {
  paper:      "#F4F0E8",
  paperDark:  "#EAE4D6",
  rule:       "#D6CEBC",
  ruleDark:   "#BEB5A2",
  ink:        "#1A1A1A",
  inkMid:     "#3D3D3D",
  inkLight:   "#6B6B6B",
  inkFaint:   "#9A9A9A",
  forest:     "#2D5A3D",
  forestBg:   "#EAF2EC",
  amber:      "#8B6914",
  amberBg:    "#FEF3CD",
  ui:         "'Plus Jakarta Sans', system-ui, sans-serif",
  body:       "'Plus Jakarta Sans', system-ui, sans-serif",
  display:    "'DM Serif Display', Georgia, serif",
  meta:       "'JetBrains Mono', 'Courier New', monospace",
};

const LAST_REVIEWED = "June 2026";

type StatusType = "yes" | "no" | "partial";

interface SecurityItem {
  label: string;
  status: StatusType;
  note: string;
}

const securityItems: SecurityItem[] = [
  { label: "HTTPS / TLS encryption in transit",           status: "yes",     note: "All traffic is served over TLS 1.2+. HTTP requests are redirected to HTTPS." },
  { label: "Encryption at rest (database)",               status: "yes",     note: "Database hosted on Neon (PostgreSQL). Encryption at rest is enabled by default." },
  { label: "Encryption at rest (file storage)",           status: "yes",     note: "Documents stored in S3-compatible cloud storage with server-side encryption (SSE-S3)." },
  { label: "Signed URLs for document access",             status: "yes",     note: "Uploaded files are never publicly accessible. Access requires a time-limited signed URL." },
  { label: "Tenant data isolation",                       status: "yes",     note: "Each agency's data is scoped to their account. Cross-tenant queries are not possible." },
  { label: "Session-based authentication",                status: "yes",     note: "Secure, httpOnly cookies with short expiration. Sessions invalidated on logout." },
  { label: "No patient health information (PHI) stored",  status: "yes",     note: "AuditReady stores staff credential records only. No patient data, therapy notes, or billing records." },
  { label: "Role-based access control",                   status: "partial", note: "Phase 1: single admin per agency. Multi-user roles with granular permissions are on the roadmap." },
  { label: "Audit logging",                               status: "partial", note: "Key actions (login, credential changes, exports) are logged. Full audit trail UI is in development." },
  { label: "Penetration testing",                         status: "no",      note: "Not yet completed. Planned before SOC 2 audit." },
  { label: "SOC 2 Type II certification",                 status: "no",      note: "In progress. We follow SOC 2 principles. Formal audit planned for 2026." },
  { label: "Business Associate Agreement (BAA)",          status: "no",      note: "Not required — AuditReady does not process PHI. If your compliance officer requires one, contact us." },
  { label: "Data Processing Agreement (DPA)",             status: "partial", note: "Available upon request for agencies that require one for vendor onboarding." },
  { label: "Vulnerability disclosure policy",             status: "partial", note: "Contact security@useauditready.com to report vulnerabilities. Formal policy in progress." },
];

const statusConfig: Record<StatusType, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  yes:     { label: "Yes",     color: C.forest,   bg: C.forestBg, icon: CheckCircle },
  partial: { label: "Partial", color: C.amber,    bg: C.amberBg,  icon: AlertCircle },
  no:      { label: "No",      color: "#B84040",  bg: "#FDEAEA",  icon: AlertCircle },
};

interface InfraProvider {
  name: string;
  role: string;
  detail: string;
  securityUrl: string;
}

const infraProviders: InfraProvider[] = [
  {
    name: "Neon",
    role: "Database (PostgreSQL)",
    detail: "Serverless PostgreSQL with encryption at rest, automatic backups, point-in-time restore, and SOC 2 Type II certification.",
    securityUrl: "https://neon.tech/docs/security/security-overview",
  },
  {
    name: "AWS S3",
    role: "File Storage",
    detail: "Industry-standard object storage with server-side encryption (SSE-S3), access logging, and signed URL access control. AWS holds ISO 27001, SOC 1/2/3, and FedRAMP certifications.",
    securityUrl: "https://aws.amazon.com/compliance/",
  },
  {
    name: "Manus",
    role: "Application Hosting & Infrastructure",
    detail: "AuditReady is deployed on Manus's managed cloud infrastructure, which provides TLS termination, DDoS protection, and isolated compute environments.",
    securityUrl: "https://manus.im",
  },
];

export default function Security() {
  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: C.body }}>

      {/* ── Nav ── */}
      <nav style={{ background: C.paper, borderBottom: `1px solid ${C.rule}`, padding: "0 clamp(16px, 4vw, 40px)", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/">
          <img src={LOGO_URL} alt="AuditReady" style={{ height: 32, width: "auto", objectFit: "contain", cursor: "pointer" }} />
        </Link>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: C.ui, fontSize: "0.82rem", fontWeight: 600, color: C.inkLight, textDecoration: "none" }}>
          <ArrowLeft size={14} />
          Back to home
        </Link>
      </nav>

      {/* ── Header ── */}
      <header style={{ background: "#1A2B1F", padding: "clamp(48px, 6vw, 80px) clamp(16px, 4vw, 40px)" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" as const }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(123,175,110,0.15)", border: "1px solid rgba(123,175,110,0.3)", borderRadius: 3, padding: "4px 12px" }}>
              <span style={{ fontFamily: C.meta, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#7BAF6E" }}>Security & Privacy</span>
            </div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(244,240,232,0.06)", border: "1px solid rgba(244,240,232,0.12)", borderRadius: 3, padding: "4px 12px" }}>
              <span style={{ fontFamily: C.meta, fontSize: "0.6rem", letterSpacing: "0.1em", color: "rgba(244,240,232,0.45)" }}>Last reviewed: {LAST_REVIEWED}</span>
            </div>
          </div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(2rem, 4vw, 3.2rem)", fontWeight: 700, color: "#F4F0E8", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 16 }}>
            How AuditReady protects your data.
          </h1>
          <p style={{ fontFamily: C.body, fontSize: "1.05rem", color: "rgba(244,240,232,0.6)", lineHeight: 1.75, maxWidth: 600, marginBottom: 0 }}>
            Written for compliance officers, IT reviewers, and agency directors. Plain language over marketing copy — including what we haven't done yet.
          </p>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "clamp(40px, 5vw, 64px) clamp(16px, 4vw, 40px)" }}>

        {/* What we store */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.025em", marginBottom: 12 }}>
            What AuditReady stores
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.97rem", color: C.inkMid, lineHeight: 1.78, marginBottom: 16 }}>
            AuditReady is an <strong>administrative credential tracking platform</strong>. We store information about your staff's professional credentials — not about your clients or patients.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: C.ruleDark, border: `1px solid ${C.ruleDark}`, borderRadius: 6, overflow: "hidden" }}>
            <div style={{ background: C.forestBg, padding: "20px 24px" }}>
              <div style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: C.forest, marginBottom: 14 }}>We store</div>
              {[
                "Staff names and contact info",
                "Professional license numbers and types",
                "Credential expiration dates",
                "Uploaded license/certification documents",
                "Background check status and dates",
                "Training completion records",
                "Agency account and billing info",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <CheckCircle size={13} color={C.forest} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ fontFamily: C.body, fontSize: "0.83rem", color: C.inkMid, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#FDEAEA", padding: "20px 24px" }}>
              <div style={{ fontFamily: C.ui, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#B84040", marginBottom: 14 }}>We never store</div>
              {[
                "Patient names, dates of birth, or identifiers",
                "Therapy notes or session records",
                "Medicaid or insurance billing data",
                "Client diagnoses or treatment plans",
                "Any protected health information (PHI)",
                "Social Security Numbers",
                "Financial account numbers",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <span style={{ color: "#B84040", fontSize: "0.9rem", flexShrink: 0, lineHeight: 1.6 }}>✕</span>
                  <span style={{ fontFamily: C.body, fontSize: "0.83rem", color: "#6B2020", lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security posture table */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.025em", marginBottom: 12 }}>
            Security posture
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.97rem", color: C.inkMid, lineHeight: 1.78, marginBottom: 20 }}>
            Three statuses: <strong>Yes</strong> (fully implemented), <strong>Partial</strong> (in progress or limited), and <strong>No</strong> (not yet done). Honest disclosure builds more trust than overstating our posture.
          </p>
          <div style={{ border: `1px solid ${C.ruleDark}`, borderRadius: 6, overflow: "hidden" }}>
            {securityItems.map((item, i) => {
              const cfg = statusConfig[item.status];
              const Icon = cfg.icon;
              return (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  padding: "14px 20px",
                  background: i % 2 === 0 ? C.paper : C.paperDark,
                  borderBottom: i < securityItems.length - 1 ? `1px solid ${C.rule}` : "none",
                  gap: 16,
                  alignItems: "flex-start",
                }}>
                  <div>
                    <div style={{ fontFamily: C.ui, fontSize: "0.88rem", fontWeight: 600, color: C.ink, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontFamily: C.body, fontSize: "0.78rem", color: C.inkLight, lineHeight: 1.55 }}>{item.note}</div>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: cfg.bg, border: `1px solid ${cfg.color}20`, borderRadius: 3, padding: "4px 10px", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
                    <Icon size={11} color={cfg.color} strokeWidth={2.5} />
                    <span style={{ fontFamily: C.meta, fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Verified by infrastructure */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.025em", marginBottom: 12 }}>
            Built on enterprise-grade infrastructure
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.97rem", color: C.inkMid, lineHeight: 1.78, marginBottom: 20 }}>
            AuditReady is built on infrastructure providers that hold their own independent security certifications. You are not trusting us alone — you are trusting the stack beneath us.
          </p>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 1, background: C.ruleDark, border: `1px solid ${C.ruleDark}`, borderRadius: 6, overflow: "hidden" }}>
            {infraProviders.map((p, i) => (
              <div key={i} style={{
                background: i % 2 === 0 ? C.paper : C.paperDark,
                padding: "18px 22px",
                display: "grid",
                gridTemplateColumns: "140px 1fr auto",
                gap: 16,
                alignItems: "flex-start",
              }}>
                <div>
                  <div style={{ fontFamily: C.ui, fontSize: "0.95rem", fontWeight: 700, color: C.ink, marginBottom: 3 }}>{p.name}</div>
                  <div style={{ fontFamily: C.meta, fontSize: "0.62rem", color: C.inkFaint, letterSpacing: "0.04em" }}>{p.role}</div>
                </div>
                <div style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkLight, lineHeight: 1.6 }}>{p.detail}</div>
                <a
                  href={p.securityUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: C.ui, fontSize: "0.72rem", fontWeight: 600, color: C.forest, textDecoration: "none", whiteSpace: "nowrap" as const, flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
                >
                  Security page <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* HIPAA note */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.025em", marginBottom: 12 }}>
            HIPAA applicability
          </h2>
          <div style={{ background: C.forestBg, border: `1px solid ${C.forest}30`, borderRadius: 6, padding: "20px 24px" }}>
            <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: C.inkMid, lineHeight: 1.78, marginBottom: 12 }}>
              HIPAA applies to covered entities and business associates that create, receive, maintain, or transmit protected health information (PHI). <strong>AuditReady does not process PHI.</strong>
            </p>
            <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: C.inkMid, lineHeight: 1.78, marginBottom: 12 }}>
              Staff credential records — license numbers, expiration dates, certifications — are not PHI. They are employment and professional records. AuditReady is not a covered entity and does not require a Business Associate Agreement (BAA) for standard use.
            </p>
            <p style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkLight, lineHeight: 1.7, margin: 0 }}>
              If your organization's compliance officer requires a BAA as a matter of policy, contact <a href="mailto:security@useauditready.com" style={{ color: C.forest }}>security@useauditready.com</a> and we will work with you.
            </p>
          </div>
        </section>

        {/* Data retention */}
        <section style={{ marginBottom: 52 }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)", fontWeight: 700, color: C.ink, letterSpacing: "-0.025em", marginBottom: 12 }}>
            Data retention & deletion
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.97rem", color: C.inkMid, lineHeight: 1.78, marginBottom: 12 }}>
            Your data belongs to you. If you cancel your subscription, your account enters a 30-day read-only period during which you can export your records. After 30 days, your data is permanently deleted from our systems.
          </p>
          <p style={{ fontFamily: C.body, fontSize: "0.97rem", color: C.inkMid, lineHeight: 1.78 }}>
            To request immediate deletion of your account and all associated data, contact <a href="mailto:support@useauditready.com" style={{ color: C.forest }}>support@useauditready.com</a>.
          </p>
        </section>

        {/* Contact */}
        <section style={{ background: C.paperDark, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "24px 28px" }}>
          <h2 style={{ fontFamily: C.ui, fontSize: "1rem", fontWeight: 700, color: C.ink, marginBottom: 8 }}>Security contact</h2>
          <p style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkMid, lineHeight: 1.7, marginBottom: 12 }}>
            To report a vulnerability, request a security review, or ask questions about our data practices:
          </p>
          <a href="mailto:security@useauditready.com" style={{ fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 700, color: C.forest, textDecoration: "none" }}>
            security@useauditready.com
          </a>
          <div style={{ height: 1, background: C.rule, margin: "20px 0 16px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 8 }}>
            <span style={{ fontFamily: C.meta, fontSize: "0.62rem", color: C.inkFaint, letterSpacing: "0.04em" }}>
              Last reviewed: {LAST_REVIEWED}
            </span>
            <span style={{ fontFamily: C.meta, fontSize: "0.62rem", color: C.inkFaint, letterSpacing: "0.04em" }}>
              AuditReady · A Vibemo Group product
            </span>
          </div>
        </section>

      </main>
    </div>
  );
}
