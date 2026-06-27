/**
 * AdminAuditLog — Activity Audit Log
 * Shows all staff and credential changes tracked in the auditLog table.
 * Admin-only access. Filterable by entity type, action, and date range.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowLeft, RefreshCw, Shield, User, FileText,
  Plus, Pencil, Trash2, CheckCircle, Search, Filter,
} from "lucide-react";

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
  green:     "#2E7D32",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
  serif:     "'DM Serif Display', Georgia, serif",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
};

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function EntityBadge({ type }: { type: "staff" | "credential" }) {
  const config = {
    staff:      { bg: "#E8F0E8", color: C.forest,  Icon: User,     label: "Staff" },
    credential: { bg: "#EBF4FF", color: "#1A5276",  Icon: FileText, label: "Credential" },
  };
  const c = config[type] ?? config.staff;
  const { Icon } = c;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.color,
      fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase",
      padding: "3px 9px", borderRadius: 3,
    }}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}

function ActionBadge({ action }: { action: "create" | "update" | "delete" | "verify" }) {
  const config = {
    create: { bg: "#E8F5E9", color: C.green,     Icon: Plus,         label: "Created" },
    update: { bg: "#FEF3CD", color: C.amber,     Icon: Pencil,       label: "Updated" },
    delete: { bg: "#FEECEC", color: C.red,       Icon: Trash2,       label: "Deleted" },
    verify: { bg: "#E8F0E8", color: C.forest,    Icon: CheckCircle,  label: "Verified" },
  };
  const c = config[action] ?? config.update;
  const { Icon } = c;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.color,
      fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700,
      letterSpacing: "0.07em", textTransform: "uppercase",
      padding: "3px 9px", borderRadius: 3,
    }}>
      <Icon size={10} />
      {c.label}
    </span>
  );
}

export default function AdminAuditLog() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState<"all" | "staff" | "credential">("all");
  const [filterAction, setFilterAction] = useState<"all" | "create" | "update" | "delete" | "verify">("all");

  const { data: logs = [], isLoading, refetch, isFetching } = trpc.auditLog.recent.useQuery(
    { limit },
    { enabled: !!user && user.role === "admin" }
  );

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (filterEntity !== "all" && log.entityType !== filterEntity) return false;
      if (filterAction !== "all" && log.action !== filterAction) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const summary = (log.summary ?? "").toLowerCase();
        const changedBy = (log.changedBy ?? "").toLowerCase();
        const field = (log.fieldChanged ?? "").toLowerCase();
        if (!summary.includes(q) && !changedBy.includes(q) && !field.includes(q)) return false;
      }
      return true;
    });
  }, [logs, filterEntity, filterAction, search]);

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: C.sans, color: C.inkLight }}>Loading…</p>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  const totalActions = logs.length;
  const creates = logs.filter(l => l.action === "create").length;
  const updates = logs.filter(l => l.action === "update").length;
  const deletes = logs.filter(l => l.action === "delete").length;

  return (
    <DashboardLayout>
      {/* Header */}


      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total Actions", value: totalActions, color: C.forest },
            { label: "Created",       value: creates,      color: C.green  },
            { label: "Updated",       value: updates,      color: C.amber  },
            { label: "Deleted",       value: deletes,      color: C.red    },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "16px 20px" }}>
              <p style={{ fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 6 }}>{label}</p>
              <p style={{ fontFamily: C.mono, fontSize: "1.6rem", fontWeight: 700, color, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "16px 20px", marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 220px", border: `1px solid ${C.rule}`, borderRadius: 3, padding: "7px 12px", background: C.parchment }}>
            <Search size={13} color={C.inkFaint} />
            <input
              type="text"
              placeholder="Search by summary, field, or user…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: "none", background: "transparent", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkDark, outline: "none", width: "100%" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={12} color={C.inkFaint} />
            <select
              value={filterEntity}
              onChange={e => setFilterEntity(e.target.value as typeof filterEntity)}
              style={{ border: `1px solid ${C.rule}`, borderRadius: 3, padding: "7px 10px", fontFamily: C.sans, fontSize: "0.8rem", color: C.inkDark, background: C.parchment, cursor: "pointer" }}
            >
              <option value="all">All Entities</option>
              <option value="staff">Staff Only</option>
              <option value="credential">Credentials Only</option>
            </select>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value as typeof filterAction)}
              style={{ border: `1px solid ${C.rule}`, borderRadius: 3, padding: "7px 10px", fontFamily: C.sans, fontSize: "0.8rem", color: C.inkDark, background: C.parchment, cursor: "pointer" }}
            >
              <option value="all">All Actions</option>
              <option value="create">Created</option>
              <option value="update">Updated</option>
              <option value="delete">Deleted</option>
              <option value="verify">Verified</option>
            </select>
          </div>
          <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint, marginLeft: "auto" }}>
            {filtered.length} of {totalActions} entries
          </p>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 4, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {isLoading ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <p style={{ color: C.inkLight, fontSize: "0.88rem" }}>Loading audit log…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Shield size={32} color={C.rule} style={{ marginBottom: 12 }} />
              <p style={{ color: C.inkLight, fontSize: "0.88rem" }}>
                {logs.length === 0 ? "No activity recorded yet. Actions will appear here as staff and credentials are added." : "No entries match your filters."}
              </p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr style={{ background: C.linen, borderBottom: `1px solid ${C.rule}` }}>
                  {["Timestamp", "Entity", "Action", "Summary", "Field Changed", "Before → After", "Changed By"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: C.sans, fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${C.rule}`, background: i % 2 === 0 ? "#fff" : C.parchment }}>
                    <td style={{ padding: "10px 14px", fontFamily: C.mono, fontSize: "0.72rem", color: C.inkLight, whiteSpace: "nowrap" }}>
                      {formatDate(log.changedAt)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <EntityBadge type={log.entityType} />
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <ActionBadge action={log.action} />
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: C.sans, fontSize: "0.8rem", color: C.inkDark, maxWidth: 280 }}>
                      {log.summary || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: C.mono, fontSize: "0.72rem", color: C.inkMid }}>
                      {log.fieldChanged || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: C.mono, fontSize: "0.7rem", color: C.inkLight, maxWidth: 200 }}>
                      {log.oldValue || log.newValue ? (
                        <span>
                          {log.oldValue ? <span style={{ color: C.red }}>{truncate(log.oldValue, 30)}</span> : null}
                          {log.oldValue && log.newValue ? <span style={{ color: C.inkFaint }}> → </span> : null}
                          {log.newValue ? <span style={{ color: C.green }}>{truncate(log.newValue, 30)}</span> : null}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "10px 14px", fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, whiteSpace: "nowrap" }}>
                      {log.changedBy || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Load more */}
        {logs.length >= limit && (
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button
              onClick={() => setLimit(l => l + 200)}
              style={{ background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 3, padding: "10px 28px", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
            >
              Load 200 more
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </DashboardLayout>
  );
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}
