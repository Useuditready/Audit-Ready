import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Plus,
  Search,
  Users,
  ChevronRight,
  Shield,
  AlertTriangle,
  XCircle,
  Filter,
  X,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  History,
  UserMinus,
} from "lucide-react";
import { toast } from "sonner";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  forest: "#1D3D2F",
  forestMid: "#2A5240",
  sage: "#3D6B52",
  amber: "#C4862A",
  amberLight: "#E8A94A",
  parchment: "#F7F3ED",
  cream: "#FDFAF6",
  linen: "#EFE9E0",
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

type StaffStatus = "active" | "inactive" | "terminated";

type StaffMember = {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  hireDate: string | null;
  status: "active" | "inactive" | "terminated";
  createdAt: Date;
  updatedAt: Date;
};

export default function Staff() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StaffStatus | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [deletingStaffId, setDeletingStaffId] = useState<number | null>(null);
  const [markingInactiveId, setMarkingInactiveId] = useState<number | null>(null);
  const [retentionBlock, setRetentionBlock] = useState<{ inactivatedAt: string; retentionExpiresAt: string } | null>(null);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);
  const deleteMutation = trpc.staff.delete.useMutation();
  const markInactiveMutation = trpc.staff.markInactive.useMutation();

  const { data: staffList, isLoading, refetch } = trpc.staff.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: allCredentials } = trpc.credentials.listAll.useQuery(undefined, {
    enabled: !!user,
  });

  // Compute credential counts per staff member
  const credentialCountByStaff = (allCredentials ?? []).reduce<
    Record<number, { total: number; current: number; expiring: number; expired: number }>
  >((acc, cred) => {
    if (!acc[cred.staffId]) acc[cred.staffId] = { total: 0, current: 0, expiring: 0, expired: 0 };
    acc[cred.staffId].total++;
    if (cred.status === "current") acc[cred.staffId].current++;
    if (cred.status === "expiring_soon") acc[cred.staffId].expiring++;
    if (cred.status === "expired") acc[cred.staffId].expired++;
    return acc;
  }, {});

  // Filter staff
  const filtered = (staffList ?? []).filter((s) => {
    const matchesSearch =
      search === "" ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
      (s.role ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.email ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        {/* Title + Add button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: C.serif, fontSize: "2rem", fontWeight: 700, color: C.inkDark, letterSpacing: "-0.02em", margin: 0 }}>
              Staff Directory
            </h1>
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, marginTop: 6 }}>
              {filtered.length} staff member{filtered.length !== 1 ? "s" : ""}
              {statusFilter !== "all" && ` (${statusFilter})`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href="/imports"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "transparent", color: C.inkMid,
                border: `1px solid ${C.rule}`,
                borderRadius: 4, padding: "10px 18px", cursor: "pointer",
                fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <History size={15} /> Import History
            </a>
            <a
              href="/staff/import"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "transparent", color: C.forest,
                border: `1px solid ${C.forest}`,
                borderRadius: 4, padding: "10px 18px", cursor: "pointer",
                fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <Upload size={15} /> Import CSV
            </a>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: C.forest, color: "#F0EBE3", border: "none",
                borderRadius: 4, padding: "10px 20px", cursor: "pointer",
                fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
                transition: "background 150ms",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.forestMid)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.forest)}
            >
              <Plus size={16} /> Add Staff Member
            </button>
          </div>
        </div>

        {/* Search + Filter bar */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
            <Search size={16} color={C.inkFaint} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search by name, role, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px 10px 38px",
                border: `1px solid ${C.rule}`, borderRadius: 4,
                fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark,
                background: C.cream, outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={14} color={C.inkFaint} />
            {(["all", "active", "inactive", "terminated"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "6px 14px", borderRadius: 3, border: "none", cursor: "pointer",
                  fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize",
                  background: statusFilter === s ? C.forest : C.linen,
                  color: statusFilter === s ? "#F0EBE3" : C.inkMid,
                  transition: "all 150ms",
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Table */}
        {/* Inactive retention info banner */}
        {statusFilter === "inactive" && (
          <div style={{ background: "#FEF3CD", border: `1px solid ${C.amberLight}`, borderRadius: 4, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <UserMinus size={14} color={C.amber} style={{ flexShrink: 0 }} />
            <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, margin: 0, lineHeight: 1.5 }}>
              <strong>2-Year Retention Policy:</strong> Inactive staff records are retained for 2 years from their inactivation date. Permanent deletion is only available after the retention period expires.
            </p>
          </div>
        )}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: 60 }}>
            <Loader2 size={28} color={C.forest} className="animate-spin" style={{ margin: "0 auto" }} />
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, marginTop: 12 }}>Loading staff...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4 }}>
            <Users size={40} color={C.inkFaint} style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: C.serif, fontSize: "1.3rem", color: C.inkDark, marginBottom: 8 }}>
              {search || statusFilter !== "all" ? "No matching staff found" : "No staff members yet"}
            </h3>
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, marginBottom: 20 }}>
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "Add your first staff member to start tracking credentials."}
            </p>
            {!search && statusFilter === "all" && (
              <button
                onClick={() => setShowAddModal(true)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: C.forest, color: "#F0EBE3", border: "none",
                  borderRadius: 4, padding: "10px 20px", cursor: "pointer",
                  fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
                }}
              >
                <Plus size={16} /> Add Staff Member
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
          <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4, overflow: "hidden", minWidth: 620 }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: statusFilter === "inactive" ? "2fr 1fr 1fr 1fr 72px" : "2fr 1fr 1fr 80px 72px",
              padding: "12px 20px", background: C.linen, borderBottom: `1px solid ${C.rule}`,
              gap: 12,
            }}>
              <span style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Name</span>
              <span style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Role</span>
              {statusFilter === "inactive" ? (
                <>
                  <span style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Inactivated</span>
                  <span style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Eligible for Deletion</span>
                </>
              ) : (
                <>
                  <span style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Credentials</span>
                  <span style={{ fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint }}>Status</span>
                </>
              )}
              <span />
            </div>

            {/* Table rows */}
            {filtered.map((member) => {
              const creds = credentialCountByStaff[member.id] ?? { total: 0, current: 0, expiring: 0, expired: 0 };
              // Compute retention dates for inactive members
              const inactivatedAt = (member as any).inactivatedAt ? new Date((member as any).inactivatedAt) : null;
              const retentionExpiresAt = inactivatedAt ? new Date(inactivatedAt.getTime() + 2 * 365 * 24 * 60 * 60 * 1000) : null;
              const isDeletionEligible = retentionExpiresAt ? Date.now() >= retentionExpiresAt.getTime() : true;
              return (
                <div
                  key={member.id}
                  onClick={() => navigate(`/staff/${member.id}`)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: statusFilter === "inactive" ? "2fr 1fr 1fr 1fr 72px" : "2fr 1fr 1fr 80px 72px",
                    padding: "14px 20px", borderBottom: `1px solid ${C.rule}`,
                    cursor: "pointer", transition: "background 120ms", gap: 12, alignItems: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.parchment)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Name + email */}
                  <div>
                    <div style={{ fontFamily: C.sans, fontSize: "0.9rem", fontWeight: 600, color: C.inkDark }}>
                      {member.firstName} {member.lastName}
                    </div>
                    {member.email && (
                      <div style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight, marginTop: 2 }}>
                        {member.email}
                      </div>
                    )}
                  </div>

                  {/* Role */}
                  <div style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid }}>
                    {member.role || "—"}
                  </div>

                  {/* Credential badges OR Inactive retention columns */}
                  {statusFilter === "inactive" ? (
                    <>
                      {/* Inactivated date */}
                      <div style={{ fontFamily: C.mono, fontSize: "0.78rem", color: C.inkMid }}>
                        {inactivatedAt ? inactivatedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : <span style={{ color: C.inkFaint }}>—</span>}
                      </div>
                      {/* Deletion-eligible date */}
                      <div>
                        {retentionExpiresAt ? (
                          <span style={{
                            fontFamily: C.mono, fontSize: "0.75rem", fontWeight: 600,
                            padding: "2px 8px", borderRadius: 3,
                            background: isDeletionEligible ? "rgba(58,140,92,0.1)" : "rgba(196,134,42,0.12)",
                            color: isDeletionEligible ? C.green : C.amber,
                          }}>
                            {isDeletionEligible ? "Eligible now" : retentionExpiresAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        ) : (
                          <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.green }}>Eligible now</span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        {creds.total === 0 ? (
                          <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint }}>None</span>
                        ) : (
                          <>
                            {creds.current > 0 && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(58,140,92,0.1)", color: C.green, padding: "2px 8px", borderRadius: 3, fontSize: "0.72rem", fontWeight: 600, fontFamily: C.mono }}>
                                <Shield size={10} /> {creds.current}
                              </span>
                            )}
                            {creds.expiring > 0 && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(196,134,42,0.12)", color: C.amber, padding: "2px 8px", borderRadius: 3, fontSize: "0.72rem", fontWeight: 600, fontFamily: C.mono }}>
                                <AlertTriangle size={10} /> {creds.expiring}
                              </span>
                            )}
                            {creds.expired > 0 && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(184,64,64,0.1)", color: C.red, padding: "2px 8px", borderRadius: 3, fontSize: "0.72rem", fontWeight: 600, fontFamily: C.mono }}>
                                <XCircle size={10} /> {creds.expired}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div>
                        <span style={{
                          fontFamily: C.sans, fontSize: "0.7rem", fontWeight: 600, textTransform: "capitalize",
                          padding: "3px 10px", borderRadius: 3,
                          background: member.status === "active" ? "rgba(58,140,92,0.1)" : member.status === "inactive" ? C.linen : "rgba(184,64,64,0.08)",
                          color: member.status === "active" ? C.green : member.status === "inactive" ? C.inkFaint : C.red,
                        }}>
                          {member.status}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditingStaff(member as StaffMember)}
                      title="Edit"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.inkFaint, display: "flex", alignItems: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = C.forest)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.inkFaint)}
                    >
                      <Pencil size={14} />
                    </button>
                    {member.status === "active" && (
                      <button
                        onClick={() => setMarkingInactiveId(member.id)}
                        title="Mark as Inactive"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.inkFaint, display: "flex", alignItems: "center" }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = C.amber)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = C.inkFaint)}
                      >
                        <UserMinus size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => { setDeletingStaffId(member.id); setRetentionBlock(null); setOverrideConfirmed(false); }}
                      title="Delete"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.inkFaint, display: "flex", alignItems: "center" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.inkFaint)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>

      {/* ── Policy Footer ─────────────────────────────────── */}
      <div style={{ marginTop: 32, padding: "12px 0", borderTop: `1px solid ${C.rule}`, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, margin: 0, lineHeight: 1.6, maxWidth: 560 }}>
          All changes to staff records are logged with your name and timestamp for compliance purposes.
          AuditReady does not store patient health information (PHI).
          By using AuditReady you agree to our{" "}
          <a href="/terms" style={{ color: C.sage }}>Terms of Service</a> and{" "}
          <a href="/privacy" style={{ color: C.sage }}>Privacy Policy</a>.
        </p>
        <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
          <a href="/privacy" style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, textDecoration: "none" }}>Privacy</a>
          <a href="/terms" style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, textDecoration: "none" }}>Terms</a>
        </div>
      </div>

      {/* ── Add Staff Modal ────────────────────────────────── */}
      {showAddModal && <AddStaffModal onClose={() => setShowAddModal(false)} onSuccess={() => { refetch(); setShowAddModal(false); }} />}

      {/* ── Edit Staff Modal ───────────────────────────────── */}
      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onSuccess={() => { refetch(); setEditingStaff(null); }}
        />
      )}

      {/* ── Mark as Inactive Confirmation ─────────────────── */}
      {markingInactiveId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.5)", backdropFilter: "blur(4px)" }} onClick={() => setMarkingInactiveId(null)} />
          <div style={{ position: "relative", background: C.parchment, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "32px", width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(28,25,23,0.2)" }}>
            <h2 style={{ fontFamily: C.serif, fontSize: "1.3rem", fontWeight: 700, color: C.inkDark, marginBottom: 12 }}>Mark as Inactive?</h2>
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, marginBottom: 8, lineHeight: 1.6 }}>
              This staff member will be marked as <strong>inactive</strong>. Their full credential history will be retained for <strong>2 years</strong> in compliance with record-keeping requirements.
            </p>
            <div style={{ background: "#FEF3CD", border: `1px solid ${C.amberLight}`, borderRadius: 4, padding: "10px 14px", marginBottom: 24 }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, margin: 0, lineHeight: 1.55 }}>
                <strong>Retention policy:</strong> Records will be retained until {new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} and then become eligible for permanent deletion.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setMarkingInactiveId(null)}
                style={{ padding: "10px 20px", border: `1px solid ${C.rule}`, borderRadius: 4, background: "transparent", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await markInactiveMutation.mutateAsync({ id: markingInactiveId! });
                    toast.success("Staff member marked as inactive. Records retained for 2 years.");
                    refetch();
                  } catch {
                    toast.error("Failed to mark staff member as inactive.");
                  } finally {
                    setMarkingInactiveId(null);
                  }
                }}
                disabled={markInactiveMutation.isPending}
                style={{ padding: "10px 20px", border: "none", borderRadius: 4, background: C.amber, color: "#fff", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
              >
                {markInactiveMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Mark Inactive
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Delete Confirmation ────────────────────────────── */}
      {deletingStaffId !== null && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.5)", backdropFilter: "blur(4px)" }} onClick={() => { setDeletingStaffId(null); setRetentionBlock(null); setOverrideConfirmed(false); }} />
          <div style={{ position: "relative", background: C.parchment, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "32px", width: "100%", maxWidth: 440, boxShadow: "0 24px 64px rgba(28,25,23,0.2)" }}>
            <h2 style={{ fontFamily: C.serif, fontSize: "1.3rem", fontWeight: 700, color: C.inkDark, marginBottom: 12 }}>Permanently Delete Staff Member?</h2>
            {retentionBlock ? (
              <>
                <div style={{ background: "rgba(184,64,64,0.07)", border: `1px solid ${C.red}`, borderRadius: 4, padding: "12px 14px", marginBottom: 16 }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.red, margin: 0, fontWeight: 600, marginBottom: 4 }}>Retention Period Active</p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, margin: 0, lineHeight: 1.55 }}>
                    This staff member was inactivated on <strong>{new Date(retentionBlock.inactivatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong>. Records should be retained until <strong>{new Date(retentionBlock.retentionExpiresAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong> for compliance purposes.
                  </p>
                </div>
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 24, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={overrideConfirmed}
                    onChange={(e) => setOverrideConfirmed(e.target.checked)}
                    style={{ marginTop: 2, accentColor: C.red, flexShrink: 0 }}
                  />
                  <span style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.inkMid, lineHeight: 1.5 }}>
                    I understand this deletes all records before the retention period ends and accept responsibility for this compliance exception.
                  </span>
                </label>
              </>
            ) : (
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, marginBottom: 24, lineHeight: 1.6 }}>
                This will permanently delete this staff member and all their credentials. This action cannot be undone.
              </p>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => { setDeletingStaffId(null); setRetentionBlock(null); setOverrideConfirmed(false); }}
                style={{ padding: "10px 20px", border: `1px solid ${C.rule}`, borderRadius: 4, background: "transparent", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await deleteMutation.mutateAsync({ id: deletingStaffId!, overrideRetention: overrideConfirmed });
                    toast.success("Staff member permanently deleted.");
                    refetch();
                    setDeletingStaffId(null);
                    setRetentionBlock(null);
                    setOverrideConfirmed(false);
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : "";
                    if (msg.includes("RETENTION_BLOCK:")) {
                      const parts = msg.replace("RETENTION_BLOCK:", "").split(":");
                      setRetentionBlock({ inactivatedAt: parts[0] ?? "", retentionExpiresAt: parts[1] ?? "" });
                    } else {
                      toast.error("Failed to delete staff member.");
                    }
                  }
                }}
                disabled={deleteMutation.isPending || (retentionBlock !== null && !overrideConfirmed)}
                style={{ padding: "10px 20px", border: "none", borderRadius: 4, background: C.red, color: "#fff", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, cursor: retentionBlock && !overrideConfirmed ? "not-allowed" : "pointer", opacity: retentionBlock && !overrideConfirmed ? 0.5 : 1, display: "flex", alignItems: "center", gap: 8 }}
              >
                {deleteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                {retentionBlock ? "Delete Anyway" : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ── Add Staff Modal Component ─────────────────────────────────
function AddStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [hireDate, setHireDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const createMutation = trpc.staff.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: role.trim() || undefined,
        hireDate: hireDate || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to add staff member.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${C.rule}`, borderRadius: 4,
    fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark,
    background: C.cream, outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600,
    color: C.inkMid, marginBottom: 4, display: "block",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: C.parchment, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "32px", width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(28,25,23,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: C.serif, fontSize: "1.4rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>Add Staff Member</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color={C.inkLight} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Smith" />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@clinic.com" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(919) 555-0123" />
            </div>
            <div>
              <label style={labelStyle}>Role / Title</label>
              <input style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} placeholder="BCBA, RBT, LCSW..." />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Hire Date</label>
            <input style={inputStyle} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
          </div>

          {error && (
            <div style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.red, marginBottom: 16, padding: "8px 12px", background: "rgba(184,64,64,0.06)", borderRadius: 3 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{
              padding: "10px 20px", border: `1px solid ${C.rule}`, borderRadius: 4,
              background: "transparent", fontFamily: C.sans, fontSize: "0.82rem",
              color: C.inkMid, cursor: "pointer",
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              padding: "10px 24px", border: "none", borderRadius: 4,
              background: C.forest, color: "#F0EBE3",
              fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Adding..." : "Add Staff Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Staff Modal Component ────────────────────────────────
function EditStaffModal({ staff, onClose, onSuccess }: { staff: StaffMember; onClose: () => void; onSuccess: () => void }) {
  const [firstName, setFirstName] = useState(staff.firstName);
  const [lastName, setLastName] = useState(staff.lastName);
  const [email, setEmail] = useState(staff.email ?? "");
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [role, setRole] = useState(staff.role ?? "");
  const [hireDate, setHireDate] = useState(staff.hireDate ?? "");
  const [status, setStatus] = useState<"active" | "inactive" | "terminated">(staff.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateMutation = trpc.staff.update.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateMutation.mutateAsync({
        id: staff.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        role: role.trim() || undefined,
        hireDate: hireDate || undefined,
        status,
      });
      toast.success("Staff member updated.");
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to update staff member.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${C.rule}`, borderRadius: 4,
    fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark,
    background: C.cream, outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600,
    color: C.inkMid, marginBottom: 4, display: "block",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: C.parchment, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "32px", width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(28,25,23,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: C.serif, fontSize: "1.4rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>Edit Staff Member</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color={C.inkLight} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>First Name *</label>
              <input style={inputStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Last Name *</label>
              <input style={inputStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Role / Title</label>
              <input style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} placeholder="BCBA, RBT, LCSW..." />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Hire Date</label>
              <input style={inputStyle} type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive" | "terminated")}
                style={{ ...inputStyle, cursor: "pointer" }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.red, marginBottom: 16, padding: "8px 12px", background: "rgba(184,64,64,0.06)", borderRadius: 3 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{
              padding: "10px 20px", border: `1px solid ${C.rule}`, borderRadius: 4,
              background: "transparent", fontFamily: C.sans, fontSize: "0.82rem",
              color: C.inkMid, cursor: "pointer",
            }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} style={{
              padding: "10px 24px", border: "none", borderRadius: 4,
              background: C.forest, color: "#F0EBE3",
              fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
