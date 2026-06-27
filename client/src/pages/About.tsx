/**
 * AuditReady — About Page
 */

import { getLoginUrl } from "@/const";
import { ArrowRight } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { C } from "@/lib/design";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", _hp: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const submitMutation = trpc.contact.submit.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (e) => setError(e.message || "Something went wrong. Please try again."),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form._hp) return;
    if (!form.name || !form.email || !form.subject || !form.message) {
      setError("Please fill in all fields.");
      return;
    }
    const { _hp, ...payload } = form;
    submitMutation.mutate(payload);
  };

  const inputStyle: React.CSSProperties = {
    display: "block", width: "100%", fontFamily: C.body, fontSize: "0.9rem",
    color: C.ink, background: C.paper, border: `1px solid ${C.rule}`,
    borderRadius: 4, padding: "10px 14px", outline: "none", boxSizing: "border-box",
    transition: "border-color 150ms",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: C.ui, fontSize: "0.75rem", fontWeight: 600,
    color: C.inkLight, marginBottom: 6,
  };

  return (
    <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 40, marginBottom: 48 }}>
      <p style={{ fontFamily: C.ui, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 24 }}>Get in touch</p>
      {submitted ? (
        <div style={{ background: C.forestBg, border: `1px solid ${C.forest}33`, borderRadius: 6, padding: "20px 24px" }}>
          <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.forest, margin: 0, fontWeight: 600 }}>Message sent ✓</p>
          <p style={{ fontFamily: C.body, fontSize: "0.875rem", color: C.inkLight, margin: "8px 0 0" }}>We'll get back to you at {form.email} within one business day.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 540 }}>
          <input name="_hp" value={form._hp} onChange={handleChange} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@agency.com" style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Subject</label>
            <select name="subject" value={form.subject} onChange={handleChange} style={inputStyle}>
              <option value="">Select a subject…</option>
              <option value="General question">General question</option>
              <option value="Request a demo">Request a demo</option>
              <option value="Pricing question">Pricing question</option>
              <option value="Technical support">Technical support</option>
              <option value="Billing">Billing</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Message</label>
            <textarea name="message" value={form.message} onChange={handleChange} placeholder="How can we help?" rows={5} style={{ ...inputStyle, resize: "vertical", minHeight: 110 }} />
          </div>
          {error && <p style={{ fontFamily: C.body, fontSize: "0.85rem", color: C.stampRed, marginBottom: 14 }}>{error}</p>}
          <button type="submit" disabled={submitMutation.isPending}
            style={{
              background: C.forest, color: "#fff", border: "none", borderRadius: 4,
              padding: "11px 28px", fontFamily: C.ui, fontSize: "0.875rem", fontWeight: 700,
              cursor: submitMutation.isPending ? "not-allowed" : "pointer",
              opacity: submitMutation.isPending ? 0.6 : 1, transition: "opacity 150ms",
            }}>
            {submitMutation.isPending ? "Sending…" : "Send Message"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function About() {
  const handleSignUp = () => { window.location.href = getLoginUrl(); };

  return (
    <div style={{ fontFamily: C.body, background: C.paper, color: C.ink, minHeight: "100vh" }}>
      <MarketingNav active="About" />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, background: C.darkBg }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 clamp(20px, 5vw, 40px)" }}>
          <p style={{ fontFamily: C.ui, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.forest, marginBottom: 16 }}>
            About
          </p>
          <h1 style={{ fontFamily: C.display, fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 700, color: C.darkText, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 20 }}>
            About AuditReady
          </h1>
          <p style={{ fontFamily: C.body, fontSize: "1.05rem", color: C.darkTextMid, lineHeight: 1.7, maxWidth: 580 }}>
            A credential compliance platform built for behavioral health agencies — not a compliance guarantee, legal service, or substitute for a compliance officer.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section style={{ padding: "80px clamp(20px, 5vw, 40px)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>

          <p style={{ fontFamily: C.body, fontSize: "1.05rem", color: C.inkMid, lineHeight: 1.8, marginBottom: 28 }}>
            AuditReady was developed by Vibemo Group to address a common operational challenge in small care agencies: staff credential tracking, paper files, missed expiration dates, and scattered compliance records. AuditReady is an administrative tracking platform — not a compliance guarantee, legal service, or substitute for a compliance officer.
          </p>

          <p style={{ fontFamily: C.body, fontSize: "1.05rem", color: C.inkMid, lineHeight: 1.8, marginBottom: 28 }}>
            Many ABA, mental health, home care, and behavioral health agencies rely on spreadsheets, paper folders, HR systems, or training platforms that do not give owners and managers a simple readiness view. AuditReady was created to help agencies organize staff credentials, document locations, verification status, and renewal reminders in one place — without storing patient information.
          </p>

          <p style={{ fontFamily: C.body, fontSize: "1.05rem", color: C.inkMid, lineHeight: 1.8, marginBottom: 56 }}>
            Our focus is simple: help small care agencies stay organized, reduce manual tracking, and make staff credential readiness easier to manage.
          </p>

          {/* Why we built this — founder story */}
          <div style={{ background: C.paperDark, borderLeft: `3px solid ${C.forest}`, borderRadius: "0 6px 6px 0", padding: "28px 32px", marginBottom: 56 }}>
            <p style={{ fontFamily: C.ui, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.forest, marginBottom: 14 }}>Why we built this</p>
            <p style={{ fontFamily: C.body, fontSize: "1.05rem", color: C.inkMid, lineHeight: 1.8, margin: 0 }}>
              The idea for AuditReady came from watching small behavioral health agencies — ABA providers, mental health clinics, group homes — scramble every time a state board auditor called. Not because they were doing anything wrong, but because their staff credential records were split across email threads, paper folders, Google Sheets, and HR portals that were never designed for compliance readiness. One expired RBT certification, one missing background check, one lapsed CPR card — and a billing denial or corrective action plan follows. We built AuditReady to close that gap: a single place where an agency director can see, in 30 seconds, exactly who is compliant and who needs attention.
            </p>
          </div>

          {/* Three values */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 32, marginBottom: 72 }}>
            {[
              { label: "Domain-specific", desc: "Built for ABA agencies, mental health clinics, psychology practices, and home care agencies. Not a generic HR tool with a compliance module bolted on." },
              { label: "Privacy-first", desc: "We track staff credentials, not patient records. No PHI ever enters AuditReady. No BAA required." },
              { label: "Audit preparation", desc: "Every feature is designed to help agencies organize staff credential files, track expirations, and produce records quickly when needed." },
            ].map(v => (
              <div key={v.label} style={{ borderTop: `2px solid ${C.forest}`, paddingTop: 20 }}>
                <div style={{ fontFamily: C.ui, fontSize: "0.875rem", fontWeight: 700, color: C.ink, marginBottom: 10 }}>{v.label}</div>
                <p style={{ fontFamily: C.body, fontSize: "0.9rem", color: C.inkLight, lineHeight: 1.7, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>

          {/* Contact form */}
          <ContactForm />

          {/* CTA */}
          <button
            onClick={handleSignUp}
            style={{
              background: C.forest, color: "#fff", border: "none", borderRadius: 4,
              padding: "12px 28px", fontFamily: C.ui, fontSize: "0.9rem", fontWeight: 700,
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              boxShadow: "0 0 18px rgba(58,140,92,0.3)", transition: "background 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.forestDark)}
            onMouseLeave={e => (e.currentTarget.style.background = C.forest)}
          >
            Subscribe Now <ArrowRight size={14} />
          </button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
