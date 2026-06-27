/**
 * AuditReady Reports Page — Audit-ready export hub
 * Aesthetic: "Editorial Compliance" — matches the rest of the dashboard
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Download, FileText, FileSpreadsheet, BarChart3,
  AlertTriangle, XCircle, CheckCircle, Clock, Loader2,
  Users, LogOut, Menu, X, Settings, FileCheck, CreditCard,
  Sparkles, Copy, ChevronDown, Award, Shield, ClipboardList,
} from "lucide-react";
import { toast } from "sonner";

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

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

function Sidebar({ agencyName, onClose }: { agencyName?: string; onClose?: () => void }) {
  const { logout } = useAuth();
  const [, navigate] = useLocation();
  const nav = [
    { icon: BarChart3,      label: "Dashboard",     href: "/dashboard",      active: false },
    { icon: Users,          label: "Staff",          href: "/staff",          active: false },
    { icon: FileCheck,      label: "Credentials",    href: "/credentials",    active: false },
    { icon: CreditCard,     label: "Credentialing",  href: "/credentialing",  active: false },
    { icon: Clock,          label: "Pending Review", href: "/pending-review", active: false },
    { icon: FileText,       label: "Reports",        href: "/reports",        active: true  },
    { icon: Award,          label: "BACB Certifications", href: "/bacb-certifications", active: false },
    { icon: BarChart3,      label: "Supervision Ratios",  href: "/supervision-ratios",  active: false },
    { icon: Shield,          label: "OIG Exclusion Checks", href: "/oig-exclusion-checks", active: false },
    { icon: ClipboardList,  label: "New-Hire Checklist",   href: "/onboarding-checklist", active: false },
    { icon: Settings,       label: "Settings",       href: "/settings",       active: false },
  ];

  return (
    <aside style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      background: C.forest, position: "relative", overflow: "hidden",
      fontFamily: C.sans,
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.12)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "28px 20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src={LOGO_URL} alt="AuditReady" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
          </a>
          {onClose && (
            <button onClick={onClose} style={{ color: "rgba(240,235,227,0.5)", background: "none", border: "none", cursor: "pointer" }}>
              <X size={17} />
            </button>
          )}
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 20px 16px" }} />
        <div style={{ padding: "0 20px 20px" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,235,227,0.35)", marginBottom: 4 }}>Agency</p>
          <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "#F0EBE3", lineHeight: 1.3 }}>{agencyName || "Your Agency"}</p>
        </div>
        <nav style={{ flex: 1, padding: "0 10px" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(240,235,227,0.25)", padding: "4px 10px 8px" }}>Navigation</p>
          {nav.map(({ icon: Icon, label, href, active }) => (
            <a key={href} href={href} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "9px 10px", marginBottom: 1, borderRadius: 3,
              borderLeft: active ? `2px solid ${C.amber}` : "2px solid transparent",
              paddingLeft: active ? 8 : 10,
              background: active ? "rgba(196,134,42,0.15)" : "transparent",
              color: active ? "#F0EBE3" : "rgba(240,235,227,0.45)",
              fontSize: "0.82rem", fontWeight: active ? 600 : 400,
              textDecoration: "none",
            }}>
              <Icon size={14} strokeWidth={active ? 2 : 1.5} />
              {label}
            </a>
          ))}
        </nav>
        <div style={{ padding: "12px 10px 20px" }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 10 }} />
          <button
            onClick={() => logout()}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", width: "100%",
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(240,235,227,0.35)", fontSize: "0.8rem", fontFamily: C.sans,
            }}
          >
            <LogOut size={13} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
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

const AUDIT_TYPES = [
  { value: "general",     label: "General Compliance Audit" },
  { value: "state_board", label: "State Board Survey" },
  { value: "carf",        label: "CARF Accreditation Review" },
  { value: "payer",       label: "Payer Credentialing Audit" },
  { value: "internal",    label: "Internal Compliance Review" },
] as const;

type AuditType = typeof AUDIT_TYPES[number]["value"];

function AuditNarrativeSection({ user }: { user: any }) {
  const [auditType, setAuditType] = useState<AuditType>("general");
  const [narrative, setNarrative] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  const generateMutation = trpc.ai.generateNarrative.useMutation({
    onSuccess: (data) => {
      setNarrative(data.narrative);
      setGeneratedAt(data.generatedAt);
      toast.success("Audit narrative generated — review before use");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate narrative");
    },
  });

  const handleCopy = () => {
    if (!narrative) return;
    navigator.clipboard.writeText(narrative).then(() => {
      toast.success("Narrative copied to clipboard");
    }).catch(() => {
      toast.error("Copy failed — please select and copy manually");
    });
  };

  const handleDownload = () => {
    if (!narrative) return;
    const blob = new Blob([narrative], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const label = AUDIT_TYPES.find(t => t.value === auditType)?.label ?? "Audit Narrative";
    link.download = `AuditReady-Narrative-${label.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Narrative downloaded");
  };

  return (
    <div style={{ marginTop: 32 }}>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 12 }}>Audit Narrative Assistant</p>
      <div style={{
        background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4,
        padding: "24px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 4, background: `${C.forest}12`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={20} color={C.forest} strokeWidth={1.5} />
          </div>
          <div>
            <h3 style={{ fontFamily: C.serif, fontSize: "1.15rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>Audit Narrative Generator</h3>
            <p style={{ fontSize: "0.78rem", color: C.inkLight, marginTop: 4, lineHeight: 1.5 }}>
              Generates a professional compliance narrative from your live credential data. Review carefully before use — this is an administrative summary, not legal advice.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <select
              value={auditType}
              onChange={e => setAuditType(e.target.value as AuditType)}
              style={{
                fontFamily: C.sans, fontSize: "0.82rem", color: C.inkDark,
                background: C.parchment, border: `1px solid ${C.rule}`,
                borderRadius: 3, padding: "8px 32px 8px 12px",
                appearance: "none", cursor: "pointer", outline: "none",
              }}
            >
              {AUDIT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown size={13} color={C.inkFaint} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
          <button
            onClick={() => generateMutation.mutate({ auditType })}
            disabled={generateMutation.isPending}
            style={{
              display: "inline-flex", alignItems: "center", gap: 7,
              padding: "9px 18px", background: C.forest, color: "#F0EBE3",
              border: "none", borderRadius: 3, fontSize: "0.82rem", fontWeight: 600,
              fontFamily: C.sans, cursor: generateMutation.isPending ? "not-allowed" : "pointer",
              opacity: generateMutation.isPending ? 0.7 : 1,
            }}
          >
            {generateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generateMutation.isPending ? "Generating…" : "Generate Narrative"}
          </button>
        </div>

        {/* Disclaimer banner */}
        <div style={{ padding: "8px 12px", background: "#FEF3CD", border: `1px solid ${C.amberLight}`, borderRadius: 3, marginBottom: 16 }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkMid, lineHeight: 1.5 }}>
            <strong>Review required:</strong> This narrative is generated from your credential records and is for administrative reference only. It does not constitute legal, compliance, or regulatory advice. Review all content before submitting to any external body.
          </p>
        </div>

        {/* Output */}
        {narrative && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint }}>
                Generated {generatedAt ? new Date(generatedAt).toLocaleString() : ""}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleCopy}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", background: "transparent",
                    border: `1px solid ${C.rule}`, borderRadius: 3,
                    fontSize: "0.75rem", fontWeight: 600, fontFamily: C.sans,
                    color: C.inkMid, cursor: "pointer",
                  }}
                >
                  <Copy size={12} /> Copy
                </button>
                <button
                  onClick={handleDownload}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "6px 12px", background: "transparent",
                    border: `1px solid ${C.rule}`, borderRadius: 3,
                    fontSize: "0.75rem", fontWeight: 600, fontFamily: C.sans,
                    color: C.inkMid, cursor: "pointer",
                  }}
                >
                  <Download size={12} /> Download .txt
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={narrative}
              style={{
                width: "100%", minHeight: 280, padding: "14px",
                fontFamily: C.sans, fontSize: "0.82rem", color: C.inkDark,
                background: C.parchment, border: `1px solid ${C.rule}`,
                borderRadius: 3, resize: "vertical", lineHeight: 1.7,
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, { enabled: !!user });
  const { data: expiring30 } = trpc.dashboard.expiring.useQuery({ days: 30 }, { enabled: !!user });
  const { data: expiring60 } = trpc.dashboard.expiring.useQuery({ days: 60 }, { enabled: !!user });
  const { data: expiring90 } = trpc.dashboard.expiring.useQuery({ days: 90 }, { enabled: !!user });
  const { data: allCredentials } = trpc.credentials.listAll.useQuery(undefined, { enabled: !!user });
  const { data: staffList } = trpc.staff.list.useQuery(undefined, { enabled: !!user });

  const exportCsvQuery = trpc.credentials.exportCsv.useQuery(undefined, { enabled: false });

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.parchment }}>
        <Loader2 size={32} color={C.forest} className="animate-spin" />
      </div>
    );
  }

  const handleCsvExport = async () => {
    setExportingCsv(true);
    try {
      const result = await exportCsvQuery.refetch();
      if (result.data?.csv) {
        const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.data.filename;
        link.click();
        URL.revokeObjectURL(url);
        toast.success("CSV report downloaded");
      }
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setExportingCsv(false);
    }
  };

  const handlePdfExport = async () => {
    setExportingPdf(true);
    try {
      if (!allCredentials || !staffList) {
        toast.error("Data not loaded yet, please try again");
        setExportingPdf(false);
        return;
      }

      const agencyName = (user as any)?.agencyName || user?.name || "Your Agency";
      const exportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      // Build staff map
      const staffMap = staffList.reduce<Record<number, { firstName: string; lastName: string; role: string | null }>>((acc, s) => {
        acc[s.id] = { firstName: s.firstName, lastName: s.lastName, role: s.role };
        return acc;
      }, {});

      // Group credentials by staff
      const byStaff: Record<number, { staff: { firstName: string; lastName: string; role: string | null }; creds: typeof allCredentials }> = {};
      for (const cred of allCredentials) {
        if (!byStaff[cred.staffId]) {
          byStaff[cred.staffId] = { staff: staffMap[cred.staffId] ?? { firstName: "Unknown", lastName: "", role: null }, creds: [] };
        }
        byStaff[cred.staffId].creds.push(cred);
      }

      // Status label helper
      const statusLabel = (s: string) => {
        if (s === "current") return "Current";
        if (s === "expiring_soon") return "Expiring Soon";
        if (s === "expired") return "Expired";
        return "N/A";
      };

      const verificationLabel = (s: string) => {
        if (s === "verified") return "Verified";
        if (s === "needs_review") return "Needs Review";
        if (s === "not_found") return "Not Found";
        if (s === "manual_review_required") return "Manual Review Required";
        return "Not Checked";
      };

      // Build HTML for PDF
      const staffSections = Object.values(byStaff).map(({ staff, creds }) => {
        const rows = creds.map(c => {
          const days = daysUntil(c.expirationDate);
          const statusColor = c.status === "expired" ? "#B84040" : c.status === "expiring_soon" ? "#C4862A" : "#3D6B52";
          return `
            <tr>
              <td>${c.type}</td>
              <td>${c.category}</td>
              <td>${c.licenseNumber || "—"}</td>
              <td>${formatDate(c.issueDate)}</td>
              <td style="color:${statusColor};font-weight:600">${formatDate(c.expirationDate)}${days !== null && days <= 90 ? ` (${days}d)` : ""}</td>
              <td style="color:${statusColor}">${statusLabel(c.status)}</td>
              <td>${verificationLabel(c.verificationStatus)}</td>
            </tr>
          `;
        }).join("");

        return `
          <div class="staff-section">
            <div class="staff-header">
              <strong>${staff.firstName} ${staff.lastName}</strong>
              ${staff.role ? `<span class="staff-role">${staff.role}</span>` : ""}
              <span class="cred-count">${creds.length} credential${creds.length !== 1 ? "s" : ""}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Credential</th>
                  <th>Category</th>
                  <th>License #</th>
                  <th>Issue Date</th>
                  <th>Expiration</th>
                  <th>Status</th>
                  <th>Verification</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      }).join("");

      const totalStaff = stats?.totalStaff ?? 0;
      const totalCreds = stats?.totalCredentials ?? 0;
      const expiredCount = stats?.expired ?? 0;
      const expiringSoonCount = stats?.expiringSoon ?? 0;
      const currentCount = stats?.current ?? 0;

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>AuditReady Compliance Report — ${agencyName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #1C1917; background: #fff; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #1D3D2F; margin-bottom: 24px; }
  .header-left h1 { font-size: 22px; font-weight: 700; color: #1D3D2F; letter-spacing: -0.02em; }
  .header-left p { font-size: 11px; color: #7A6E64; margin-top: 4px; }
  .header-right { text-align: right; }
  .header-right .agency { font-size: 14px; font-weight: 600; color: #1C1917; }
  .header-right .date { font-size: 10px; color: #7A6E64; margin-top: 2px; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .stat-box { border: 1px solid #E2D9CE; border-radius: 4px; padding: 12px 14px; }
  .stat-box .value { font-size: 24px; font-weight: 700; font-family: 'Courier New', monospace; }
  .stat-box .label { font-size: 10px; color: #7A6E64; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.08em; }
  .stat-box.forest .value { color: #1D3D2F; }
  .stat-box.sage .value { color: #3D6B52; }
  .stat-box.amber .value { color: #C4862A; }
  .stat-box.red .value { color: #B84040; }
  .staff-section { margin-bottom: 24px; page-break-inside: avoid; }
  .staff-header { background: #F7F3ED; padding: 8px 12px; border-left: 3px solid #1D3D2F; margin-bottom: 0; display: flex; align-items: center; gap: 10px; }
  .staff-header strong { font-size: 12px; color: #1C1917; }
  .staff-role { font-size: 10px; color: #7A6E64; }
  .cred-count { font-size: 10px; color: #A89880; margin-left: auto; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #EFE9E0; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #5A5048; padding: 6px 8px; text-align: left; border-bottom: 1px solid #E2D9CE; }
  td { padding: 6px 8px; border-bottom: 1px solid #F0EBE3; font-size: 10px; color: #1C1917; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #E2D9CE; display: flex; justify-content: space-between; }
  .footer p { font-size: 9px; color: #A89880; }
  .disclaimer { margin-top: 12px; padding: 10px 14px; background: #F7F3ED; border: 1px solid #E2D9CE; border-radius: 3px; }
  .disclaimer p { font-size: 9px; color: #7A6E64; line-height: 1.5; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h1>AuditReady</h1>
    <p>Staff Credential Compliance Report</p>
  </div>
  <div class="header-right">
    <div class="agency">${agencyName}</div>
    <div class="date">Generated ${exportDate}</div>
  </div>
</div>

<div class="summary">
  <div class="stat-box forest"><div class="value">${totalStaff}</div><div class="label">Total Staff</div></div>
  <div class="stat-box sage"><div class="value">${currentCount}</div><div class="label">Current</div></div>
  <div class="stat-box amber"><div class="value">${expiringSoonCount}</div><div class="label">Expiring Soon</div></div>
  <div class="stat-box red"><div class="value">${expiredCount}</div><div class="label">Expired</div></div>
</div>

${staffSections || '<p style="color:#7A6E64;padding:20px 0">No credentials on record.</p>'}

<div class="disclaimer">
  <p><strong>Disclaimer:</strong> This report is for administrative reference only. AuditReady does not guarantee compliance, licensure, payer eligibility, Medicaid eligibility, or employment eligibility. Agencies remain responsible for conducting their own verification and maintaining compliance with applicable laws, regulations, and payer requirements. This report does not constitute legal or compliance advice.</p>
</div>

<div class="footer">
  <p>AuditReady — Staff Credential Compliance Platform</p>
  <p>Total credentials: ${totalCreds} | Report date: ${exportDate}</p>
</div>
</body>
</html>`;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Pop-up blocked. Please allow pop-ups and try again.");
        setExportingPdf(false);
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        setExportingPdf(false);
      }, 500);
      toast.success("PDF report opened — use Print → Save as PDF");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF report");
      setExportingPdf(false);
    }
  };

  const expiredCount = stats?.expired ?? 0;
  const expiringSoonCount = stats?.expiringSoon ?? 0;
  const currentCount = stats?.current ?? 0;
  const totalCreds = stats?.totalCredentials ?? 0;
  const totalStaff = stats?.totalStaff ?? 0;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.parchment, fontFamily: C.sans }}>

      {/* Desktop Sidebar */}
      <div style={{ width: 240, minWidth: 240, flexShrink: 0, display: "none" }} className="lg-sidebar">
        <Sidebar agencyName={(user as any)?.agencyName || user?.name || undefined} />
      </div>
      <style>{`
        @media (min-width: 1024px) { .lg-sidebar { display: block !important; } }
      `}</style>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ width: 240, height: "100%" }}>
            <Sidebar agencyName={(user as any)?.agencyName || user?.name || undefined} onClose={() => setSidebarOpen(false)} />
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.4)" }} onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <PilotStatusBanner />
        <EmailVerificationBanner />

        {/* Top Bar */}
        <header style={{ background: C.cream, borderBottom: `1px solid ${C.rule}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ display: "block", background: "none", border: "none", cursor: "pointer", color: C.inkLight, padding: 4 }}
              className="lg-hide"
            >
              <Menu size={18} />
            </button>
            <style>{`@media (min-width: 1024px) { .lg-hide { display: none !important; } }`}</style>
            <div>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 2 }}>Compliance Reports</p>
              <h1 style={{ fontFamily: C.serif, fontSize: "1.6rem", fontWeight: 600, color: C.inkDark, letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
                Reports & Export
              </h1>
            </div>
          </div>
          <p style={{ fontSize: "0.72rem", color: C.inkFaint }}>{today}</p>
        </header>

        {/* Scrollable Body */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px 40px", background: C.parchment }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>

            {/* Summary Stats */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 12 }}>Compliance Summary</p>
              {statsLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.inkFaint }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span style={{ fontSize: "0.82rem" }}>Loading stats...</span>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                  {[
                    { label: "Total Staff", value: totalStaff, color: C.forest, Icon: Users },
                    { label: "Total Credentials", value: totalCreds, color: C.sage, Icon: FileCheck },
                    { label: "Current", value: currentCount, color: C.sage, Icon: CheckCircle },
                    { label: "Expiring Soon", value: expiringSoonCount, color: C.amber, Icon: AlertTriangle },
                    { label: "Expired", value: expiredCount, color: C.red, Icon: XCircle },
                  ].map(({ label, value, color, Icon }) => (
                    <div key={label} style={{
                      background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4,
                      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon size={16} color={color} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p style={{ fontFamily: C.mono, fontSize: "1.4rem", fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
                        <p style={{ fontSize: "0.7rem", color: C.inkFaint, marginTop: 2 }}>{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expiration Breakdown */}
            <div style={{ marginBottom: 32 }}>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 12 }}>Expiration Breakdown</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {[
                  { label: "Expiring in 30 days", count: expiring30?.length ?? 0, color: C.red },
                  { label: "Expiring in 60 days", count: expiring60?.length ?? 0, color: C.amber },
                  { label: "Expiring in 90 days", count: expiring90?.length ?? 0, color: C.amberLight },
                ].map(({ label, count, color }) => (
                  <div key={label} style={{
                    background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4,
                    padding: "14px 16px", borderLeft: `3px solid ${color}`,
                  }}>
                    <p style={{ fontFamily: C.mono, fontSize: "1.6rem", fontWeight: 700, color, lineHeight: 1 }}>{count}</p>
                    <p style={{ fontSize: "0.75rem", color: C.inkMid, marginTop: 4 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Export Options */}
            <div>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 12 }}>Export Reports</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>

                {/* CSV Export */}
                <div style={{
                  background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4,
                  padding: "24px", display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 4, background: `${C.sage}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileSpreadsheet size={20} color={C.sage} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: C.serif, fontSize: "1.15rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>CSV Spreadsheet</h3>
                      <p style={{ fontSize: "0.78rem", color: C.inkLight, marginTop: 4, lineHeight: 1.5 }}>
                        All credentials in a flat spreadsheet format. Open in Excel, Google Sheets, or any spreadsheet app.
                      </p>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: C.inkFaint, lineHeight: 1.6 }}>
                    Includes: Staff name, role, credential type, license number, issue date, expiration date, status, verification status, document link, notes.
                  </div>
                  <button
                    onClick={handleCsvExport}
                    disabled={exportingCsv}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      padding: "10px 18px", background: C.forest, color: "#F0EBE3",
                      border: "none", borderRadius: 3, fontSize: "0.82rem", fontWeight: 600,
                      fontFamily: C.sans, cursor: exportingCsv ? "not-allowed" : "pointer",
                      opacity: exportingCsv ? 0.7 : 1, marginTop: 4,
                    }}
                  >
                    {exportingCsv ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {exportingCsv ? "Exporting..." : "Download CSV"}
                  </button>
                </div>

                {/* PDF Export */}
                <div style={{
                  background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4,
                  padding: "24px", display: "flex", flexDirection: "column", gap: 12,
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 4, background: `${C.amber}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <FileText size={20} color={C.amber} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 style={{ fontFamily: C.serif, fontSize: "1.15rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>PDF Compliance Report</h3>
                      <p style={{ fontSize: "0.78rem", color: C.inkLight, marginTop: 4, lineHeight: 1.5 }}>
                        Formatted report organized by staff member. Ready to present to auditors, surveyors, or payers.
                      </p>
                    </div>
                  </div>
                  <div style={{ fontSize: "0.72rem", color: C.inkFaint, lineHeight: 1.6 }}>
                    Includes: Agency name, summary stats, all staff with credentials grouped by person, expiration dates, verification status, and compliance disclaimer.
                  </div>
                  <button
                    onClick={handlePdfExport}
                    disabled={exportingPdf || !allCredentials || !staffList}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      padding: "10px 18px", background: C.amber, color: "#fff",
                      border: "none", borderRadius: 3, fontSize: "0.82rem", fontWeight: 600,
                      fontFamily: C.sans, cursor: (exportingPdf || !allCredentials || !staffList) ? "not-allowed" : "pointer",
                      opacity: (exportingPdf || !allCredentials || !staffList) ? 0.7 : 1, marginTop: 4,
                    }}
                  >
                    {exportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {exportingPdf ? "Generating..." : "Generate PDF Report"}
                  </button>
                  <p style={{ fontSize: "0.68rem", color: C.inkFaint }}>
                    Opens a print-ready page — use your browser's Print → Save as PDF.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Audit Narrative Generator ── */}
            <AuditNarrativeSection user={user} />

            {/* Disclaimer */}
            <div style={{
              marginTop: 32, padding: "14px 16px",
              background: C.linen, border: `1px solid ${C.rule}`, borderRadius: 3,
            }}>
              <p style={{ fontSize: "0.72rem", color: C.inkLight, lineHeight: 1.6 }}>
                <strong style={{ color: C.inkMid }}>Disclaimer:</strong> Reports are for administrative reference only. AuditReady does not guarantee compliance, licensure, payer eligibility, or employment eligibility. Agencies remain responsible for conducting their own verification and maintaining compliance with applicable laws and payer requirements.
              </p>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
