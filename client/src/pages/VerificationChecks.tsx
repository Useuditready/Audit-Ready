import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ShieldCheck, ChevronRight, Loader2, Users, PlayCircle, CheckCircle2, AlertCircle, Clock, Download } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  sage:      "#3D6B52",
  amber:     "#C4862A",
  parchment: "#F7F3ED",
  cream:     "#FDFAF6",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  red:       "#B84040",
  green:     "#3A8C5C",
  serif:     "'DM Serif Display', Georgia, serif",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
};

type BatchStatus = "idle" | "running" | "done";
type StaffResult = { id: number; name: string; status: "ok" | "error"; error?: string };

function formatLastVerified(date: Date | null | undefined): string {
  if (!date) return "Never";
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years}yr ago`;
}

function lastVerifiedColor(date: Date | null | undefined): string {
  if (!date) return C.red;
  const d = date instanceof Date ? date : new Date(date);
  const diffDays = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return C.green;
  if (diffDays <= 90) return C.amber;
  return C.red;
}

export default function VerificationChecks() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [batchStatus, setBatchStatus] = useState<BatchStatus>("idle");
  const [batchResults, setBatchResults] = useState<StaffResult[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [filterNeverVerified, setFilterNeverVerified] = useState(false);

  const { data: staffList, isLoading } = trpc.staff.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: lastVerifiedMap, refetch: refetchLastVerified } = trpc.verification.lastVerifiedPerStaff.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchOnWindowFocus: false }
  );

  const runCheckMutation = trpc.verification.runCheck.useMutation();

  const activeStaff = (staffList ?? []).filter((s: any) => s.status !== "inactive" && s.status !== "terminated");
  const neverVerifiedCount = activeStaff.filter((s: any) => !lastVerifiedMap?.[s.id]).length;
  const displayedStaff = filterNeverVerified
    ? activeStaff.filter((s: any) => !lastVerifiedMap?.[s.id])
    : activeStaff;

  const handleExportAuditReport = () => {
    if (!activeStaff.length) return;
    const rows = activeStaff.map((s: any) => {
      const lastDate = lastVerifiedMap?.[s.id];
      const lastVerifiedStr = lastDate
        ? new Date(lastDate).toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" })
        : "Never";
      const daysSince = lastDate
        ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
        : null;
      const status = !lastDate ? "Never Verified" : (daysSince ?? 0) <= 30 ? "Current" : (daysSince ?? 0) <= 90 ? "Review Soon" : "Overdue";
      return [
        `"${s.firstName} ${s.lastName}"`,
        `"${s.role ?? ""}"`,
        `"${s.status ?? ""}"`,
        `"${lastVerifiedStr}"`,
        `"${status}"`,
      ].join(",");
    });
    const csv = ["Staff Name,Role,Status,Last Verified,Verification Status", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verification-audit-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit report downloaded.");
  };

  const handleVerifyAll = async () => {
    if (activeStaff.length === 0) return;
    setBatchStatus("running");
    setBatchResults([]);
    setBatchProgress(0);

    const results: StaffResult[] = [];

    for (let i = 0; i < activeStaff.length; i++) {
      const s = activeStaff[i];
      const fullName = s.firstName && s.lastName
        ? `${s.firstName} ${s.lastName}`
        : s.firstName ?? s.lastName ?? "";
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] ?? fullName;
      const lastName = nameParts.slice(1).join(" ") || firstName;

      try {
        await runCheckMutation.mutateAsync({
          staffId: s.id,
          sources: ["oig_leie", "npi"],
          firstName,
          lastName,
        });
        results.push({ id: s.id, name: fullName, status: "ok" });
      } catch (err: any) {
        results.push({ id: s.id, name: fullName, status: "error", error: err?.message ?? "Unknown error" });
      }

      setBatchProgress(i + 1);
      setBatchResults([...results]);
    }

    setBatchStatus("done");
    await refetchLastVerified();
    const okCount = results.filter(r => r.status === "ok").length;
    const errCount = results.filter(r => r.status === "error").length;
    if (errCount === 0) {
      toast.success(`OIG LEIE + NPI checks completed for all ${okCount} staff members.`);
    } else {
      toast.warning(`Completed ${okCount} checks. ${errCount} failed — see results below.`);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.parchment }}>
        <Loader2 size={32} color={C.forest} className="animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <PilotStatusBanner />
      <EmailVerificationBanner />

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
        {/* ── Page Header ─────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <ShieldCheck size={22} color={C.forest} />
              <h1 style={{ fontFamily: C.serif, fontSize: "1.9rem", fontWeight: 700, color: C.inkDark, margin: 0, letterSpacing: "-0.02em" }}>
                Verification Checks
              </h1>
            </div>
            <p style={{ fontFamily: C.sans, fontSize: "0.9rem", color: C.inkLight, margin: 0, lineHeight: 1.6 }}>
              Run national registry checks (BACB, OIG LEIE, NPI, SAM.gov) for each staff member. Select a staff member below to begin.
            </p>
          </div>

          {/* ── Action buttons ─────────────────────────────── */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {activeStaff.length > 0 && (
            <button
              onClick={handleExportAuditReport}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "10px 18px",
                background: "transparent",
                color: C.forest,
                border: `1px solid ${C.forest}`,
                borderRadius: 8,
                fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
                transition: "background 140ms",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(29,61,47,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <Download size={14} />
              Download Audit Report
            </button>
          )}
          {activeStaff.length > 0 && (
            <button
              onClick={handleVerifyAll}
              disabled={batchStatus === "running"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                background: batchStatus === "running" ? C.forestMid : C.forest,
                color: "#F4F0E8",
                border: "none",
                borderRadius: 8,
                fontFamily: C.sans,
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: batchStatus === "running" ? "not-allowed" : "pointer",
                opacity: batchStatus === "running" ? 0.8 : 1,
                transition: "background 140ms",
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => { if (batchStatus !== "running") (e.currentTarget as HTMLButtonElement).style.background = C.forestMid; }}
              onMouseLeave={e => { if (batchStatus !== "running") (e.currentTarget as HTMLButtonElement).style.background = C.forest; }}
            >
              {batchStatus === "running" ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Checking {batchProgress}/{activeStaff.length}…
                </>
              ) : (
                <>
                  <PlayCircle size={15} />
                  Verify All Staff
                </>
              )}
            </button>
          )}
          </div>
        </div>

        {/* ── Batch results summary ───────────────────────────────── */}
        {batchStatus !== "idle" && batchResults.length > 0 && (
          <div style={{
            background: C.cream,
            border: `1px solid ${C.rule}`,
            borderRadius: 10,
            padding: "16px 20px",
            marginBottom: 24,
          }}>
            <div style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, color: C.inkDark, marginBottom: 10 }}>
              {batchStatus === "running"
                ? `Running OIG LEIE + NPI checks… (${batchProgress}/${activeStaff.length})`
                : `Batch check complete — ${batchResults.filter(r => r.status === "ok").length} of ${batchResults.length} succeeded`}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {batchResults.map(r => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {r.status === "ok"
                    ? <CheckCircle2 size={13} color={C.green} style={{ flexShrink: 0 }} />
                    : <AlertCircle size={13} color={C.red} style={{ flexShrink: 0 }} />}
                  <span style={{ fontFamily: C.sans, fontSize: "0.8rem", color: r.status === "ok" ? C.inkMid : C.red }}>
                    {r.name}
                    {r.status === "error" && r.error ? ` — ${r.error}` : ""}
                  </span>
                  {r.status === "ok" && (
                    <button
                      onClick={() => setLocation(`/staff/${r.id}/verify`)}
                      style={{ marginLeft: "auto", fontFamily: C.sans, fontSize: "0.73rem", color: C.sage, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    >
                      View results
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Disclaimer ──────────────────────────────────────────── */}
        <div style={{
          background: "#F0FDF4",
          border: "1px solid #BBF7D0",
          borderRadius: 8,
          padding: "12px 16px",
          marginBottom: 28,
          fontFamily: C.sans,
          fontSize: "0.78rem",
          color: "#166534",
          lineHeight: 1.55,
        }}>
          <strong>Verification results are for administrative support only.</strong> AuditReady does not guarantee compliance, licensure, payer eligibility, Medicaid eligibility, or employment eligibility. Agencies remain responsible for confirming requirements with the appropriate board, payer, employer policy, or authority.
        </div>

        {/* ── Filter bar ─────────────────────────────────────────── */}
        {activeStaff.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => setFilterNeverVerified(false)}
              style={{
                fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
                padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${!filterNeverVerified ? C.forest : C.rule}`,
                background: !filterNeverVerified ? C.forest : "transparent",
                color: !filterNeverVerified ? "#F4F0E8" : C.inkMid,
                transition: "all 140ms",
              }}
            >
              All Staff ({activeStaff.length})
            </button>
            <button
              onClick={() => setFilterNeverVerified(true)}
              style={{
                fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
                padding: "6px 14px", borderRadius: 20, cursor: "pointer",
                border: `1px solid ${filterNeverVerified ? C.red : C.rule}`,
                background: filterNeverVerified ? "#FEF2F2" : "transparent",
                color: filterNeverVerified ? C.red : C.inkMid,
                transition: "all 140ms",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <AlertCircle size={13} />
              Never Verified ({neverVerifiedCount})
            </button>
          </div>
        )}

        {/* ── Staff List ──────────────────────────────────────────── */}
        {activeStaff.length === 0 ? (
          <div style={{
            background: C.cream,
            border: `1px solid ${C.rule}`,
            borderRadius: 10,
            padding: "48px 24px",
            textAlign: "center",
          }}>
            <Users size={32} color={C.inkFaint} style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: C.sans, fontSize: "0.9rem", color: C.inkLight, margin: 0 }}>
              No active staff members found. Add staff members first to run verification checks.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filterNeverVerified && displayedStaff.length === 0 && (
              <div style={{
                background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 10,
                padding: "32px 24px", textAlign: "center",
              }}>
                <CheckCircle2 size={28} color={C.green} style={{ margin: "0 auto 10px" }} />
                <p style={{ fontFamily: C.sans, fontSize: "0.9rem", color: C.inkLight, margin: 0 }}>
                  All active staff have been verified at least once.
                </p>
              </div>
            )}
            {/* Column headers */}
            {displayedStaff.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "40px 1fr auto auto 16px",
                gap: 16,
                padding: "0 20px 6px",
                alignItems: "center",
              }}>
                <div />
                <div style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkFaint }}>Staff Member</div>
                <div style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkFaint, textAlign: "right", whiteSpace: "nowrap" }}>Last Verified</div>
                <div style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkFaint }}>Status</div>
                <div />
              </div>
            )}

            {displayedStaff.map((s: any) => {
              const lastVerified = lastVerifiedMap?.[s.id] ?? null;
              const lvColor = lastVerifiedColor(lastVerified);
              return (
                <button
                  key={s.id}
                  onClick={() => setLocation(`/staff/${s.id}/verify`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr auto auto 16px",
                    gap: 16,
                    alignItems: "center",
                    background: C.cream,
                    border: `1px solid ${C.rule}`,
                    borderRadius: 10,
                    padding: "14px 20px",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    width: "100%",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.sage;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 2px 8px rgba(29,61,47,0.08)`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = C.rule;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: C.linen,
                    border: `1px solid ${C.rule}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: C.sans,
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: C.forest,
                    flexShrink: 0,
                  }}>
                    {(s.firstName?.[0] ?? "?").toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: C.sans, fontWeight: 600, fontSize: "0.9rem", color: C.inkDark, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.firstName && s.lastName ? `${s.firstName} ${s.lastName}` : s.firstName ?? "—"}
                    </div>
                    <div style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.role || "Staff Member"}
                      {s.email ? ` · ${s.email}` : ""}
                    </div>
                  </div>

                  {/* Last Verified */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                    <Clock size={12} color={lvColor} style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: C.sans, fontSize: "0.78rem", color: lvColor, fontWeight: lastVerified ? 500 : 400 }}>
                      {formatLastVerified(lastVerified)}
                    </span>
                  </div>

                  {/* Status badge */}
                  <div style={{
                    fontFamily: C.sans,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    padding: "3px 10px",
                    borderRadius: 20,
                    background: s.status === "active" ? "#F0FDF4" : C.linen,
                    color: s.status === "active" ? C.green : C.inkMid,
                    border: `1px solid ${s.status === "active" ? "#BBF7D0" : C.rule}`,
                    textTransform: "capitalize",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}>
                    {s.status}
                  </div>

                  <ChevronRight size={16} color={C.inkFaint} style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        )}

        {/* ── Footer note ─────────────────────────────────────────── */}
        <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint, marginTop: 24, lineHeight: 1.5 }}>
          Verification checks query BACB Registry, OIG LEIE, NPI Registry, and SAM.gov. Results are for administrative reference only and do not constitute a compliance certification.
        </p>
      </div>
    </DashboardLayout>
  );
}
