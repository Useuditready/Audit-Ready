/**
 * AdminSales — Sales Rep Code Management & Acquisition Report
 * Admin-only panel for:
 *   - Viewing direct vs rep-attributed signups
 *   - Setup fee revenue by source
 *   - Commission owed and paid
 *   - Managing sales reps (create, list)
 *   - Marking commissions as paid
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowLeft, RefreshCw, Users, DollarSign, Tag, CheckCircle,
  Plus, TrendingUp, TrendingDown, Loader2, AlertCircle
} from "lucide-react";

const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  sage:      "#3D6B52",
  amber:     "#C4862A",
  amberBg:   "#FEF3CD",
  parchment: "#F7F3ED",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  red:       "#B84040",
  green:     "#2A7A4A",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
  serif:     "'DM Serif Display', Georgia, serif",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
};

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${C.rule}`,
      borderRadius: 6,
      padding: "20px 24px",
      borderTop: `3px solid ${accent ?? C.forest}`,
    }}>
      <div style={{ fontFamily: C.mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: C.serif, fontSize: "2rem", fontWeight: 700, color: C.inkDark, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function AdminSales() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Tab state
  const [activeTab, setActiveTab] = useState<"report" | "reps" | "commissions">("report");

  // New rep form
  const [showNewRep, setShowNewRep] = useState(false);
  const [newRep, setNewRep] = useState({ name: "", email: "", code: "", notes: "" });
  const [newRepErrors, setNewRepErrors] = useState<Record<string, string>>({});

  // Queries
  const { data: report, isLoading: reportLoading, refetch: refetchReport } = trpc.rep.salesReport.useQuery();
  const { data: reps, isLoading: repsLoading, refetch: refetchReps } = trpc.rep.list.useQuery();
  const { data: commissions, isLoading: commissionsLoading, refetch: refetchCommissions } = trpc.rep.listCommissions.useQuery();

  // Mutations
  const createRep = trpc.rep.create.useMutation({
    onSuccess: () => {
      toast.success("Sales rep created.");
      setShowNewRep(false);
      setNewRep({ name: "", email: "", code: "", notes: "" });
      refetchReps();
    },
    onError: (err) => toast.error(err.message || "Failed to create rep."),
  });

  const markPaid = trpc.rep.markCommissionPaid.useMutation({
    onSuccess: () => {
      toast.success("Commission marked as paid.");
      refetchCommissions();
      refetchReport();
    },
    onError: (err) => toast.error(err.message || "Failed to update commission."),
  });

  // Auth guard
  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: C.sage }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!user || user.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <AlertCircle size={32} color={C.red} />
        <p style={{ fontFamily: C.sans, color: C.inkMid }}>Admin access required.</p>
        <button onClick={() => navigate("/dashboard")} style={{ fontFamily: C.sans, color: C.sage, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>Back to Dashboard</button>
      </div>
    );
  }

  function validateNewRep() {
    const e: Record<string, string> = {};
    if (!newRep.name.trim()) e.name = "Name is required.";
    if (!newRep.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newRep.email)) e.email = "Valid email required.";
    if (!newRep.code.trim()) e.code = "Rep code is required.";
    else if (!/^[A-Z0-9\-]+$/i.test(newRep.code)) e.code = "Letters, numbers, and hyphens only.";
    setNewRepErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCreateRep(e: React.FormEvent) {
    e.preventDefault();
    if (!validateNewRep()) return;
    createRep.mutate({ name: newRep.name.trim(), email: newRep.email.trim(), code: newRep.code.trim().toUpperCase(), notes: newRep.notes.trim() || undefined });
  }

  const fmt = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <DashboardLayout>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.rule}`, marginBottom: 32 }}>
          {(["report", "reps", "commissions"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontFamily: C.mono, fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase",
                color: activeTab === tab ? C.forest : C.inkFaint,
                padding: "10px 20px 12px",
                borderBottom: activeTab === tab ? `2px solid ${C.forest}` : "2px solid transparent",
                fontWeight: activeTab === tab ? 700 : 400,
              }}
            >
              {tab === "report" ? "Acquisition Report" : tab === "reps" ? "Sales Reps" : "Commissions"}
            </button>
          ))}
        </div>

        {/* ── REPORT TAB ─────────────────────────────────────── */}
        {activeTab === "report" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontFamily: C.serif, fontSize: "1.5rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>Acquisition Summary</h2>
              <button onClick={() => refetchReport()} style={{ background: "none", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {reportLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: C.sage }} />
              </div>
            ) : report ? (
              <>
                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
                  <StatCard label="Total Signups" value={(report.directCount ?? 0) + (report.repCount ?? 0)} sub="All subscribed agencies" accent={C.forest} />
                  <StatCard label="Direct Signups" value={report.directCount ?? 0} sub="No rep code used" accent={C.inkMid} />
                  <StatCard label="Rep-Attributed" value={report.repCount ?? 0} sub="Via sales rep code" accent={C.amber} />
                  <StatCard label="Setup Fee Revenue" value={fmt(((report.directSetupFeeRevenueCents ?? 0) + (report.repSetupFeeRevenueCents ?? 0)) / 100)} sub="$199 × paid signups" accent={C.green} />
                  <StatCard label="Commissions Owed" value={fmt((report.commissionsOwedCents ?? 0) / 100)} sub="Unpaid rep commissions" accent={C.red} />
                  <StatCard label="Commissions Paid" value={fmt((report.commissionsPaidCents ?? 0) / 100)} sub="Total paid to reps" accent={C.sage} />
                </div>

                {/* Revenue breakdown table */}
                <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 6, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.rule}`, display: "flex", alignItems: "center", gap: 8 }}>
                    <DollarSign size={15} color={C.sage} />
                    <span style={{ fontFamily: C.mono, fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkMid, fontWeight: 600 }}>Setup Fee Revenue by Source</span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                    <thead>
                      <tr style={{ background: C.linen }}>
                        {["Source", "Signups", "Setup Fee Revenue", "Commission Rate", "Commission Owed"].map(h => (
                          <th key={h} style={{ fontFamily: C.mono, fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkFaint, padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderTop: `1px solid ${C.rule}` }}>
                        <td style={{ padding: "12px 16px", fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark, fontWeight: 600 }}>Direct</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.82rem", color: C.inkMid }}>{report.directCount ?? 0}</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.82rem", color: C.inkDark }}>{fmt((report.directSetupFeeRevenueCents ?? 0) / 100)}</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.82rem", color: C.inkFaint }}>—</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.82rem", color: C.inkFaint }}>—</td>
                      </tr>
                      <tr style={{ borderTop: `1px solid ${C.rule}` }}>
                        <td style={{ padding: "12px 16px", fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark, fontWeight: 600 }}>Rep-Attributed</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.82rem", color: C.inkMid }}>{report.repCount ?? 0}</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.82rem", color: C.inkDark }}>{fmt((report.repSetupFeeRevenueCents ?? 0) / 100)}</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.82rem", color: C.inkMid }}>Per rep agreement</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.82rem", color: C.red, fontWeight: 600 }}>{fmt((report.commissionsOwedCents ?? 0) / 100)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p style={{ fontFamily: C.sans, color: C.inkLight, textAlign: "center", padding: 48 }}>No data available.</p>
            )}
          </div>
        )}

        {/* ── REPS TAB ───────────────────────────────────────── */}
        {activeTab === "reps" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontFamily: C.serif, fontSize: "1.5rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>Sales Representatives</h2>
              <button
                onClick={() => setShowNewRep(v => !v)}
                style={{ background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 4, padding: "9px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600 }}
              >
                <Plus size={14} /> Add Rep
              </button>
            </div>

            {/* New rep form */}
            {showNewRep && (
              <form onSubmit={handleCreateRep} style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 6, padding: "24px", marginBottom: 24 }}>
                <div style={{ fontFamily: C.mono, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 16 }}>New Sales Rep</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <Field label="Full Name" error={newRepErrors.name}>
                    <input value={newRep.name} onChange={e => setNewRep(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" style={iStyle(!!newRepErrors.name)} />
                  </Field>
                  <Field label="Email" error={newRepErrors.email}>
                    <input type="email" value={newRep.email} onChange={e => setNewRep(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" style={iStyle(!!newRepErrors.email)} />
                  </Field>
                  <Field label="Rep Code" error={newRepErrors.code} hint="Uppercase letters, numbers, hyphens">
                    <input value={newRep.code} onChange={e => setNewRep(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="JANE2026" maxLength={32} style={{ ...iStyle(!!newRepErrors.code), textTransform: "uppercase", letterSpacing: "0.05em" }} />
                  </Field>
                  <Field label="Notes" hint="Optional">
                    <input value={newRep.notes} onChange={e => setNewRep(p => ({ ...p, notes: e.target.value }))} placeholder="Territory, agreement details…" style={iStyle(false)} />
                  </Field>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="submit" disabled={createRep.isPending} style={{ background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 4, padding: "10px 22px", cursor: createRep.isPending ? "not-allowed" : "pointer", fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}>
                    {createRep.isPending ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : "Create Rep"}
                  </button>
                  <button type="button" onClick={() => setShowNewRep(false)} style={{ background: "none", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "10px 18px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid }}>Cancel</button>
                </div>
              </form>
            )}

            {repsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: C.sage }} />
              </div>
            ) : reps && reps.length > 0 ? (
              <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 6, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: C.linen }}>
                      {["Name", "Email", "Rep Code", "Notes", "Created"].map(h => (
                        <th key={h} style={{ fontFamily: C.mono, fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkFaint, padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reps.map((rep, i) => (
                      <tr key={rep.id} style={{ borderTop: i > 0 ? `1px solid ${C.rule}` : undefined }}>
                        <td style={{ padding: "12px 16px", fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark, fontWeight: 600 }}>{rep.name}</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.78rem", color: C.inkMid }}>{rep.email}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontFamily: C.mono, fontSize: "0.78rem", fontWeight: 700, color: C.forest, background: C.linen, border: `1px solid ${C.rule}`, borderRadius: 3, padding: "3px 8px", letterSpacing: "0.08em" }}>{rep.code}</span>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight }}>{rep.notes ?? "—"}</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.75rem", color: C.inkFaint }}>{new Date(rep.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 6, padding: "48px 24px", textAlign: "center" }}>
                <Tag size={28} color={C.inkFaint} style={{ marginBottom: 12 }} />
                <p style={{ fontFamily: C.sans, color: C.inkLight, margin: 0 }}>No sales reps yet. Add your first rep to start tracking attribution.</p>
              </div>
            )}
          </div>
        )}

        {/* ── COMMISSIONS TAB ────────────────────────────────── */}
        {activeTab === "commissions" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <h2 style={{ fontFamily: C.serif, fontSize: "1.5rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>Commission Records</h2>
              <button onClick={() => refetchCommissions()} style={{ background: "none", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "7px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid }}>
                <RefreshCw size={13} /> Refresh
              </button>
            </div>

            {commissionsLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite", color: C.sage }} />
              </div>
            ) : commissions && commissions.length > 0 ? (
              <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 6, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                  <thead>
                    <tr style={{ background: C.linen }}>
                      {["Rep", "Agency", "Rep Code", "Amount", "Status", "Date", "Action"].map(h => (
                        <th key={h} style={{ fontFamily: C.mono, fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkFaint, padding: "10px 16px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c: any, i: number) => (
                      <tr key={c.id} style={{ borderTop: i > 0 ? `1px solid ${C.rule}` : undefined }}>
                        <td style={{ padding: "12px 16px", fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark, fontWeight: 600 }}>{c.repName ?? "—"}</td>
                        <td style={{ padding: "12px 16px", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid }}>{c.agencyName ?? c.userEmail ?? "—"}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontFamily: C.mono, fontSize: "0.75rem", fontWeight: 700, color: C.forest, background: C.linen, border: `1px solid ${C.rule}`, borderRadius: 3, padding: "3px 8px", letterSpacing: "0.06em" }}>{c.repCode}</span>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.82rem", color: C.inkDark, fontWeight: 600 }}>{fmt((c.amount ?? 0) / 100)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{
                            fontFamily: C.mono, fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase",
                            fontWeight: 700, padding: "3px 8px", borderRadius: 3,
                            background: c.status === "paid" ? "#E8F5E9" : C.amberBg,
                            color: c.status === "paid" ? C.green : C.amber,
                          }}>
                            {c.status === "paid" ? "Paid" : "Owed"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: C.mono, fontSize: "0.75rem", color: C.inkFaint }}>{new Date(c.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: "12px 16px" }}>
                          {c.status !== "paid" ? (
                            <button
                              onClick={() => markPaid.mutate({ commissionId: c.id })}
                              disabled={markPaid.isPending}
                              style={{ background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 3, padding: "6px 12px", cursor: markPaid.isPending ? "not-allowed" : "pointer", fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}
                            >
                              <CheckCircle size={12} /> Mark Paid
                            </button>
                          ) : (
                            <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 6, padding: "48px 24px", textAlign: "center" }}>
                <DollarSign size={28} color={C.inkFaint} style={{ marginBottom: 12 }} />
                <p style={{ fontFamily: C.sans, color: C.inkLight, margin: 0 }}>No commission records yet. They appear here after rep-attributed checkouts complete.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </DashboardLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, color: C.inkMid, marginBottom: 6 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: C.inkFaint, marginLeft: 4 }}>— {hint}</span>}
      </label>
      {children}
      {error && <p style={{ fontFamily: C.sans, fontSize: "0.73rem", color: C.red, marginTop: 4 }}>{error}</p>}
    </div>
  );
}

function iStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "9px 12px",
    fontFamily: C.sans,
    fontSize: "0.85rem",
    color: "#1A1A1A",
    background: "#FDFAF6",
    border: `1px solid ${hasError ? C.red : "#E2D9CE"}`,
    borderRadius: 4,
    outline: "none",
  };
}
