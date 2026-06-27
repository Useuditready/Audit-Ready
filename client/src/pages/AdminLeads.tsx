/**
 * AdminLeads — Pilot Requests & Demo Requests management panel.
 * Only accessible to the owner (admin role).
 * Allows reviewing, approving, and rejecting pilot signups.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Users, Mail, Building2, ArrowLeft, RefreshCw } from "lucide-react";
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
};

type PilotStatus = "pending" | "approved" | "rejected";

function StatusBadge({ status }: { status: PilotStatus }) {
  const config = {
    pending: { bg: "#FEF3CD", color: C.amber, label: "Pending Review" },
    approved: { bg: "#E8F5E9", color: "#2E7D32", label: "Approved" },
    rejected: { bg: "#FEECEC", color: C.red, label: "Rejected" },
  }[status];
  return (
    <span style={{
      display: "inline-block",
      background: config.bg,
      color: config.color,
      fontFamily: C.sans,
      fontSize: "0.7rem",
      fontWeight: 700,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "3px 10px",
      borderRadius: 3,
    }}>
      {config.label}
    </span>
  );
}

function formatDate(d: Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminLeads() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<"pilots" | "demos">("pilots");

  const { data: pilots, isLoading: pilotsLoading, refetch: refetchPilots } = trpc.pilot.listAll.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const { data: demos, isLoading: demosLoading, refetch: refetchDemos } = trpc.demo.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const { data: aiUsageAll } = trpc.ai.getAllUsage.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    staleTime: 60_000,
  });
  // Build a map of email -> usage for quick lookup
  const aiUsageMap = new Map((aiUsageAll ?? []).map((u: any) => [u.email, u]));

  const activateMutation = trpc.pilot.activate.useMutation({
    onSuccess: () => {
      toast.success("Pilot activated — activation email sent to the agency.");
      refetchPilots();
    },
    onError: (err) => toast.error(`Activation failed: ${err.message}`),
  });

  const rejectMutation = trpc.pilot.reject.useMutation({
    onSuccess: () => {
      toast.success("Pilot request rejected.");
      refetchPilots();
    },
    onError: (err) => toast.error(`Rejection failed: ${err.message}`),
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: C.sans, color: C.inkFaint }}>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: C.sans, color: C.red, fontWeight: 600 }}>Access denied. Admin only.</p>
          <button onClick={() => navigate("/")} style={{ marginTop: 12, fontFamily: C.sans, color: C.sage, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
            Return to homepage
          </button>
        </div>
      </div>
    );
  }

  const pendingPilots = pilots?.filter(p => p.status === "pending") ?? [];
  const allPilots = pilots ?? [];
  const allDemos = demos ?? [];

  return (
    <DashboardLayout>
      {/* Header */}


      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.rule}`, marginBottom: 32 }}>
          {(["pilots", "demos"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: "none",
                border: "none",
                borderBottom: activeTab === tab ? `2px solid ${C.forest}` : "2px solid transparent",
                cursor: "pointer",
                fontFamily: C.sans,
                fontSize: "0.85rem",
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? C.forest : C.inkLight,
                padding: "10px 20px",
                marginBottom: -1,
                letterSpacing: "0.02em",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {tab === "pilots" ? <Users size={14} /> : <Mail size={14} />}
              {tab === "pilots" ? `Pilot Signups (${allPilots.length})` : `Demo Requests (${allDemos.length})`}
            </button>
          ))}
          <button
            onClick={() => { refetchPilots(); refetchDemos(); }}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: C.inkFaint, display: "flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: "0.78rem", padding: "10px 12px" }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {/* Pilots Tab */}
        {activeTab === "pilots" && (
          <div>
            {pilotsLoading ? (
              <p style={{ color: C.inkFaint, fontFamily: C.sans }}>Loading pilot signups…</p>
            ) : allPilots.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <Users size={32} color={C.inkFaint} style={{ margin: "0 auto 12px" }} />
                <p style={{ color: C.inkFaint, fontFamily: C.sans, fontSize: "0.9rem" }}>No pilot signups yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {allPilots.map((pilot: any) => (
                  <div
                    key={pilot.id}
                    style={{
                      background: "#fff",
                      border: `1px solid ${pilot.status === "pending" ? C.amber : C.rule}`,
                      borderLeft: `4px solid ${pilot.status === "pending" ? C.amber : pilot.status === "approved" ? "#2E7D32" : C.red}`,
                      borderRadius: 4,
                      padding: "20px 24px",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 20,
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <p style={{ margin: 0, fontFamily: C.sans, fontSize: "1rem", fontWeight: 700, color: C.inkDark }}>{pilot.name}</p>
                        <StatusBadge status={pilot.status as PilotStatus} />
                      </div>
                      <p style={{ margin: "0 0 4px", fontFamily: C.sans, fontSize: "0.85rem", color: C.sage }}>
                        <Building2 size={12} style={{ display: "inline", marginRight: 4 }} />{pilot.agencyName}
                      </p>
                      <p style={{ margin: "0 0 4px", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight }}>
                        <Mail size={12} style={{ display: "inline", marginRight: 4 }} />
                        <a href={`mailto:${pilot.email}`} style={{ color: C.sage }}>{pilot.email}</a>
                      </p>
                      {pilot.agencySize && (
                        <p style={{ margin: "0 0 4px", fontFamily: C.sans, fontSize: "0.78rem", color: C.inkFaint }}>
                          Staff size: {pilot.agencySize}
                        </p>
                      )}
                      {pilot.plan && (
                        <p style={{ margin: "0 0 4px", fontFamily: C.sans, fontSize: "0.78rem", color: C.inkFaint }}>
                          Plan interest: {pilot.plan}
                        </p>
                      )}
                      {(() => {
                        const u = aiUsageMap.get(pilot.email) as any;
                        if (!u) return null;
                        const pct = Math.min((u.questionCount / u.limit) * 100, 100);
                        const chipColor = pct >= 100 ? C.red : pct >= 80 ? C.amber : C.sage;
                        return (
                          <p style={{ margin: "4px 0 0", fontFamily: C.sans, fontSize: "0.75rem", color: chipColor, fontWeight: 600 }}>
                            AI: {u.questionCount}/{u.limit} questions used
                          </p>
                        );
                      })()}
                      <p style={{ margin: "4px 0 0", fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint }}>
                        <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
                        Submitted {formatDate(pilot.createdAt)}
                        {pilot.reviewedAt && ` · Reviewed ${formatDate(pilot.reviewedAt)}`}
                      </p>
                    </div>

                    {/* Actions */}
                    {pilot.status === "pending" && (
                      <div style={{ display: "flex", gap: 8, flexShrink: 0, alignSelf: "center" }}>
                        <Button
                          size="sm"
                          onClick={() => activateMutation.mutate({
                            pilotSignupId: pilot.id,
                            userEmail: pilot.email,
                            userName: pilot.name,
                            agencyName: pilot.agencyName,
                          })}
                          disabled={activateMutation.isPending}
                          style={{ background: C.forest, color: "#F0EBE3", fontFamily: C.sans, fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <CheckCircle size={13} /> Approve & Activate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rejectMutation.mutate({ pilotSignupId: pilot.id })}
                          disabled={rejectMutation.isPending}
                          style={{ borderColor: C.red, color: C.red, fontFamily: C.sans, fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6 }}
                        >
                          <XCircle size={13} /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Demos Tab */}
        {activeTab === "demos" && (
          <div>
            {demosLoading ? (
              <p style={{ color: C.inkFaint, fontFamily: C.sans }}>Loading demo requests…</p>
            ) : allDemos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <Mail size={32} color={C.inkFaint} style={{ margin: "0 auto 12px" }} />
                <p style={{ color: C.inkFaint, fontFamily: C.sans, fontSize: "0.9rem" }}>No demo requests yet.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {allDemos.map((demo: any) => (
                  <div
                    key={demo.id}
                    style={{
                      background: "#fff",
                      border: `1px solid ${C.rule}`,
                      borderLeft: `4px solid ${C.sage}`,
                      borderRadius: 4,
                      padding: "20px 24px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <p style={{ margin: "0 0 4px", fontFamily: C.sans, fontSize: "1rem", fontWeight: 700, color: C.inkDark }}>{demo.name}</p>
                        <p style={{ margin: "0 0 4px", fontFamily: C.sans, fontSize: "0.85rem", color: C.sage }}>
                          <Building2 size={12} style={{ display: "inline", marginRight: 4 }} />{demo.agencyName}
                        </p>
                        <p style={{ margin: "0 0 4px", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight }}>
                          <Mail size={12} style={{ display: "inline", marginRight: 4 }} />
                          <a href={`mailto:${demo.email}`} style={{ color: C.sage }}>{demo.email}</a>
                        </p>
                        {demo.agencySize && (
                          <p style={{ margin: "0 0 4px", fontFamily: C.sans, fontSize: "0.78rem", color: C.inkFaint }}>Staff size: {demo.agencySize}</p>
                        )}
                        {demo.message && (
                          <p style={{ margin: "8px 0 0", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid, background: C.parchment, padding: "8px 12px", borderRadius: 3, borderLeft: `3px solid ${C.rule}` }}>
                            "{demo.message}"
                          </p>
                        )}
                        <p style={{ margin: "8px 0 0", fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint }}>
                          <Clock size={11} style={{ display: "inline", marginRight: 4 }} />
                          Submitted {formatDate(demo.createdAt)}
                        </p>
                      </div>
                      <div style={{ flexShrink: 0, alignSelf: "center" }}>
                        <a
                          href={`mailto:${demo.email}?subject=AuditReady Demo Request — ${demo.agencyName}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            background: C.forest,
                            color: "#F0EBE3",
                            fontFamily: C.sans,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            textDecoration: "none",
                            padding: "8px 16px",
                            borderRadius: 3,
                          }}
                        >
                          <Mail size={13} /> Reply via Email
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
        </DashboardLayout>
  );
}
