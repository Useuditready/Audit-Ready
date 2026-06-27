/**
 * /agency-already-registered
 * Shown when a second person from the same agency email domain tries to sign up.
 * Phase 1: 1 agency = 1 admin login only.
 * Phase 2 "Team Access" will allow multiple logins per agency.
 */

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

const C = {
  paper: "#F4F0E8",
  ink: "#1A1A1A",
  inkMid: "#5A5048",
  inkLight: "#7A6E64",
  rule: "#D6CFBF",
  linen: "#EBE5D8",
  red: "#C0392B",
};

export default function AgencyAlreadyRegistered() {
  return (
    <div style={{
      minHeight: "100vh",
      background: C.paper,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <a href="/" style={{ display: "inline-block" }}>
          <img src={LOGO_URL} alt="AuditReady" style={{ height: 36, width: "auto", objectFit: "contain" }} />
        </a>
      </div>

      {/* Card */}
      <div style={{
        background: "#FDFAF6",
        border: `1px solid ${C.rule}`,
        borderRadius: 4,
        padding: "48px 40px",
        maxWidth: 520,
        width: "100%",
        textAlign: "center",
      }}>
        {/* Icon */}
        <div style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: C.linen,
          border: `1px solid ${C.rule}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 24,
        }}>
          🏢
        </div>

        <h1 style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: "1.7rem",
          fontWeight: 700,
          color: C.ink,
          letterSpacing: "-0.02em",
          marginBottom: 16,
          lineHeight: 1.2,
        }}>
          This agency already has an active account
        </h1>

        <p style={{
          fontSize: "0.95rem",
          color: C.inkMid,
          lineHeight: 1.7,
          marginBottom: 24,
        }}>
          AuditReady currently supports one administrator login per agency subscription.
          Your agency's email domain is already associated with an active account.
        </p>

        <div style={{
          background: C.linen,
          border: `1px solid ${C.rule}`,
          borderRadius: 3,
          padding: "16px 20px",
          marginBottom: 32,
          textAlign: "left",
        }}>
          <p style={{ fontSize: "0.88rem", color: C.inkMid, lineHeight: 1.65, margin: 0 }}>
            <strong style={{ color: C.ink }}>What to do:</strong> Contact your agency's AuditReady administrator
            to access the dashboard. If you believe this is an error or need to transfer account ownership,
            please reach out to our support team.
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="mailto:support@useauditready.com?subject=Agency%20Account%20Access%20Request"
            style={{
              display: "inline-block",
              background: C.ink,
              color: "#F4F0E8",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              padding: "12px 24px",
              borderRadius: 3,
              letterSpacing: "0.03em",
            }}
          >
            Contact Support
          </a>
          <a
            href="/"
            style={{
              display: "inline-block",
              border: `1px solid ${C.rule}`,
              color: C.inkMid,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: "0.85rem",
              textDecoration: "none",
              padding: "12px 24px",
              borderRadius: 3,
            }}
          >
            Back to Home
          </a>
        </div>
      </div>

      {/* Phase 2 note */}
      <div style={{
        marginTop: 32,
        maxWidth: 480,
        textAlign: "center",
      }}>
        <p style={{ fontSize: "0.78rem", color: C.inkLight, lineHeight: 1.65 }}>
          <strong style={{ color: C.inkMid }}>Coming in Phase 2:</strong> Team Access — invite multiple staff members
          to your agency's AuditReady account with role-based permissions.
        </p>
      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: "0.78rem", color: C.inkLight, textAlign: "center" }}>
        AuditReady · A Vibemo Group company ·{" "}
        <a href="mailto:support@useauditready.com" style={{ color: C.inkLight }}>support@useauditready.com</a>
        {" "}·{" "}
        <a href="/privacy" style={{ color: C.inkLight }}>Privacy</a>
        {" "}·{" "}
        <a href="/terms" style={{ color: C.inkLight }}>Terms</a>
      </p>
    </div>
  );
}
