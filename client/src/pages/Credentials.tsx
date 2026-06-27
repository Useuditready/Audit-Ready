/**
 * AuditReady Credentials Page — Connected to real database via tRPC
 * Aesthetic: "Editorial Compliance"
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  FileCheck, Search, Shield, AlertTriangle,
  CheckCircle, XCircle, Clock, Filter,
  ChevronDown, Loader2, Plus, Download, Upload,
} from "lucide-react";
import { toast } from "sonner";

// ── Palette & Tokens ───────────────────────────────────────────────────────────
const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  sage:      "#3D6B52",
  amber:     "#C4862A",
  amberLight:"#E8A94A",
  red:       "#B84040",
  parchment: "#F7F3ED",
  cream:     "#FDFAF6",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  green:     "#3A8C5C",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
  serif:     "'DM Serif Display', Georgia, serif",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
};

const MONOGRAM_URL = "/manus-storage/auditready-monogram-v2_0b7ecdd4.png";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.FC<any> }> = {
  current:        { label: "Current",      color: C.sage,  bg: "#EBF3EE", icon: CheckCircle },
  expiring_soon:  { label: "Expiring",     color: C.amber, bg: "#FBF3E6", icon: AlertTriangle },
  expired:        { label: "Expired",      color: C.red,   bg: "#FBEAEA", icon: XCircle },
  not_applicable: { label: "N/A",          color: C.inkFaint, bg: C.linen, icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.current;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 3,
      background: cfg.bg, color: cfg.color,
      fontSize: "0.68rem", fontWeight: 600, fontFamily: C.sans,
      letterSpacing: "0.04em",
    }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Credentials() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");

  const { data: allCredentials, isLoading } = trpc.credentials.listAll.useQuery(undefined, { enabled: !!user });
  const { data: staffList } = trpc.staff.list.useQuery(undefined, { enabled: !!user });
  const exportQuery = trpc.credentials.exportCsv.useQuery(undefined, { enabled: false });

  const handleExport = async () => {
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success("Export downloaded successfully");
      }
    } catch {
      toast.error("Failed to export credentials");
    }
  };

  // Build staff lookup
  const staffMap = (staffList ?? []).reduce<Record<number, { firstName: string; lastName: string; role: string | null }>>((acc, s) => {
    acc[s.id] = { firstName: s.firstName, lastName: s.lastName, role: s.role };
    return acc;
  }, {});

  // Filter credentials
  const filtered = (allCredentials ?? []).filter(c => {
    const staff = staffMap[c.staffId];
    const staffName = staff ? `${staff.firstName} ${staff.lastName}` : "";
    const matchSearch = searchQuery === "" ||
      staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.issuingBody ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchCategory = categoryFilter === "all" || c.category === categoryFilter;
    const matchVerification = verificationFilter === "all" || c.verificationStatus === verificationFilter;
    return matchSearch && matchStatus && matchCategory && matchVerification;
  });

  const counts = {
    total: (allCredentials ?? []).length,
    current: (allCredentials ?? []).filter(c => c.status === "current").length,
    expiring: (allCredentials ?? []).filter(c => c.status === "expiring_soon").length,
    expired: (allCredentials ?? []).filter(c => c.status === "expired").length,
  };

  if (authLoading) {
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

      {/* ── Page Content ───────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Title */}
        <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: C.serif, fontSize: "2rem", fontWeight: 700, color: C.inkDark, letterSpacing: "-0.02em", margin: 0 }}>
              All Credentials
            </h1>
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, marginTop: 6 }}>
              Complete credential registry across all staff members
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
          <a
            href="/credentials/import"
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
              background: "transparent", color: C.forest,
              border: `1px solid ${C.forest}`, borderRadius: 3,
              fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Upload size={14} /> Import CSV
          </a>
          <a
            href="/pending-review"
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
              background: "rgba(196,134,42,0.1)", color: C.amber,
              border: `1px solid ${C.amber}`, borderRadius: 3,
              fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <Clock size={14} /> Pending Review
          </a>
          <button
            onClick={handleExport}
            disabled={!allCredentials || allCredentials.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
              background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 3,
              fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
              opacity: (!allCredentials || allCredentials.length === 0) ? 0.5 : 1,
              transition: "background 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.forestMid)}
            onMouseLeave={e => (e.currentTarget.style.background = C.forest)}
          >
            <Download size={14} />
            Export CSV
          </button>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Total Credentials", value: counts.total, color: C.forest },
            { label: "Current & Valid",   value: counts.current, color: C.sage },
            { label: "Expiring Soon",     value: counts.expiring, color: C.amber },
            { label: "Expired",           value: counts.expired, color: C.red },
          ].map((s, i) => (
            <div key={i} style={{
              background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4,
              padding: "16px 20px", borderTop: `3px solid ${s.color}`,
            }}>
              <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: C.mono, fontSize: "1.8rem", fontWeight: 700, color: s.color }}>
                {isLoading ? "—" : s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4,
          padding: "14px 20px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <Filter size={14} color={C.inkLight} />
          <input
            type="text"
            placeholder="Search staff or credential type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1, minWidth: 200, padding: "8px 12px",
              border: `1px solid ${C.rule}`, borderRadius: 4,
              fontFamily: C.sans, fontSize: "0.82rem", color: C.inkDark,
              background: C.parchment, outline: "none",
            }}
          />
          <div style={{ position: "relative" }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                appearance: "none", padding: "8px 28px 8px 12px",
                border: `1px solid ${C.rule}`, borderRadius: 4,
                fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid,
                background: C.parchment, cursor: "pointer", outline: "none",
              }}
            >
              <option value="all">All Status</option>
              <option value="current">Current</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="not_applicable">N/A</option>
            </select>
            <ChevronDown size={12} color={C.inkLight} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          <div style={{ position: "relative" }}>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              style={{
                appearance: "none", padding: "8px 28px 8px 12px",
                border: `1px solid ${C.rule}`, borderRadius: 4,
                fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid,
                background: C.parchment, cursor: "pointer", outline: "none",
              }}
            >
              <option value="all">All Categories</option>
              <option value="license">License</option>
              <option value="certification">Certification</option>
              <option value="training">Training</option>
              <option value="background_check">Background Check</option>
              <option value="sex_offender_registry">Sex Offender Registry Check</option>
              <option value="insurance">Insurance</option>
              <option value="other">Other</option>
            </select>
            <ChevronDown size={12} color={C.inkLight} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          <div style={{ position: "relative" }}>
            <select
              value={verificationFilter}
              onChange={e => setVerificationFilter(e.target.value)}
              style={{
                appearance: "none", padding: "8px 28px 8px 12px",
                border: `1px solid ${C.rule}`, borderRadius: 4,
                fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid,
                background: C.parchment, cursor: "pointer", outline: "none",
              }}
            >
              <option value="all">All Verification</option>
              <option value="not_checked">Not Checked</option>
              <option value="verified">Verified</option>
              <option value="needs_review">Needs Review</option>
              <option value="not_found">Not Found</option>
              <option value="manual_review_required">Manual Review Required</option>
            </select>
            <ChevronDown size={12} color={C.inkLight} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          <span style={{ fontSize: "0.72rem", color: C.inkFaint, marginLeft: "auto" }}>
            {filtered.length} of {counts.total} credentials
          </span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Loader2 size={28} color={C.forest} className="animate-spin" style={{ margin: "0 auto" }} />
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, marginTop: 12 }}>Loading credentials...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4 }}>
            <FileCheck size={40} color={C.inkFaint} style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: C.serif, fontSize: "1.3rem", color: C.inkDark, marginBottom: 8 }}>
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all" ? "No matching credentials" : "No credentials tracked yet"}
            </h3>
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight }}>
              {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your search or filters."
                : "Add staff members and their credentials to get started."}
            </p>
          </div>
        ) : (
          <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${C.rule}` }}>
                  {["Staff Member", "Credential Type", "Issuing Body", "Expires", "Days", "Status", "Verification", "Document"].map(h => (
                    <th key={h} style={{
                      padding: "11px 18px", textAlign: "left",
                      fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em",
                      textTransform: "uppercase", color: C.inkFaint,
                      background: C.linen, whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const staff = staffMap[c.staffId];
                  const staffName = staff ? `${staff.firstName} ${staff.lastName}` : "Unknown";
                  const staffRole = staff?.role ?? "";
                  const days = daysUntil(c.expirationDate);
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: `1px solid ${C.rule}`,
                        background: i % 2 === 0 ? C.cream : C.parchment,
                        transition: "background 120ms",
                        cursor: "pointer",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.linen)}
                      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? C.cream : C.parchment)}
                      onClick={() => navigate(`/staff/${c.staffId}`)}
                    >
                      <td style={{ padding: "12px 18px" }}>
                        <div style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, color: C.inkDark }}>{staffName}</div>
                        {staffRole && <div style={{ fontFamily: C.mono, fontSize: "0.68rem", color: C.inkLight, marginTop: 2 }}>{staffRole}</div>}
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <div style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkDark }}>{c.type}</div>
                        <div style={{ fontFamily: C.sans, fontSize: "0.68rem", color: C.inkFaint, marginTop: 2, textTransform: "capitalize" }}>{c.category.replace("_", " ")}</div>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <div style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight }}>{c.issuingBody || "—"}</div>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <div style={{ fontFamily: C.mono, fontSize: "0.75rem", color: c.status === "expired" ? C.red : C.inkMid }}>
                          {formatDate(c.expirationDate)}
                        </div>
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        {days !== null ? (
                          <div style={{
                            fontFamily: C.mono, fontSize: "0.78rem", fontWeight: 700,
                            color: days < 0 ? C.red : days <= 30 ? C.red : days <= 90 ? C.amber : C.sage,
                          }}>
                            {days < 0 ? `${Math.abs(days)}d ago` : `${days}d`}
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: C.inkFaint }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        {(() => {
                          const vs = c.verificationStatus;
                          const vColor = vs === "verified" ? C.sage : vs === "not_found" ? C.red : vs === "needs_review" ? C.amber : vs === "manual_review_required" ? C.inkMid : C.inkFaint;
                          const vBg = vs === "verified" ? "#EBF3EE" : vs === "not_found" ? "#FBEAEA" : vs === "needs_review" ? "#FBF3E6" : vs === "manual_review_required" ? "rgba(100,100,100,0.08)" : C.linen;
                          const vLabel = vs === "verified" ? "Verified" : vs === "not_found" ? "Not Found" : vs === "needs_review" ? "Needs Review" : vs === "manual_review_required" ? "Manual Review Required" : "Not Checked";
                          return (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "3px 8px", borderRadius: 3,
                              background: vBg, color: vColor,
                              fontSize: "0.68rem", fontWeight: 600, fontFamily: C.sans,
                              letterSpacing: "0.04em",
                            }}>
                              {vLabel}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        {(c as any).documentLocationType && (c as any).documentLocationType !== "none" ? (
                          <span style={{
                            fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600,
                            color: C.inkMid, background: C.linen,
                            padding: "2px 7px", borderRadius: 2,
                          }}>
                            {(c as any).documentLocationType === "paper" ? "Paper" :
                             (c as any).documentLocationType === "google_drive" ? "Google Drive" :
                             (c as any).documentLocationType === "dropbox" ? "Dropbox" :
                             (c as any).documentLocationType === "sharepoint" ? "SharePoint" :
                             (c as any).documentLocationType === "hr_system" ? "HR System" :
                             (c as any).documentLocationType === "ehr_system" ? "EHR System" :
                             "Other"}
                          </span>
                        ) : (
                          <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Phase 1 disclaimer */}
        <div style={{ marginTop: 24, padding: "12px 16px", background: C.linen, border: `1px solid ${C.rule}`, borderRadius: 4 }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: C.inkLight }}>AuditReady — No Document Storage:</strong> AuditReady stores credential tracking information and document links only. Agencies are responsible for controlling access to their own document storage systems (Google Drive, Dropbox, SharePoint, etc.). AuditReady does not store uploaded credential files, patient information, clinical notes, PHI, therapy records, billing records, Medicaid records, or client files.
          </p>
        </div>
        {/* Not legal advice notice */}
        <div style={{ marginTop: 12, padding: "12px 16px", background: C.linen, border: `1px solid ${C.rule}`, borderRadius: 4 }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: C.inkLight }}>Not Legal or Compliance Advice:</strong> Credential checklists and requirement summaries are for informational purposes only based on publicly available regulatory information. Requirements change. Always verify current requirements with the relevant licensing board or qualified legal counsel.
          </p>
        </div>
        {/* Policy footer */}
        <div style={{ marginTop: 24, padding: "12px 0", borderTop: `1px solid ${C.rule}`, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, margin: 0, lineHeight: 1.6 }}>
            All changes to credential records are logged with your name and timestamp for compliance purposes. © {new Date().getFullYear()} AuditReady.
          </p>
          <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
            <a href="/privacy" style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, textDecoration: "none" }}>Privacy</a>
            <a href="/terms" style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, textDecoration: "none" }}>Terms</a>
            <a href="/refunds" style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, textDecoration: "none" }}>Refunds</a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
