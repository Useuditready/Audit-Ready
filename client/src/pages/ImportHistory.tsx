import { useAuth } from "@/_core/hooks/useAuth";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Loader2, FileText, CheckCircle, AlertTriangle, XCircle, Upload, Users } from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  forest: "#1D3D2F",
  forestMid: "#2A5240",
  amber: "#C4862A",
  parchment: "#F7F3ED",
  cream: "#FDFAF6",
  linen: "#EFE9E0",
  linenDark: "#E5DDD2",
  inkDark: "#1C1917",
  inkMid: "#5A5048",
  inkLight: "#7A6E64",
  inkFaint: "#A89880",
  rule: "#E2D9CE",
  red: "#B84040",
  green: "#3A8C5C",
  serif: "'DM Serif Display', Georgia, serif",
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Courier New', monospace",
};
const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function ImportHistory() {
  const { user, loading: authLoading } = useAuth();
  const logsQuery = trpc.importLogs.list.useQuery(undefined, { enabled: !!user });
  const logs = logsQuery.data ?? [];

  if (authLoading || logsQuery.isLoading) return (
    <div style={{ minHeight: "100vh", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} color={C.forest} className="animate-spin" />
    </div>
  );

  return (
    <DashboardLayout>
      <PilotStatusBanner />
      <EmailVerificationBanner />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: C.serif, fontSize: "2rem", fontWeight: 700, color: C.inkDark, letterSpacing: "-0.02em", margin: 0 }}>Import History</h1>
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, marginTop: 6 }}>
              All CSV imports run by your account — staff and credentials.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a href="/staff/import" style={{ display: "flex", alignItems: "center", gap: 7, background: "transparent", color: C.forest, border: `1px solid ${C.forest}`, borderRadius: 4, padding: "9px 16px", textDecoration: "none", fontFamily: C.sans, fontSize: "0.8rem", fontWeight: 600 }}>
              <Users size={14} /> Import Staff
            </a>
            <a href="/credentials/import" style={{ display: "flex", alignItems: "center", gap: 7, background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 4, padding: "9px 16px", textDecoration: "none", fontFamily: C.sans, fontSize: "0.8rem", fontWeight: 600 }}>
              <Upload size={14} /> Import Credentials
            </a>
          </div>
        </div>

        {/* Empty state */}
        {logs.length === 0 && (
          <div style={{ textAlign: "center", padding: "64px 24px", background: C.parchment, borderRadius: 8, border: `1px solid ${C.rule}` }}>
            <FileText size={40} color={C.inkFaint} style={{ marginBottom: 16 }} />
            <p style={{ fontFamily: C.serif, fontSize: "1.3rem", fontWeight: 600, color: C.inkDark, margin: "0 0 8px" }}>No imports yet</p>
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, margin: "0 0 24px" }}>Use the buttons above to import staff or credentials from a CSV file.</p>
          </div>
        )}

        {/* Log table */}
        {logs.length > 0 && (
          <div style={{ border: `1px solid ${C.rule}`, borderRadius: 8, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{ background: C.linen, display: "grid", gridTemplateColumns: "1fr 120px 100px 80px 80px 80px 140px", gap: 0, padding: "10px 20px", borderBottom: `1px solid ${C.rule}` }}>
              {["File", "Type", "Total", "Imported", "Failed", "Result", "Date"].map(h => (
                <span key={h} style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, color: C.inkMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>

            {logs.map((log, i) => {
              const allOk = log.failed === 0;
              const partial = log.failed > 0 && log.inserted > 0;
              const allFailed = log.inserted === 0 && log.failed > 0;
              return (
                <div
                  key={log.id}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 120px 100px 80px 80px 80px 140px",
                    gap: 0, padding: "14px 20px", borderBottom: i < logs.length - 1 ? `1px solid ${C.rule}` : "none",
                    background: i % 2 === 0 ? "#fff" : C.cream,
                    alignItems: "center",
                  }}
                >
                  {/* File name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                    <FileText size={14} color={C.inkFaint} style={{ flexShrink: 0 }} />
                    <span style={{ fontFamily: C.mono, fontSize: "0.75rem", color: C.inkDark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.fileName}>{log.fileName}</span>
                  </div>

                  {/* Type badge */}
                  <div>
                    <span style={{
                      fontFamily: C.sans, fontSize: "0.7rem", fontWeight: 600, padding: "3px 8px", borderRadius: 3,
                      background: log.importType === "staff" ? "#EEF6F1" : "#EEF0FF",
                      color: log.importType === "staff" ? C.forest : "#4B5FD6",
                      textTransform: "capitalize",
                    }}>
                      {log.importType}
                    </span>
                  </div>

                  {/* Total */}
                  <span style={{ fontFamily: C.mono, fontSize: "0.8rem", color: C.inkMid }}>{log.totalRows}</span>

                  {/* Inserted */}
                  <span style={{ fontFamily: C.mono, fontSize: "0.8rem", color: C.forest, fontWeight: 600 }}>{log.inserted}</span>

                  {/* Failed */}
                  <span style={{ fontFamily: C.mono, fontSize: "0.8rem", color: log.failed > 0 ? C.red : C.inkFaint, fontWeight: log.failed > 0 ? 600 : 400 }}>{log.failed}</span>

                  {/* Result badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {allOk && <><CheckCircle size={13} color={C.forest} /><span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.forest, fontWeight: 600 }}>Success</span></>}
                    {partial && <><AlertTriangle size={13} color={C.amber} /><span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.amber, fontWeight: 600 }}>Partial</span></>}
                    {allFailed && <><XCircle size={13} color={C.red} /><span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.red, fontWeight: 600 }}>Failed</span></>}
                  </div>

                  {/* Date */}
                  <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight }}>{formatDate(log.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary stats */}
        {logs.length > 0 && (
          <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { label: "Total imports", value: logs.length },
              { label: "Total rows imported", value: logs.reduce((s, l) => s + l.inserted, 0) },
              { label: "Total rows failed", value: logs.reduce((s, l) => s + l.failed, 0) },
            ].map(stat => (
              <div key={stat.label} style={{ background: C.parchment, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "12px 20px" }}>
                <div style={{ fontFamily: C.mono, fontSize: "1.3rem", fontWeight: 700, color: C.inkDark }}>{stat.value}</div>
                <div style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight, marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
