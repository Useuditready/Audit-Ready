/**
 * AdminNotifications — Notification Audit Log
 * Shows all sent/failed/skipped emails from the notification_logs table.
 * Admin-only access.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { ArrowLeft, RefreshCw, Bell, Mail, AlertTriangle, CheckCircle, XCircle, MinusCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  sage:      "#3D6B52",
  amber:     "#C4862A",
  parchment: "#F7F3ED",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  red:       "#B84040",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
  serif:     "'DM Serif Display', Georgia, serif",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function formatEventType(eventType: string): string {
  return eventType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function RecipientBadge({ type }: { type: "admin" | "rep" | "agency" }) {
  const config: Record<string, { bg: string; color: string; label: string }> = {
    admin:  { bg: "#E8F0E8", color: C.forest,  label: "Admin" },
    rep:    { bg: "#FEF3CD", color: C.amber,   label: "Rep" },
    agency: { bg: "#EBF4FF", color: "#1A5276", label: "Agency" },
  };
  const c = config[type] ?? config.admin;
  return (
    <span style={{
      display: "inline-block", background: c.bg, color: c.color,
      fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase",
      padding: "3px 9px", borderRadius: 3,
    }}>
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: "sent" | "failed" | "skipped" }) {
  const config: Record<string, { bg: string; color: string; Icon: React.ElementType; label: string }> = {
    sent:    { bg: "#E8F5E9", color: "#2E7D32",  Icon: CheckCircle,  label: "Sent" },
    failed:  { bg: "#FEECEC", color: C.red,       Icon: XCircle,      label: "Failed" },
    skipped: { bg: C.linen,   color: C.inkLight,  Icon: MinusCircle,  label: "Skipped" },
  };
  const c = config[status] ?? config.sent;
  const { Icon } = c;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.color,
      fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase",
      padding: "3px 9px", borderRadius: 3,
    }}>
      <Icon size={11} />
      {c.label}
    </span>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminNotifications() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [limit, setLimit] = useState(200);

  const { data: logs, isLoading, refetch, isFetching } = trpc.notifications.getLogs.useQuery(
    { limit },
    { enabled: isAuthenticated && user?.role === "admin" }
  );

  // ── Auth guard ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: C.sans, color: C.inkLight, fontSize: "0.9rem" }}>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <AlertTriangle size={32} color={C.amber} />
        <p style={{ fontFamily: C.sans, color: C.inkMid, fontSize: "0.95rem" }}>Admin access required.</p>
        <button onClick={() => navigate("/dashboard")} style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.forest, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Stats ──────────────────────────────────────────────────────
  const total   = logs?.length ?? 0;
  const sent    = logs?.filter((l) => l.deliveryStatus === "sent").length ?? 0;
  const failed  = logs?.filter((l) => l.deliveryStatus === "failed").length ?? 0;
  const skipped = logs?.filter((l) => l.deliveryStatus === "skipped").length ?? 0;

  return (
    <DashboardLayout>

      {/* ── Header ──────────────────────────────────────────────── */}


      {/* ── Stat cards ──────────────────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 40px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Total Sent",  value: total,   color: C.inkDark },
            { label: "Delivered",   value: sent,    color: "#2E7D32" },
            { label: "Failed",      value: failed,  color: C.red },
            { label: "Skipped",     value: skipped, color: C.inkLight },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#FDFAF6", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "16px 20px" }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, margin: "0 0 6px" }}>{label}</p>
              <p style={{ fontFamily: C.mono, fontSize: "1.6rem", fontWeight: 700, color, margin: 0, lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* ── Table ─────────────────────────────────────────────── */}
        <div style={{ background: "#FDFAF6", border: `1px solid ${C.rule}`, borderRadius: 4, overflow: "hidden", marginBottom: 40 }}>
          {isLoading ? (
            <div style={{ padding: "60px 40px", textAlign: "center", color: C.inkLight, fontSize: "0.88rem" }}>
              Loading notification logs…
            </div>
          ) : !logs || logs.length === 0 ? (
            <div style={{ padding: "60px 40px", textAlign: "center" }}>
              <Mail size={32} color={C.inkFaint} style={{ marginBottom: 12 }} />
              <p style={{ fontFamily: C.sans, color: C.inkLight, fontSize: "0.9rem", margin: 0 }}>No notifications logged yet.</p>
              <p style={{ fontFamily: C.sans, color: C.inkFaint, fontSize: "0.8rem", marginTop: 6 }}>Emails will appear here once the system starts sending them.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.rule}` }}>
                    {["Sent At", "Recipient", "Type", "Event", "Status", "Agency ID"].map((h) => (
                      <th key={h} style={{
                        fontFamily: C.mono, fontSize: "0.62rem", fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                        color: C.inkFaint, padding: "12px 16px", textAlign: "left",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, i) => (
                    <tr
                      key={log.id}
                      style={{
                        borderBottom: `1px solid ${C.rule}`,
                        background: i % 2 === 0 ? "#FDFAF6" : C.parchment,
                      }}
                    >
                      {/* Sent At */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <span style={{ fontFamily: C.mono, fontSize: "0.75rem", color: C.inkMid }}>
                          {formatDate(log.sentAt)}
                        </span>
                      </td>

                      {/* Recipient email */}
                      <td style={{ padding: "12px 16px", maxWidth: 220 }}>
                        <span style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.inkDark, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {log.recipientEmail}
                        </span>
                      </td>

                      {/* Recipient type */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <RecipientBadge type={log.recipientType} />
                      </td>

                      {/* Event type */}
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.inkMid }}>
                          {formatEventType(log.eventType)}
                        </span>
                      </td>

                      {/* Delivery status */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        <StatusBadge status={log.deliveryStatus} />
                      </td>

                      {/* Agency ID */}
                      <td style={{ padding: "12px 16px" }}>
                        {log.agencyId ? (
                          <span style={{ fontFamily: C.mono, fontSize: "0.75rem", color: C.inkLight }}>
                            #{log.agencyId}
                          </span>
                        ) : (
                          <span style={{ color: C.inkFaint, fontSize: "0.75rem" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load more footer */}
          {logs && logs.length >= limit && (
            <div style={{ borderTop: `1px solid ${C.rule}`, padding: "14px 20px", textAlign: "center" }}>
              <button
                onClick={() => setLimit((prev) => prev + 200)}
                style={{
                  fontFamily: C.sans, fontSize: "0.8rem", fontWeight: 600,
                  color: C.forest, background: "none", border: "none", cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Load 200 more
              </button>
            </div>
          )}
        </div>
      </div>
        </DashboardLayout>
  );
}
