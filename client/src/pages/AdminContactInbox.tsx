/**
 * AdminContactInbox — Contact form submissions inbox.
 * Admin-only. Shows all contact form submissions with status management.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Mail, ArrowLeft, RefreshCw, Inbox, CheckCheck, Reply, Archive } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const C = {
  forest: "#1D3D2F",
  sage: "#3D6B52",
  amber: "#C4862A",
  parchment: "#F7F3ED",
  linen: "#EFE9E0",
  rule: "#E2D9CE",
  inkDark: "#1C1917",
  inkMid: "#5A5048",
  inkLight: "#7A6E64",
  inkFaint: "#A89880",
  red: "#B84040",
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  serif: "'DM Serif Display', Georgia, serif",
  mono: "'JetBrains Mono', monospace",
};

type SubmissionStatus = "new" | "read" | "replied" | "archived";

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const config: Record<SubmissionStatus, { bg: string; color: string; label: string }> = {
    new:      { bg: "#DBEAFE", color: "#1D4ED8", label: "New" },
    read:     { bg: C.linen,  color: C.inkMid,  label: "Read" },
    replied:  { bg: "#D1FAE5", color: "#065F46", label: "Replied" },
    archived: { bg: "#F3F4F6", color: "#6B7280", label: "Archived" },
  };
  const cfg = config[status];
  return (
    <span style={{
      display: "inline-block",
      background: cfg.bg,
      color: cfg.color,
      fontFamily: C.sans,
      fontSize: "0.68rem",
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "3px 10px",
      borderRadius: 3,
    }}>
      {cfg.label}
    </span>
  );
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminContactInbox() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | SubmissionStatus>("all");

  const utils = trpc.useUtils();
  const { data: submissions = [], isLoading, refetch } = trpc.contact.list.useQuery();
  const updateStatus = trpc.contact.updateStatus.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate();
      utils.contact.countNew.invalidate();
      toast.success("Status updated");
    },
    onError: (e) => toast.error(e.message),
  });

  if (loading) return null;
  if (!user || user.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  const filtered = filter === "all"
    ? submissions
    : submissions.filter((s) => s.status === filter);

  const selected = submissions.find((s) => s.id === selectedId);
  const newCount = submissions.filter((s) => s.status === "new").length;

  const handleSelect = (id: number, status: SubmissionStatus) => {
    setSelectedId(id);
    if (status === "new") {
      updateStatus.mutate({ id, status: "read" });
    }
  };

  const handleStatus = (id: number, status: SubmissionStatus) => {
    updateStatus.mutate({ id, status });
    if (status === "archived") setSelectedId(null);
  };

  const filterTabs: { key: "all" | SubmissionStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "new", label: "New" },
    { key: "read", label: "Read" },
    { key: "replied", label: "Replied" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <DashboardLayout>
      {/* Header */}


      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: selected ? "340px 1fr" : "1fr", gap: 24 }}>

        {/* Left: list */}
        <div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total", value: submissions.length, icon: Inbox },
              { label: "New", value: submissions.filter(s => s.status === "new").length, icon: Mail },
              { label: "Replied", value: submissions.filter(s => s.status === "replied").length, icon: Reply },
              { label: "Archived", value: submissions.filter(s => s.status === "archived").length, icon: Archive },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Icon size={12} color={C.sage} />
                  <span style={{ fontFamily: C.mono, fontSize: "0.58rem", color: C.inkFaint, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
                </div>
                <div style={{ fontFamily: C.mono, fontSize: "1.3rem", fontWeight: 700, color: C.inkDark }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 0, marginBottom: 16, borderBottom: `1px solid ${C.rule}` }}>
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: C.sans, fontSize: "0.72rem", fontWeight: filter === tab.key ? 700 : 500,
                  color: filter === tab.key ? C.inkDark : C.inkFaint,
                  padding: "8px 14px",
                  borderBottom: filter === tab.key ? `2px solid ${C.forest}` : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Submission list */}
          {isLoading ? (
            <p style={{ color: C.inkFaint, fontSize: "0.85rem" }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: C.inkFaint }}>
              <Inbox size={32} style={{ margin: "0 auto 12px", display: "block", opacity: 0.4 }} />
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", margin: 0 }}>No submissions</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelect(s.id, s.status as SubmissionStatus)}
                  style={{
                    background: selectedId === s.id ? "#fff" : s.status === "new" ? "#EFF6FF" : "#fff",
                    border: `1px solid ${selectedId === s.id ? C.sage : C.rule}`,
                    borderRadius: 4, padding: "12px 14px", cursor: "pointer",
                    transition: "border-color 150ms",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: s.status === "new" ? 700 : 500, color: C.inkDark, flex: 1, marginRight: 8 }}>
                      {s.name}
                    </div>
                    <StatusBadge status={s.status as SubmissionStatus} />
                  </div>
                  <div style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight, marginBottom: 4 }}>{s.email}</div>
                  <div style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, fontWeight: 600, marginBottom: 4 }}>{s.subject}</div>
                  <div style={{ fontFamily: C.mono, fontSize: "0.6rem", color: C.inkFaint }}>{formatDate(s.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail pane */}
        {selected && (
          <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "24px 28px", alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h2 style={{ fontFamily: C.serif, fontSize: "1.3rem", color: C.inkDark, margin: "0 0 4px" }}>{selected.subject}</h2>
                <div style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight }}>
                  From <strong style={{ color: C.inkDark }}>{selected.name}</strong> · <a href={`mailto:${selected.email}`} style={{ color: C.sage }}>{selected.email}</a>
                </div>
                <div style={{ fontFamily: C.mono, fontSize: "0.6rem", color: C.inkFaint, marginTop: 4 }}>{formatDate(selected.createdAt)}</div>
              </div>
              <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint, fontSize: "1.2rem", lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 20, marginBottom: 24 }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.75, whiteSpace: "pre-wrap", margin: 0 }}>{selected.message}</p>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <a
                href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                onClick={() => handleStatus(selected.id, "replied")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: C.forest, color: "#F0EBE3", borderRadius: 3,
                  padding: "8px 18px", fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
                  textDecoration: "none", cursor: "pointer",
                }}
              >
                <Reply size={13} /> Reply via Email
              </a>
              {selected.status !== "replied" && (
                <button onClick={() => handleStatus(selected.id, "replied")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#D1FAE5", color: "#065F46", border: "none", borderRadius: 3, padding: "8px 14px", fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  <CheckCheck size={13} /> Mark Replied
                </button>
              )}
              {selected.status !== "archived" && (
                <button onClick={() => handleStatus(selected.id, "archived")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: C.linen, color: C.inkMid, border: `1px solid ${C.rule}`, borderRadius: 3, padding: "8px 14px", fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
                  <Archive size={13} /> Archive
                </button>
              )}
            </div>
          </div>
        )}
      </div>
        </DashboardLayout>
  );
}
