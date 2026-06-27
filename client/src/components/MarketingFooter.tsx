/**
 * AuditReady — Shared Marketing Footer
 * Used by all public-facing marketing pages.
 */
import { Link } from "wouter";
import { C } from "@/lib/design";

const MONOGRAM_URL = "/manus-storage/auditready-monogram-v2_0b7ecdd4.png";

const FOOTER_LINKS = {
  Product: [
    { label: "Features",          href: "/features" },
    { label: "How It Works",      href: "/how-it-works" },
    { label: "Pricing",           href: "/pricing" },
    { label: "Behavioral Health", href: "/behavioral-health-credentials" },
    { label: "FAQ",               href: "/faq" },
  ],
  Company: [
    { label: "About",             href: "/about" },
    { label: "Security",          href: "/security" },
    { label: "Privacy Policy",    href: "/privacy" },
    { label: "Terms of Service",  href: "/terms" },
    { label: "Refund Policy",     href: "/refunds" },
  ],
};

export default function MarketingFooter() {
  return (
    <footer style={{
      background: C.darkBg,
      borderTop: `1px solid ${C.darkRule}`,
      padding: "64px clamp(20px, 5vw, 48px) 40px",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Top row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "40px 32px",
          marginBottom: 56,
        }}>
          {/* Brand column */}
          <div style={{ gridColumn: "span 1" }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 16 }}>
              <img src={MONOGRAM_URL} alt="AR" style={{ height: 28, width: 28, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.85 }} />
              <span style={{ fontFamily: C.display, fontSize: "1.15rem", fontWeight: 700, color: C.darkText, letterSpacing: "-0.025em" }}>
                Audit<span style={{ color: C.forest }}>Ready</span>
              </span>
            </Link>
            <p style={{ fontFamily: C.body, fontSize: "0.85rem", color: C.darkTextMid, lineHeight: 1.65, maxWidth: 220 }}>
              Credential compliance for behavioral health agencies in North Carolina and beyond.
            </p>
            <p style={{ fontFamily: C.meta, fontSize: "0.75rem", color: C.darkTextFaint, marginTop: 12 }}>
              Built for organization support — not legal advice.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <p style={{
                fontFamily: C.ui, fontSize: "0.7rem", fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: C.darkTextFaint, marginBottom: 16,
              }}>
                {section}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((l) => (
                  <Link
                    key={l.label}
                    href={l.href}
                    style={{
                      fontFamily: C.body, fontSize: "0.875rem",
                      color: C.darkTextMid, textDecoration: "none",
                      transition: "color 140ms",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.darkText; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.darkTextMid; }}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Contact column */}
          <div>
            <p style={{
              fontFamily: C.ui, fontSize: "0.7rem", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase",
              color: C.darkTextFaint, marginBottom: 16,
            }}>
              Contact
            </p>
            <a
              href="mailto:support@useauditready.com"
              style={{ fontFamily: C.body, fontSize: "0.875rem", color: C.darkTextMid, textDecoration: "none", display: "block", marginBottom: 8, transition: "color 140ms" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = C.darkText; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = C.darkTextMid; }}
            >
              support@useauditready.com
            </a>
            <p style={{ fontFamily: C.body, fontSize: "0.8rem", color: C.darkTextFaint, lineHeight: 1.5 }}>
              Serving behavioral health agencies across North Carolina
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{
          borderTop: `1px solid ${C.darkRule}`,
          paddingTop: 28,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <p style={{ fontFamily: C.meta, fontSize: "0.75rem", color: C.darkTextFaint }}>
            &copy; {new Date().getFullYear()} AuditReady. All rights reserved.
          </p>
          <p style={{ fontFamily: C.body, fontSize: "0.75rem", color: C.darkTextFaint }}>
            A Vibemo Group company &mdash; Built for compliance teams, not lawyers.
          </p>
        </div>
      </div>
    </footer>
  );
}
