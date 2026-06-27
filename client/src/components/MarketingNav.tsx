/**
 * AuditReady — Shared Marketing Navigation
 * Used by all public-facing marketing pages (FAQ, About, Features, Pricing, HowItWorks, BehavioralHealth)
 */
import { useState } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { getLoginUrl, getSignUpUrl } from "@/const";
import { C } from "@/lib/design";

const MONOGRAM_URL = "/manus-storage/auditready-monogram-v2_0b7ecdd4.png";

const NAV_LINKS = [
  { label: "Features",          href: "/#features" },
  { label: "How It Works",      href: "/how-it-works" },
  { label: "Pricing",           href: "/pricing" },
  { label: "FAQ",               href: "/faq" },
  { label: "Security",          href: "/security" },
];

interface MarketingNavProps {
  /** Highlight a specific nav link as active */
  active?: string;
  /** Use dark (transparent→dark) style — for pages with dark hero */
  dark?: boolean;
}

export default function MarketingNav({ active, dark = false }: MarketingNavProps) {
  const [open, setOpen] = useState(false);

  const bg = dark
    ? "rgba(13,31,22,0.97)"
    : "rgba(255,255,255,0.97)";
  const border = dark
    ? "1px solid rgba(58,140,92,0.14)"
    : `1px solid ${C.rule}`;
  const logoColor = dark ? "#F4F0E8" : C.ink;
  const linkColor = dark ? "rgba(244,240,232,0.65)" : C.inkLight;
  const linkHover = dark ? "#FFFFFF" : C.ink;

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: bg,
        backdropFilter: "blur(16px) saturate(1.6)",
        borderBottom: border,
        transition: "background 280ms cubic-bezier(0.23,1,0.32,1)",
      }}>
        <div style={{
          maxWidth: 1200, margin: "0 auto",
          padding: "0 clamp(16px, 4vw, 40px)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: 64,
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <img src={MONOGRAM_URL} alt="AR" style={{ height: 30, width: 30, objectFit: "contain" }} />
            <span style={{ fontFamily: C.display, fontSize: "1.25rem", fontWeight: 700, color: logoColor, letterSpacing: "-0.025em" }}>
              Audit<span style={{ color: C.forest }}>Ready</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center" style={{ gap: 4 }}>
            {NAV_LINKS.map((l) => {
              const isActive = active === l.label;
              return (
                <Link
                  key={l.label}
                  href={l.href}
                  style={{
                    fontFamily: C.ui, fontSize: "0.875rem", fontWeight: isActive ? 600 : 500,
                    color: isActive ? C.forest : linkColor,
                    textDecoration: "none", padding: "8px 14px", borderRadius: 4,
                    transition: "color 140ms",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = linkHover; }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.color = linkColor; }}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center" style={{ gap: 10, flexShrink: 0 }}>
            <a
              href={getLoginUrl()}
              style={{
                fontFamily: C.ui, fontSize: "0.85rem", fontWeight: 500,
                color: dark ? "rgba(244,240,232,0.75)" : C.inkLight,
                textDecoration: "none", padding: "8px 16px", borderRadius: 4,
                border: dark ? "1px solid rgba(255,255,255,0.18)" : `1px solid ${C.rule}`,
                transition: "all 140ms",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = dark ? "#FFFFFF" : C.ink; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = dark ? "rgba(244,240,232,0.75)" : C.inkLight; }}
            >
              Sign In
            </a>
            <a
              href={getSignUpUrl()}
              style={{
                fontFamily: C.ui, fontSize: "0.85rem", fontWeight: 700,
                color: "#020F05", background: C.forest,
                textDecoration: "none", padding: "9px 20px", borderRadius: 4,
                boxShadow: "0 0 18px rgba(58,140,92,0.35)",
                transition: "background 140ms, box-shadow 140ms",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = C.forestDark; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 28px rgba(58,140,92,0.55)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = C.forest; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px rgba(58,140,92,0.35)"; }}
            >
              Start Free Trial
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex md:hidden"
            style={{ background: "none", border: "none", cursor: "pointer", color: dark ? "#F4F0E8" : C.ink, padding: 6 }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile backdrop */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(15,35,24,0.6)", backdropFilter: "blur(4px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 220ms cubic-bezier(0.23,1,0.32,1)",
        }}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
          width: "min(300px, 85vw)",
          background: "#162B1C",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          display: "flex", flexDirection: "column",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 250ms cubic-bezier(0.23,1,0.32,1)",
          willChange: "transform",
        }}
      >
        {/* Drawer header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          <span style={{ fontFamily: C.display, fontSize: "1.1rem", fontWeight: 700, color: "#F4F0E8", letterSpacing: "-0.02em" }}>
            Audit<span style={{ color: C.forest }}>Ready</span>
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(244,240,232,0.5)", padding: 4, display: "flex", alignItems: "center" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer links */}
        <nav style={{ flex: 1, padding: "8px 0", overflowY: "auto" }}>
          {[...NAV_LINKS, { label: "About", href: "/about" }, { label: "Behavioral Health", href: "/behavioral-health-credentials" }].map((l, i) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                display: "block", width: "100%",
                fontFamily: C.ui, fontSize: "1rem", fontWeight: active === l.label ? 600 : 500,
                color: active === l.label ? C.forest : "rgba(244,240,232,0.75)",
                padding: "14px 24px",
                textDecoration: "none",
                borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.05)" : "none",
                transition: "color 120ms, background 120ms",
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Drawer CTAs */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 10 }}>
          <a
            href={getLoginUrl()}
            onClick={() => setOpen(false)}
            style={{
              display: "block", textAlign: "center", textDecoration: "none",
              background: "transparent", color: "rgba(244,240,232,0.75)",
              borderRadius: 4, padding: "12px 18px",
              fontFamily: C.ui, fontSize: "0.88rem", fontWeight: 500,
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            Sign In
          </a>
          <a
            href={getSignUpUrl()}
            onClick={() => setOpen(false)}
            style={{
              display: "block", textAlign: "center", textDecoration: "none",
              background: C.forest, color: "#0F2318",
              borderRadius: 4, padding: "13px 18px",
              fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 700,
              boxShadow: "0 2px 12px rgba(58,140,92,0.3)",
            }}
          >
            Start Free 14-Day Trial
          </a>
        </div>
      </div>
    </>
  );
}
