/**
 * AuditReady — How It Works Page
 * Step-by-step walkthrough of the product for behavioral health agencies.
 */

import { Link } from "wouter";
import { CheckCircle, Upload, Bell, Shield, FileDown, LayoutDashboard, ArrowRight, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { getSignUpUrl } from "@/const";
import { C, MONOGRAM_URL } from "@/lib/design";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";



function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.rule}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <img src={MONOGRAM_URL} alt="AR" style={{ height: 28, width: 28, objectFit: "contain" }} />
          <span style={{ fontFamily: C.display, fontSize: "1.1rem", fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>
            Audit<span style={{ color: C.forest }}>Ready</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }} className="hidden md:flex">
          <Link href="/how-it-works" style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.forest, fontWeight: 600, textDecoration: "none" }}>How It Works</Link>
          <Link href="/pricing" style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkMid, textDecoration: "none" }}>Pricing</Link>
          <Link href="/faq" style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkMid, textDecoration: "none" }}>FAQ</Link>
          <Link href="/security" style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkMid, textDecoration: "none" }}>Security</Link>
          <a href={getSignUpUrl()} style={{ background: C.forest, color: "#fff", fontFamily: C.body, fontSize: "0.85rem", fontWeight: 700, padding: "9px 22px", borderRadius: 7, textDecoration: "none" }}>Subscribe Now</a>
        </div>
        <button onClick={() => setOpen(!open)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 6 }} className="flex md:hidden">
          {open ? <X size={22} color={C.ink} /> : <Menu size={22} color={C.ink} />}
        </button>
      </div>
    </nav>
  );
}

const steps = [
  {
    num: "01",
    icon: LayoutDashboard,
    title: "Add Your Staff",
    desc: "Create a profile for each staff member — name, role, email, hire date. Import from a CSV or add one at a time. Takes less than 5 minutes to get your whole team in.",
    detail: "AuditReady supports unlimited staff members across all plan tiers. Each profile stores contact info, role classification, and a complete credential history.",
    color: C.forest,
    bg: C.forestBg,
  },
  {
    num: "02",
    icon: Upload,
    title: "Upload Their Credentials",
    desc: "Attach licenses, certifications, background checks, CPR cards, and training records to each staff profile. Our AI reads expiration dates automatically from uploaded documents.",
    detail: "Supported credential types include BCBA, RBT, LCMHC, LCSW, LMFT, psychology licenses, NPI registrations, CPR/First Aid, background checks, and any custom credential type your agency requires.",
    color: C.forest,
    bg: C.forestBg,
  },
  {
    num: "03",
    icon: Bell,
    title: "Get Alerts Before Anything Expires",
    desc: "AuditReady sends automatic email reminders at 90, 60, and 30 days before any credential expires — to you and optionally to the staff member directly.",
    detail: "No more spreadsheet monitoring. No more last-minute scrambles. You'll know about an expiring RBT certification three months before it becomes a billing problem.",
    color: C.amber,
    bg: C.amberBg,
  },
  {
    num: "04",
    icon: Shield,
    title: "Verify Credentials Against National Registries",
    desc: "Run live checks against the BACB registry, OIG LEIE exclusion list, NPI registry, and SAM.gov — directly from each staff member's profile.",
    detail: "Verification results are timestamped and stored in the staff record, giving you documented proof of due diligence for any audit or payer review.",
    color: C.forest,
    bg: C.forestBg,
  },
  {
    num: "05",
    icon: FileDown,
    title: "Export an Audit-Ready Report in One Click",
    desc: "When an auditor calls or a payer requests documentation, generate a clean, organized credential report for your entire staff in seconds.",
    detail: "Reports include credential name, issue date, expiration date, verification status, and document links — everything a state board or payer needs to see.",
    color: C.forest,
    bg: C.forestBg,
  },
];

const painPoints = [
  { icon: "📋", pain: "Tracking credentials in a spreadsheet", fix: "One dashboard with live expiration status for every staff member" },
  { icon: "😰", pain: "Audit panic when a surveyor calls", fix: "One-click export of every credential, organized and ready" },
  { icon: "⚠️", pain: "Finding out a license lapsed after the fact", fix: "90-day advance alerts so you're never caught off guard" },
  { icon: "🔍", pain: "Manually checking BACB or OIG exclusion lists", fix: "Built-in registry verification with timestamped proof" },
  { icon: "📁", pain: "Credential documents scattered across email and folders", fix: "All documents attached to the staff profile, searchable and organized" },
];

export default function HowItWorks() {
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: C.body }}>
      {/* Sticky bottom CTA bar */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "#0F1F12",
        borderTop: "1px solid rgba(58,140,92,0.3)",
        padding: "clamp(12px, 3vw, 16px) clamp(16px, 4vw, 28px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        transform: showSticky ? "translateY(0)" : "translateY(100%)",
        transition: "transform 280ms cubic-bezier(0.23,1,0.32,1)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
      }}>
        <div>
          <p style={{ fontFamily: "var(--font-display, 'DM Serif Display', serif)", fontSize: "0.95rem", fontWeight: 700, color: "#F4F0E8", margin: 0 }}>Ready to stop chasing credentials?</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.78rem", color: "rgba(244,240,232,0.5)", margin: 0 }}>No credit card required · 14-day free trial</p>
        </div>
        <a href={getSignUpUrl()} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#3A8C5C", color: "#020F05",
          borderRadius: 7, padding: "11px 24px",
          fontFamily: "'DM Sans', sans-serif", fontSize: "0.9rem", fontWeight: 700,
          textDecoration: "none", flexShrink: 0,
          boxShadow: "0 0 20px rgba(58,140,92,0.4)",
        }}>
          Get Started Free <ArrowRight size={15} />
        </a>
      </div>
      <MarketingNav active="How It Works" />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, background: "#0F2318", textAlign: "center" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, background: "rgba(58,140,92,0.08)", border: "1px solid rgba(58,140,92,0.25)", borderRadius: 20, padding: "5px 14px 5px 10px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.forest, boxShadow: "0 0 8px rgba(58,140,92,0.8)" }} />
            <span style={{ fontFamily: C.body, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4FAD74" }}>How AuditReady Works</span>
          </div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(2.2rem, 5vw, 3.8rem)", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 20 }}>
            From Spreadsheet Chaos to Audit Confidence in Five Steps
          </h1>
          <p style={{ fontFamily: C.body, fontSize: "clamp(1rem, 2vw, 1.1rem)", color: "rgba(255,255,255,0.72)", lineHeight: 1.7, marginBottom: 36 }}>
            AuditReady is purpose-built for behavioral health agencies — ABA providers, group homes, therapy practices, mental health clinics — who need to keep staff credentials organized without the spreadsheet chaos.
          </p>
          <a href={getSignUpUrl()} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.forest, color: "#020F05", borderRadius: 8, padding: "15px 32px", fontFamily: C.body, fontSize: "0.95rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 0 32px rgba(58,140,92,0.45)" }}>
            Start Your Free 14-Day Trial <ArrowRight size={16} />
          </a>
          <p style={{ marginTop: 14, fontFamily: C.body, fontSize: "0.8rem", color: "rgba(255,255,255,0.35)" }}>No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* Pain → Fix comparison */}
      <section style={{ background: C.paperBg, padding: "80px 24px", borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: C.ink, textAlign: "center", marginBottom: 12 }}>
            Sound Familiar?
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: C.inkLight, textAlign: "center", marginBottom: 48 }}>
            These are the exact problems behavioral health agencies tell us they face every week.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {painPoints.map((p, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", alignItems: "center", gap: 16, background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 10, padding: "18px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "1.4rem" }}>{p.icon}</span>
                  <span style={{ fontFamily: C.body, fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.5 }}>{p.pain}</span>
                </div>
                <div style={{ textAlign: "center", fontFamily: C.mono, fontSize: "0.75rem", color: C.forest, fontWeight: 700 }}>→</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <CheckCircle size={16} color={C.forest} style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: C.body, fontSize: "0.9rem", color: C.ink, lineHeight: 1.5, fontWeight: 500 }}>{p.fix}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: "80px 24px 56px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: C.ink, textAlign: "center", marginBottom: 12 }}>
            Five Steps to Audit Readiness
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: C.inkLight, textAlign: "center", marginBottom: 64 }}>
            Most agencies are fully set up within one business day.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 48 }}>
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 32, alignItems: "start" }}>
                  {/* Step number + icon */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 56, height: 56, borderRadius: "50%", background: step.bg, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${step.color}22` }}>
                      <Icon size={24} color={step.color} />
                    </div>
                    <span style={{ fontFamily: C.mono, fontSize: "0.7rem", fontWeight: 700, color: step.color, letterSpacing: "0.08em" }}>{step.num}</span>
                    {i < steps.length - 1 && (
                      <div style={{ width: 2, height: 40, background: `linear-gradient(${step.color}44, transparent)`, borderRadius: 2 }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ paddingTop: 8 }}>
                    <h3 style={{ fontFamily: C.display, fontSize: "1.5rem", fontWeight: 700, color: C.ink, marginBottom: 10 }}>{step.title}</h3>
                    <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkMid, lineHeight: 1.7, marginBottom: 12 }}>{step.desc}</p>
                    <p style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkLight, lineHeight: 1.65, background: C.paperBg, borderLeft: `3px solid ${step.color}55`, padding: "10px 16px", borderRadius: "0 6px 6px 0" }}>{step.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* Who it's for */}
      <section style={{ background: "#0F2318", padding: "80px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: "#FFFFFF", marginBottom: 16 }}>
            Built for Behavioral Health
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", marginBottom: 48, maxWidth: 560, margin: "0 auto 48px" }}>
            AuditReady is not a generic HR tool. It was designed specifically for the credential types, verification sources, and audit requirements that behavioral health agencies face.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, marginBottom: 48 }}>
            {["ABA Agencies", "Group Homes", "Therapy Practices", "Mental Health Clinics", "Psychology Practices", "Home Care Agencies"].map((type) => (
              <div key={type} style={{ background: "rgba(58,140,92,0.08)", border: "1px solid rgba(58,140,92,0.2)", borderRadius: 8, padding: "14px 24px", textAlign: "center", minWidth: 180 }}>
                <span style={{ fontFamily: C.body, fontSize: "0.9rem", fontWeight: 600, color: "#FFFFFF" }}>{type}</span>
              </div>
            ))}
          </div>
          <a href={getSignUpUrl()} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.forest, color: "#020F05", borderRadius: 8, padding: "15px 32px", fontFamily: C.body, fontSize: "0.95rem", fontWeight: 700, textDecoration: "none" }}>
            Start Free 14-Day Trial <ArrowRight size={16} />
          </a>
          <p style={{ marginTop: 14, fontFamily: C.body, fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>
            Built for organization support — not legal advice
          </p>
        </div>
      </section>

      {/* Footer — extra bottom padding clears the sticky CTA bar (~72px) */}
      <footer style={{ background: C.paperBg, borderTop: `1px solid ${C.rule}`, padding: "32px 24px 96px", textAlign: "center" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 24px" }}>
          <Link href="/" style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkLight, textDecoration: "none" }}>Home</Link>
          <Link href="/how-it-works" style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkLight, textDecoration: "none" }}>How It Works</Link>
          <Link href="/pricing" style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkLight, textDecoration: "none" }}>Pricing</Link>
          <Link href="/faq" style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkLight, textDecoration: "none" }}>FAQ</Link>
          <Link href="/behavioral-health-credentials" style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkLight, textDecoration: "none" }}>Behavioral Health</Link>
          <Link href="/security" style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkLight, textDecoration: "none" }}>Security</Link>
          <span style={{ fontFamily: C.body, fontSize: "0.82rem", color: C.inkLight }}>© {new Date().getFullYear()} AuditReady</span>
        </div>
      </footer>
    </div>
  );
}
