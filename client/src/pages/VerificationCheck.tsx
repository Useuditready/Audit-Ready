import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Shield, CheckCircle, AlertTriangle, XCircle, HelpCircle,
  ChevronLeft, ExternalLink, Clock, User, FileText, RefreshCw, Info,
} from "lucide-react";

// ── Design tokens (matches AuditReady palette) ────────────────────────────────
const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  sage:      "#3D6B52",
  amber:     "#9A7020",
  amberBg:   "#FEF3CD",
  parchment: "#F7F3ED",
  cream:     "#FDFAF6",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  red:       "#B84040",
  redBg:     "#FEF2F2",
  green:     "#1D6B3A",
  greenBg:   "#F0FDF4",
  grey:      "#6B7280",
  greyBg:    "#F9FAFB",
  serif:     "'DM Serif Display', Georgia, serif",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
};

type VerificationStatus =
  | "not_checked"
  | "verified"
  | "needs_review"
  | "not_found"
  | "manual_review_required";

type Source = "bacb" | "oig_leie" | "npi" | "sam_gov";

const SOURCE_LABELS: Record<Source, { label: string; description: string; whyItMatters: string; url: string; badge?: string }> = {
  bacb: {
    label: "BACB Registry",
    description: "Behavior Analyst Certification Board — verifies BCBA, BCaBA, and RBT certification status",
    whyItMatters: "Required for ABA agencies. Confirms your behavior analysts and registered behavior technicians hold active, valid BACB credentials. BACB does not offer a public API, so this check opens the registry for manual confirmation.",
    url: "https://www.bacb.com/services/o.php?page=101135",
  },
  oig_leie: {
    label: "OIG LEIE — Federal Healthcare Exclusion Check",
    description: "OIG LEIE (Office of Inspector General — List of Excluded Individuals/Entities) — checks whether this person has been banned from participating in Medicare, Medicaid, or any federal healthcare program",
    whyItMatters: "Required for all Medicaid and Medicare billing. If you employ someone on this list — even unknowingly — you may face billing denials, repayment demands, or program termination. Common reasons for exclusion include fraud, abuse, and license revocations.",
    url: "https://exclusions.oig.hhs.gov",
  },
  npi: {
    label: "NPI Registry",
    description: "CMS National Plan & Provider Enumeration System — confirms active NPI number for licensed providers",
    whyItMatters: "Required for billing any insurance payer. Confirms the provider's NPI number is active and matches their name on file with CMS. Essential for BCBS, Aetna, Medicaid, and all other payer credentialing.",
    url: "https://npiregistry.cms.hhs.gov",
  },
  sam_gov: {
    label: "SAM.gov",
    description: "System for Award Management — federal debarment, suspension, and exclusion database",
    whyItMatters: "Required for agencies receiving federal funding or billing Medicaid/Medicare. SAM.gov lists individuals and organizations banned from federal contracts, grants, and programs — including healthcare. Covers a broader range than OIG LEIE (not just healthcare). Employing a SAM.gov-excluded person can result in federal penalties.",
    url: "https://sam.gov/content/exclusions",
    badge: "API Key Required",
  },
};

const STATUS_CONFIG: Record<
  VerificationStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle }
> = {
  not_checked:             { label: "Not Checked",             color: C.grey,   bg: C.greyBg,  icon: HelpCircle },
  verified:                { label: "Verified",                color: C.green,  bg: C.greenBg, icon: CheckCircle },
  needs_review:            { label: "Needs Review",            color: C.amber,  bg: C.amberBg, icon: AlertTriangle },
  not_found:               { label: "Not Found — No Exclusion Record (Clear)", color: C.green,  bg: C.greenBg, icon: CheckCircle },
  manual_review_required:  { label: "Manual Review Required",  color: C.grey,   bg: C.greyBg,  icon: HelpCircle },
};

function StatusBadge({ status }: { status: VerificationStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, color: cfg.color,
      fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600,
      padding: "3px 10px", borderRadius: 4,
      border: `1px solid ${cfg.color}30`,
    }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

export default function VerificationCheck() {
  const params = useParams<{ id: string }>();
  const staffId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();

  const { data: staffMember, isLoading: staffLoading } = trpc.staff.getById.useQuery(
    { id: staffId },
    { enabled: !!staffId }
  );

  const { data: checks = [], refetch: refetchChecks } =
    trpc.verification.listForStaff.useQuery(
      { staffId },
      { enabled: !!staffId }
    );

  // Pre-populate state from the agency's configured state
  const { user: authUser } = useAuth();
  const agencyState = (authUser as any)?.agencyState ?? "";

  // Form state
  const [selectedSources, setSelectedSources] = useState<Set<Source>>(
    () => new Set<Source>(["bacb", "oig_leie", "npi", "sam_gov"])
  );
  const [licenseNumber, setLicenseNumber] = useState("");
  const [npiNumber, setNpiNumber] = useState("");
  const [state, setState] = useState(() => agencyState ? agencyState.slice(0, 2).toUpperCase() : "");
  const [running, setRunning] = useState(false);

  // Review state
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [reviewNote, setReviewNote] = useState("");

  const runCheckMutation = trpc.verification.runCheck.useMutation({
    onSuccess: () => {
      toast.success("Verification checks completed. Review results below.");
      refetchChecks();
      setRunning(false);
    },
    onError: (err) => {
      toast.error(`Check failed: ${err.message}`);
      setRunning(false);
    },
  });

  const approveMutation = trpc.verification.approve.useMutation({
    onSuccess: () => {
      toast.success("Check approved and marked as Verified.");
      refetchChecks();
      setReviewingId(null);
      setReviewNote("");
    },
    onError: (err) => toast.error(`Approval failed: ${err.message}`),
  });

  const flagMutation = trpc.verification.flag.useMutation({
    onSuccess: () => {
      toast.success("Check flagged for further review.");
      refetchChecks();
      setReviewingId(null);
      setReviewNote("");
    },
    onError: (err) => toast.error(`Flag failed: ${err.message}`),
  });

  const handleRunCheck = () => {
    if (!staffMember) return;
    if (selectedSources.size === 0) {
      toast.error("Select at least one verification source.");
      return;
    }
    setRunning(true);
    runCheckMutation.mutate({
      staffId,
      sources: Array.from(selectedSources),
      firstName: staffMember.firstName,
      lastName: staffMember.lastName,
      licenseNumber: licenseNumber.trim() || undefined,
      npiNumber: npiNumber.trim() || undefined,
      state: state.trim() || undefined,
    });
  };

  const toggleSource = (s: Source) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  if (staffLoading) {
    return (
      <div style={{ fontFamily: C.sans, color: C.inkLight, padding: 48, textAlign: "center" }}>
        Loading…
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div style={{ fontFamily: C.sans, color: C.red, padding: 48, textAlign: "center" }}>
        Staff member not found.
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Back nav */}
      <div style={{ padding: "16px 24px 0", maxWidth: 1200, margin: "0 auto" }}>
        <button
          onClick={() => navigate(`/staff/${staffId}`)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#5A5048", display: "flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: "0.82rem" }}
        >
          <ChevronLeft size={16} />
          Back to {staffMember.firstName} {staffMember.lastName}
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Shield size={22} color={C.forest} />
            <h1 style={{ fontFamily: C.serif, fontSize: "1.8rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>
              National Verification
            </h1>
          </div>
          <p style={{ color: C.inkLight, fontSize: "0.9rem", margin: 0 }}>
            <User size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {staffMember.firstName} {staffMember.lastName}
            {staffMember.role ? ` · ${staffMember.role}` : ""}
          </p>
        </div>

        {/* Compliance Disclaimer */}
        <div style={{
          background: C.amberBg, border: `1px solid ${C.amber}40`,
          borderRadius: 6, padding: "14px 18px", marginBottom: 32,
          display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <AlertTriangle size={16} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: C.inkDark }}>Administrative support only.</strong>{" "}
            Verification results are for administrative support only. AuditReady does not guarantee compliance,
            licensure, payer eligibility, Medicaid eligibility, or employment eligibility. Agencies remain
            responsible for confirming requirements with the appropriate board, payer, employer policy, or authority.
          </p>
        </div>

        {/* What These Checks Do — Info Panel */}
        <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 8, padding: 24, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Info size={16} color={C.forest} />
            <h2 style={{ fontFamily: C.serif, fontSize: "1.1rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>
              What These Checks Do
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {(Object.entries(SOURCE_LABELS) as [Source, typeof SOURCE_LABELS[Source]][]).map(([key, info]) => (
              <div key={key} style={{ background: C.parchment, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 700, color: C.inkDark }}>{info.label}</span>
                  {info.badge && (
                    <span style={{ fontFamily: C.sans, fontSize: "0.65rem", fontWeight: 600, color: C.amber, background: C.amberBg, border: `1px solid ${C.amber}40`, borderRadius: 3, padding: "1px 6px" }}>
                      {info.badge}
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkLight, margin: "0 0 8px", lineHeight: 1.55 }}>
                  {info.description}
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.74rem", color: C.inkMid, margin: 0, lineHeight: 1.6, borderTop: `1px solid ${C.rule}`, paddingTop: 8 }}>
                  <strong style={{ color: C.forest }}>Why it matters: </strong>{info.whyItMatters}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Run Check Form */}
        <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 8, padding: 28, marginBottom: 32 }}>
          <h2 style={{ fontFamily: C.serif, fontSize: "1.2rem", fontWeight: 700, color: C.inkDark, marginBottom: 18, marginTop: 0 }}>
            Run Verification Check
          </h2>

          {/* Source selection */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, color: C.inkFaint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
              Select Sources
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(Object.entries(SOURCE_LABELS) as [Source, typeof SOURCE_LABELS[Source]][]).map(([key, info]) => (
                <label
                  key={key}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer",
                    background: selectedSources.has(key) ? C.greenBg : C.linen,
                    border: `1px solid ${selectedSources.has(key) ? C.green + "40" : C.rule}`,
                    borderRadius: 6, padding: "12px 16px",
                    transition: "all 160ms ease-out",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSources.has(key)}
                    onChange={() => toggleSource(key)}
                    style={{ marginTop: 2, accentColor: C.forest }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: C.sans, fontSize: "0.88rem", fontWeight: 700, color: C.inkDark }}>
                        {info.label}
                      </span>
                      {info.badge && (
                        <span style={{
                          fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 600,
                          color: C.amber, background: C.amberBg,
                          border: `1px solid ${C.amber}40`,
                          borderRadius: 3, padding: "1px 6px",
                        }}>
                          {info.badge}
                        </span>
                      )}
                      <a
                        href={info.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: C.inkFaint }}
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkLight, margin: "2px 0 0" }}>
                      {info.description}
                    </p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.73rem", color: C.inkMid, margin: "4px 0 0", lineHeight: 1.55 }}>
                      <strong style={{ color: C.forest }}>Why: </strong>{info.whyItMatters}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Optional fields */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
            <div>
              <label style={{ fontFamily: C.sans, fontSize: "0.76rem", fontWeight: 600, color: C.inkFaint, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                License / Cert Number <span style={{ color: C.inkFaint, fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. 1-23-45678"
                style={{ width: "100%", fontFamily: C.sans, fontSize: "0.88rem", padding: "8px 12px", border: `1px solid ${C.rule}`, borderRadius: 4, background: C.cream, color: C.inkDark, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontFamily: C.sans, fontSize: "0.76rem", fontWeight: 600, color: C.inkFaint, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                NPI Number <span style={{ color: C.inkFaint, fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={npiNumber}
                onChange={(e) => setNpiNumber(e.target.value)}
                placeholder="10-digit NPI"
                style={{ width: "100%", fontFamily: C.sans, fontSize: "0.88rem", padding: "8px 12px", border: `1px solid ${C.rule}`, borderRadius: 4, background: C.cream, color: C.inkDark, boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ fontFamily: C.sans, fontSize: "0.76rem", fontWeight: 600, color: C.inkFaint, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 5 }}>
                State <span style={{ color: C.inkFaint, fontWeight: 400 }}>(optional, for NPI)</span>
              </label>
              <input
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                placeholder="e.g. NC"
                maxLength={2}
                style={{ width: "100%", fontFamily: C.sans, fontSize: "0.88rem", padding: "8px 12px", border: `1px solid ${C.rule}`, borderRadius: 4, background: C.cream, color: C.inkDark, boxSizing: "border-box" }}
              />
            </div>
          </div>

          <Button
            onClick={handleRunCheck}
            disabled={running || selectedSources.size === 0}
            style={{ background: C.forest, color: "#F0EBE3", fontFamily: C.sans, fontWeight: 600, fontSize: "0.88rem", padding: "10px 24px", borderRadius: 4, border: "none", cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}
          >
            {running ? <RefreshCw size={15} className="animate-spin" /> : <Shield size={15} />}
            {running ? "Running checks…" : "Run Verification Check"}
          </Button>
        </div>

        {/* Results */}
        {checks.length > 0 && (
          <div>
            <h2 style={{ fontFamily: C.serif, fontSize: "1.2rem", fontWeight: 700, color: C.inkDark, marginBottom: 16 }}>
              Verification History
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {checks.map((check) => {
                const sourceInfo = SOURCE_LABELS[check.source as Source];
                const isReviewing = reviewingId === check.id;
                let records: unknown[] = [];
                try { records = JSON.parse(check.rawResult ?? "[]"); } catch { records = []; }

                return (
                  <div key={check.id} style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 8, overflow: "hidden" }}>
                    {/* Check header */}
                    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.rule}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                          <span style={{ fontFamily: C.sans, fontSize: "0.9rem", fontWeight: 700, color: C.inkDark }}>
                            {sourceInfo?.label ?? check.source.toUpperCase()}
                          </span>
                          <StatusBadge status={check.status as VerificationStatus} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkFaint, display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={11} />
                            Checked {new Date(check.checkedAt).toLocaleString()}
                          </span>
                          <span style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkFaint }}>
                            {check.matchCount} match{check.matchCount !== 1 ? "es" : ""} found
                          </span>
                          {check.queryLicenseNumber && (
                            <span style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkFaint }}>
                              License: {check.queryLicenseNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons — only show if not yet verified */}
                      {check.status !== "verified" && (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => { setReviewingId(isReviewing ? null : check.id); setReviewNote(""); }}
                            style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, padding: "6px 14px", borderRadius: 4, border: `1px solid ${C.rule}`, background: C.linen, color: C.inkMid, cursor: "pointer" }}
                          >
                            {isReviewing ? "Cancel" : "Review"}
                          </button>
                        </div>
                      )}
                      {check.status === "verified" && check.reviewedBy && (
                        <span style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.green, display: "flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle size={12} />
                          Approved by {check.reviewedBy}
                          {check.reviewedAt ? ` on ${new Date(check.reviewedAt).toLocaleDateString()}` : ""}
                        </span>
                      )}
                    </div>

                    {/* SAM.gov API key required note */}
                    {check.source === "sam_gov" && check.status === "manual_review_required" && (
                      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.rule}`, background: C.amberBg, display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 700, color: C.inkDark, margin: "0 0 4px" }}>
                            SAM.gov API Key Not Configured
                          </p>
                          <p style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkMid, margin: "0 0 8px", lineHeight: 1.6 }}>
                            To enable live SAM.gov exclusion checks: (1) Create a free account at sam.gov,
                            (2) Go to Account Details → Generate Personal API Key,
                            (3) Add it as <strong>SAM_GOV_API_KEY</strong> in your app secrets.
                            You can also search manually at the link below.
                          </p>
                          <a
                            href={`https://sam.gov/content/exclusions`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, color: C.forest, display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                          >
                            <ExternalLink size={12} />
                            Search SAM.gov Exclusions Manually
                          </a>
                        </div>
                      </div>
                    )}

                    {/* BACB manual verification note */}
                    {check.source === "bacb" && (
                      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.rule}`, background: "#FEF9EE" }}>
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                          <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
                          <p style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>
                            Manual Verification Required — BACB does not offer a public API
                          </p>
                        </div>
                        <p style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkMid, margin: "0 0 10px", lineHeight: 1.6 }}>
                          Follow these 4 steps to complete this check:
                        </p>
                        <ol style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkMid, lineHeight: 1.8, margin: "0 0 12px", paddingLeft: 18 }}>
                          <li><strong>Click the button below</strong> — it opens the official BACB Certificant Registry in a new tab.</li>
                          <li><strong>Search by name:</strong> type <strong>{check.queryFirstName ?? ""} {check.queryLastName ?? ""}</strong>{check.queryLicenseNumber ? <> or certification number <strong>{check.queryLicenseNumber}</strong></> : ""}.</li>
                          <li><strong>Confirm</strong> their certification status shows <em>Active</em> and is not expired.</li>
                          <li><strong>Return here</strong> and click <em>Approve</em> if active, or <em>Flag for Review</em> if expired or not found.</li>
                        </ol>
                        <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, margin: "0 0 12px", fontStyle: "italic" }}>
                          This takes about 30 seconds. The result is permanently logged to the audit trail with your name and the date.
                        </p>
                        <a
                          href="https://www.bacb.com/services/o.php?page=101135"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, color: C.forest, display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", background: C.amberBg, border: `1px solid ${C.amber}`, borderRadius: 4, padding: "6px 14px" }}
                        >
                          <ExternalLink size={13} />
                          Verify on BACB.com →
                        </a>
                      </div>
                    )}

                    {/* NPI clean results table */}
                    {check.source === "npi" && records.length > 0 && (() => {
                      type NpiRecord = {
                        number?: string;
                        basic?: { first_name?: string; last_name?: string; credential?: string; status?: string };
                        taxonomies?: { desc?: string; state?: string; license?: string; primary?: boolean }[];
                        addresses?: { address_purpose?: string; city?: string; state?: string }[];
                      };
                      const npiRecords = records as NpiRecord[];
                      return (
                        <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.rule}`, background: C.linen }}>
                          <p style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600, color: C.inkFaint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                            <FileText size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                            {records.length} NPI Match{records.length !== 1 ? "es" : ""} Found — Review and Identify the Correct Person
                          </p>
                          <p style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkMid, marginBottom: 12, lineHeight: 1.5 }}>
                            Multiple providers share this name. Find the correct match below, then click <strong>Approve</strong> once confirmed.
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {npiRecords.map((r, i) => {
                              const name = `${r.basic?.first_name ?? ""} ${r.basic?.last_name ?? ""}`.trim();
                              const credential = r.basic?.credential ?? "";
                              const status = r.basic?.status === "A" ? "Active" : r.basic?.status ?? "Unknown";
                              const primaryTax = r.taxonomies?.find(t => t.primary) ?? r.taxonomies?.[0];
                              const specialty = primaryTax?.desc ?? "";
                              const licenseState = primaryTax?.state ?? "";
                              const licenseNum = primaryTax?.license ?? "";
                              const location = r.addresses?.find(a => a.address_purpose === "LOCATION") ?? r.addresses?.[0];
                              const city = location?.city ?? "";
                              const state = location?.state ?? "";
                              const npi = r.number ?? "";
                              const isSelected = reviewNote.includes(`NPI: ${npi}`);
                              return (
                                <div key={i} style={{ background: isSelected ? C.greenBg : C.cream, border: `1.5px solid ${isSelected ? C.green : C.rule}`, borderRadius: 6, padding: "10px 14px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                      <span style={{ fontFamily: C.sans, fontSize: "0.84rem", fontWeight: 700, color: C.inkDark }}>{name}</span>
                                      {credential && <span style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 600, color: C.forest, background: C.greenBg, border: `1px solid ${C.forest}30`, borderRadius: 3, padding: "1px 7px" }}>{credential}</span>}
                                      <span style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 600, color: status === "Active" ? C.green : C.red, background: status === "Active" ? C.greenBg : C.redBg, borderRadius: 3, padding: "1px 7px" }}>{status}</span>
                                    </div>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                                      {specialty && <span style={{ fontFamily: C.sans, fontSize: "0.74rem", color: C.inkMid }}>{specialty}</span>}
                                      {(city || state) && <span style={{ fontFamily: C.sans, fontSize: "0.74rem", color: C.inkLight }}>{[city, state].filter(Boolean).join(", ")}</span>}
                                      {licenseNum && licenseState && <span style={{ fontFamily: C.sans, fontSize: "0.74rem", color: C.inkLight }}>License: {licenseNum} ({licenseState})</span>}
                                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: C.inkFaint }}>NPI: {npi}</span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const note = `Confirmed match — ${name}${credential ? ` (${credential})` : ""}, ${[city, state].filter(Boolean).join(", ")}${licenseNum ? `, License: ${licenseNum} (${licenseState})` : ""}, NPI: ${npi}`;
                                      setReviewNote(note);
                                      setReviewingId(check.id);
                                    }}
                                    style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, padding: "6px 14px", borderRadius: 4, border: `1px solid ${isSelected ? C.green : C.forest}`, background: isSelected ? C.green : C.forest, color: "#fff", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" as const }}
                                  >
                                    {isSelected ? "✓ Selected" : "This is the right person"}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, marginTop: 10, fontStyle: "italic" }}>
                            Once you have identified the correct match, add a note below (e.g. "Confirmed — NPI 1780025239, Knightdale NC") and click Approve.
                          </p>
                        </div>
                      );
                    })()}

                    {/* Raw result preview — for non-NPI sources only */}
                    {check.source !== "npi" && records.length > 0 && (
                      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.rule}`, background: C.linen }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600, color: C.inkFaint, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                          <FileText size={11} style={{ verticalAlign: "middle", marginRight: 4 }} />
                          Source Data ({records.length} record{records.length !== 1 ? "s" : ""})
                        </p>
                        <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: C.inkMid, background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "10px 12px", overflowX: "auto", maxHeight: 180, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                          {JSON.stringify(records.slice(0, 3), null, 2)}
                          {records.length > 3 ? `\n… and ${records.length - 3} more` : ""}
                        </pre>
                      </div>
                    )}

                    {/* Review panel */}
                    {isReviewing && (
                      <div style={{ padding: "16px 20px", background: C.parchment, borderTop: `1px solid ${C.rule}` }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, color: C.inkDark, marginBottom: 10 }}>
                          Admin Review
                        </p>
                        <textarea
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Optional review note (e.g. 'Confirmed match — correct BCBA, active status')"
                          rows={2}
                          style={{ width: "100%", fontFamily: C.sans, fontSize: "0.82rem", padding: "8px 12px", border: `1px solid ${C.rule}`, borderRadius: 4, background: "#fff", color: C.inkDark, resize: "vertical", boxSizing: "border-box", marginBottom: 12 }}
                        />
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            onClick={() => approveMutation.mutate({ checkId: check.id, reviewNote: reviewNote || undefined })}
                            disabled={approveMutation.isPending}
                            style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 700, padding: "8px 20px", borderRadius: 4, border: "none", background: C.green, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <CheckCircle size={14} />
                            Approve — Mark as Verified
                          </button>
                          <button
                            onClick={() => flagMutation.mutate({ checkId: check.id, reviewNote: reviewNote || undefined })}
                            disabled={flagMutation.isPending}
                            style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, padding: "8px 20px", borderRadius: 4, border: `1px solid ${C.amber}60`, background: C.amberBg, color: C.amber, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                          >
                            <AlertTriangle size={14} />
                            Flag — Needs Review
                          </button>
                        </div>
                        <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, marginTop: 10 }}>
                          Only "Approve" sets the status to Verified. This action is logged in the audit trail.
                        </p>
                      </div>
                    )}

                    {/* Review note display */}
                    {check.reviewNote && !isReviewing && (
                      <div style={{ padding: "10px 20px", background: C.parchment, borderTop: `1px solid ${C.rule}` }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.76rem", color: C.inkMid, margin: 0 }}>
                          <strong>Review note:</strong> {check.reviewNote}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {checks.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 24px", color: C.inkFaint, fontFamily: C.sans }}>
            <Shield size={40} color={C.rule} style={{ marginBottom: 12 }} />
            <p style={{ fontSize: "0.9rem", margin: 0 }}>No verification checks have been run yet for this staff member.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
