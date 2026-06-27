/**
 * AuditReady — FAQ Page
 */

import { ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { getSignUpUrl } from "@/const";
import { C } from "@/lib/design";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";

const faqs = [
  {
    category: "Getting Started",
    items: [
      { q: "How long does it take to set up AuditReady?", a: "Most agencies are fully set up within one business day. You add your staff members, upload their credentials, and you're done. If you have a large team, you can import staff and credentials in bulk using our CSV import tool." },
      { q: "Do I need any technical knowledge to use AuditReady?", a: "No. AuditReady is designed for clinical directors, practice managers, and HR staff — not IT teams. If you can use email, you can use AuditReady." },
      { q: "Can I import my existing credential data from a spreadsheet?", a: "Yes. AuditReady supports CSV import for both staff and credentials. Download our template, fill it in, and upload it. Your data will be imported and organized automatically." },
      { q: "Is there a free trial?", a: "Yes — every new account starts with a free 14-day pilot. No credit card required. You'll have full access to all features during the trial period." },
    ],
  },
  {
    category: "Credential Tracking",
    items: [
      { q: "What credential types does AuditReady track?", a: "AuditReady tracks any credential type your agency needs — BCBA, RBT, LCMHC, LCSW, LMFT, psychology licenses, NPI registrations, CPR/First Aid, background checks, malpractice insurance, and any custom credential type you define." },
      { q: "How does the expiration alert system work?", a: "AuditReady sends automatic email reminders at 90, 60, and 30 days before any credential expires. Alerts go to the agency administrator. You can also configure alerts to go directly to the staff member." },
      { q: "Can AuditReady read expiration dates from uploaded documents?", a: "Yes. Our AI document extraction reads expiration dates and credential types from uploaded files automatically. You photograph or upload the document, and AuditReady fills in the details. You can always review and edit the extracted data before saving." },
      { q: "Can I track custom credential types not on your standard list?", a: "Yes. You can create any custom credential type your agency requires — accreditation-specific requirements, payer-specific training, internal competency evaluations, or anything else." },
    ],
  },
  {
    category: "Verification",
    items: [
      { q: "What registries can AuditReady verify against?", a: "AuditReady supports live verification against the BACB registry (BCBA/RBT), OIG LEIE exclusion list, NPI registry, and SAM.gov. Additional state board integrations are in development." },
      { q: "Are verification results stored?", a: "Yes. Every verification check is timestamped and stored in the staff member's profile, giving you documented proof of due diligence for any audit or payer review." },
      { q: "Does AuditReady replace my obligation to verify credentials directly with licensing boards?", a: "No. AuditReady is a credential organization and tracking tool — not a legal compliance service. Always verify requirements directly with your licensing board, payer, or accrediting body. AuditReady is built for organization support, not legal advice." },
    ],
  },
  {
    category: "Audits & Reporting",
    items: [
      { q: "What does the audit export include?", a: "The audit export includes each staff member's name, role, credential name, issue date, expiration date, verification status, and links to uploaded documents. It's formatted as a clean PDF or CSV — ready to hand to any state board or payer auditor." },
      { q: "Can I generate a report for a specific staff member?", a: "Yes. You can export a full credential report for your entire staff, or drill down to a single staff member's credential history." },
      { q: "Does AuditReady support CARF or Joint Commission accreditation requirements?", a: "AuditReady helps you organize and document the staff credential records that CARF and Joint Commission surveyors will ask to see. It does not replace the accreditation process itself, but it makes the documentation side significantly easier." },
    ],
  },
  {
    category: "Billing & Pricing",
    items: [
      { q: "How is AuditReady priced?", a: "AuditReady is priced by the number of staff members in your agency. Plans start at $129/month for up to 10 staff. See our Pricing page for full details." },
      { q: "Can I cancel at any time?", a: "Yes. You can cancel your subscription at any time from the Billing page inside your account. Your access continues until the end of the current billing period. Your data is preserved for 90 days after cancellation." },
      { q: "Do you offer annual billing?", a: "Yes. Annual billing is available at a discounted rate (approximately 10% off monthly pricing). You can switch between monthly and annual billing from the Billing page." },
    ],
  },
  {
    category: "Security & Privacy",
    items: [
      { q: "Is AuditReady HIPAA compliant?", a: "AuditReady does not collect or store patient health information (PHI). It is a staff credential management tool — it stores staff documents and agency records only. No patient data is ever entered into AuditReady." },
      { q: "Where is my data stored?", a: "All data is stored on secure cloud infrastructure with encryption at rest and in transit. See our Security page for full details." },
      { q: "Who can see my agency's data?", a: "Only users you authorize can access your agency's data. AuditReady staff do not access your data except to provide technical support when explicitly requested." },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: `1px solid ${C.rule}` }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          gap: 20, padding: "22px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontFamily: C.body, fontSize: "1rem", fontWeight: 600, color: C.ink, lineHeight: 1.5 }}>{q}</span>
        <span style={{ flexShrink: 0, marginTop: 2 }}>
          {open
            ? <ChevronUp size={18} color={C.forest} />
            : <ChevronDown size={18} color={C.inkLight} />}
        </span>
      </button>
      {open && (
        <div style={{ paddingBottom: 22 }}>
          <p style={{ fontFamily: C.body, fontSize: "0.925rem", color: C.inkLight, lineHeight: 1.75, margin: 0 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <div style={{ background: C.paper, minHeight: "100vh", fontFamily: C.body }}>
      <MarketingNav active="FAQ" />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 80, background: C.darkBg, textAlign: "center" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 clamp(20px, 5vw, 40px)" }}>
          <p style={{
            fontFamily: C.ui, fontSize: "0.7rem", fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
            color: C.forest, marginBottom: 16,
          }}>
            Support
          </p>
          <h1 style={{
            fontFamily: C.display, fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 700, color: C.darkText, lineHeight: 1.1,
            letterSpacing: "-0.03em", marginBottom: 20,
          }}>
            Frequently Asked Questions
          </h1>
          <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.darkTextMid, lineHeight: 1.7 }}>
            Everything you need to know about AuditReady. Can't find your answer?{" "}
            <a href="mailto:support@useauditready.com" style={{ color: C.forest, textDecoration: "none" }}>
              Email us
            </a>.
          </p>
        </div>
      </section>

      {/* FAQ sections */}
      <section style={{ padding: "80px clamp(20px, 5vw, 40px)" }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          {faqs.map((section, i) => (
            <div key={i} style={{ marginBottom: 64 }}>
              <h2 style={{
                fontFamily: C.display, fontSize: "1.5rem", fontWeight: 700,
                color: C.ink, marginBottom: 0, paddingBottom: 16,
                borderBottom: `2px solid ${C.forest}33`,
              }}>
                {section.category}
              </h2>
              {section.items.map((item, j) => (
                <FAQItem key={j} q={item.q} a={item.a} />
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: C.paperDeeper, borderTop: `1px solid ${C.rule}`,
        padding: "80px clamp(20px, 5vw, 40px)", textAlign: "center",
      }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2 style={{ fontFamily: C.display, fontSize: "2rem", fontWeight: 700, color: C.ink, marginBottom: 16 }}>
            Still have questions?
          </h2>
          <p style={{ fontFamily: C.body, fontSize: "1rem", color: C.inkLight, marginBottom: 32, lineHeight: 1.65 }}>
            Start your free 14-day trial and see AuditReady in action — no credit card required.
          </p>
          <a
            href={getSignUpUrl()}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: C.forest, color: "#fff", borderRadius: 6,
              padding: "14px 28px", fontFamily: C.ui, fontSize: "0.95rem",
              fontWeight: 700, textDecoration: "none",
              boxShadow: "0 0 20px rgba(58,140,92,0.3)",
            }}
          >
            Subscribe Now <ArrowRight size={15} />
          </a>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
