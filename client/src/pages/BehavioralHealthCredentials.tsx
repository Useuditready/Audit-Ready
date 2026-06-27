/**
 * AuditReady — Behavioral Health Credential Tracking Page
 * SEO landing page for behavioral health agencies searching for credential tracking software.
 */

import { Link } from "wouter";
import { CheckCircle, ArrowRight, Menu, X, Shield, Bell, FileDown, Clock } from "lucide-react";
import { useState } from "react";
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
          <Link href="/how-it-works" style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkMid, textDecoration: "none" }}>How It Works</Link>
          <Link href="/pricing" style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkMid, textDecoration: "none" }}>Pricing</Link>
          <Link href="/faq" style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkMid, textDecoration: "none" }}>FAQ</Link>
          <a href={getSignUpUrl()} style={{ background: C.forest, color: "#fff", fontFamily: C.body, fontSize: "0.85rem", fontWeight: 700, padding: "9px 22px", borderRadius: 7, textDecoration: "none" }}>Subscribe Now</a>
        </div>
        <button onClick={() => setOpen(!open)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", padding: 6 }} className="flex md:hidden">
          {open ? <X size={22} color={C.ink} /> : <Menu size={22} color={C.ink} />}
        </button>
      </div>
    </nav>
  );
}

const credentialTypes = [
  { category: "ABA & Autism Agencies", items: ["BCBA / BCaBA License", "RBT Certification", "CPR / First Aid", "Background Checks", "Supervision Agreements", "CE Credits (32 hrs/cycle)", "OIG LEIE Exclusion Check"] },
  { category: "Mental Health Clinics", items: ["LCMHC / LCSW / LMFT", "Psychologist License", "Bloodborne Pathogens Training", "NC HCPR Registry Check", "CEU Tracking (40 hrs)", "Cultural Humility Training", "Professional Liability COI"] },
  { category: "Group Homes & Residential", items: ["Direct Support Professional Cert", "Medication Administration", "CPR / First Aid", "Background Check (FBI + State)", "Abuse & Neglect Training", "First Aid Recertification", "Annual Competency Evaluations"] },
  { category: "Psychology Practices", items: ["State Psychology License", "NPI Registration", "CE Credits", "Supervision Status", "Background Checks", "Malpractice Insurance COI", "QP / AP Designation"] },
];

const features = [
  { icon: Bell, title: "90-Day Advance Alerts", desc: "Automatic email reminders at 90, 60, and 30 days before any credential expires. Never be caught off guard again." },
  { icon: Shield, title: "Live Registry Verification", desc: "Verify BCBA, RBT, LCMHC, LCSW, and 14 other license types directly against NC state boards, BACB, OIG LEIE, and NPI." },
  { icon: FileDown, title: "One-Click Audit Export", desc: "Generate a clean, organized credential report for your entire staff in seconds — ready for any state board or payer audit." },
  { icon: Clock, title: "AI Document Extraction", desc: "Photograph a license. Our AI reads the expiration date and credential type automatically. Zero manual data entry." },
];

export default function BehavioralHealthCredentials() {
  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: C.body }}>
      <MarketingNav active="Behavioral Health" />

      {/* Hero */}
      <section style={{ paddingTop: 110, paddingBottom: 80, background: "#0F2318" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, background: "rgba(58,140,92,0.08)", border: "1px solid rgba(58,140,92,0.25)", borderRadius: 20, padding: "5px 14px 5px 10px" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.forest, boxShadow: "0 0 8px rgba(58,140,92,0.8)" }} />
            <span style={{ fontFamily: C.body, fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#4FAD74" }}>Behavioral Health Credential Tracking</span>
          </div>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(2rem, 5vw, 3.6rem)", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: 20, maxWidth: "18em" }}>
            The Credential Tracking Software Built for Behavioral Health Agencies
          </h1>
          <p style={{ fontFamily: C.body, fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)", color: "rgba(255,255,255,0.75)", lineHeight: 1.7, marginBottom: 36, maxWidth: "42em" }}>
            AuditReady tracks BCBA licenses, RBT certifications, LCMHC credentials, background checks, CPR cards, and every other credential your behavioral health staff needs — with automatic expiration alerts and one-click audit exports.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <a href={getSignUpUrl()} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.forest, color: "#020F05", borderRadius: 8, padding: "14px 28px", fontFamily: C.body, fontSize: "0.92rem", fontWeight: 700, textDecoration: "none", boxShadow: "0 0 28px rgba(58,140,92,0.4)" }}>
              Start Free 14-Day Trial <ArrowRight size={15} />
            </a>
            <Link href="/how-it-works" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "transparent", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, padding: "14px 28px", fontFamily: C.body, fontSize: "0.92rem", fontWeight: 600, textDecoration: "none" }}>
              See How It Works
            </Link>
          </div>
          <p style={{ marginTop: 16, fontFamily: C.body, fontSize: "0.78rem", color: "rgba(255,255,255,0.3)" }}>No credit card required · Built for organization support — not legal advice</p>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: "80px 24px", background: C.paperBg, borderBottom: `1px solid ${C.rule}` }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 700, color: C.ink, marginBottom: 48, textAlign: "center" }}>
            Everything Your Agency Needs to Stay Compliant
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} style={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 10, padding: "24px" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: C.forestBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                    <Icon size={22} color={C.forest} />
                  </div>
                  <h3 style={{ fontFamily: C.display, fontSize: "1.15rem", fontWeight: 700, color: C.ink, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ fontFamily: C.body, fontSize: "0.88rem", color: C.inkMid, lineHeight: 1.65 }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Credential types by agency */}
      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 700, color: C.ink, textAlign: "center", marginBottom: 12 }}>
            Credential Types by Agency
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: C.inkLight, textAlign: "center", marginBottom: 48 }}>
            AuditReady tracks all standard credential types — plus any custom credential your agency requires.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {credentialTypes.map((ct, i) => (
              <div key={i} style={{ background: C.paperBg, border: `1px solid ${C.rule}`, borderRadius: 10, padding: "24px" }}>
                <h3 style={{ fontFamily: C.display, fontSize: "1.1rem", fontWeight: 700, color: C.ink, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${C.rule}` }}>{ct.category}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {ct.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={14} color={C.forest} style={{ flexShrink: 0 }} />
                      <span style={{ fontFamily: C.body, fontSize: "0.85rem", color: C.inkMid }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "#0F2318", padding: "72px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <h2 style={{ fontFamily: C.display, fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 700, color: "#FFFFFF", marginBottom: 16 }}>
            Ready to Replace Your Spreadsheet?
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "0.95rem", color: "rgba(255,255,255,0.6)", marginBottom: 32 }}>
            Most agencies are fully set up within one business day. Start your free 14-day trial — no credit card required.
          </p>
          <a href={getSignUpUrl()} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.forest, color: "#020F05", borderRadius: 8, padding: "15px 32px", fontFamily: C.body, fontSize: "0.95rem", fontWeight: 700, textDecoration: "none" }}>
            Subscribe Now <ArrowRight size={16} />
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
