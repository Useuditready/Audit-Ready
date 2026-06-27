import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft,
  Plus,
  Shield,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Calendar,
  FileText,
  X,
  Loader2,
  Trash2,
  ExternalLink,
  Clock,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  User,
  Mail,
  Phone,
  Briefcase,
  Sparkles,
  MessageCircle,
  Pencil,
  History,
  UserMinus,
  AlertCircle,
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

const MONOGRAM_URL = "/manus-storage/auditready-monogram-v2_0b7ecdd4.png";

const CREDENTIAL_CATEGORIES = [
  { value: "license", label: "License" },
  { value: "certification", label: "Certification" },
  { value: "training", label: "Training" },
  { value: "background_check", label: "Background Check" },
  { value: "sex_offender_registry", label: "Sex Offender Registry Check" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
] as const;

function getStatusColor(status: string) {
  switch (status) {
    case "current": return { bg: "rgba(58,140,92,0.1)", color: C.green, icon: Shield };
    case "expiring_soon": return { bg: "rgba(196,134,42,0.12)", color: C.amber, icon: AlertTriangle };
    case "expired": return { bg: "rgba(184,64,64,0.1)", color: C.red, icon: XCircle };
    default: return { bg: C.linen, color: C.inkFaint, icon: CheckCircle };
  }
}

function getVerificationBadge(status: string) {
  switch (status) {
    case "verified":
      return { label: "Verified", bg: "rgba(58,140,92,0.1)", color: C.green, icon: CheckCircle };
    case "needs_review":
      return { label: "Needs Review", bg: "rgba(196,134,42,0.12)", color: C.amber, icon: AlertTriangle };
    case "not_found":
      return { label: "Not Found", bg: "rgba(184,64,64,0.1)", color: C.red, icon: XCircle };
    case "manual_review_required":
      return { label: "Manual Review Required", bg: "rgba(100,100,100,0.08)", color: C.inkMid, icon: Clock };
    default: // not_checked
      return { label: "Not Checked", bg: C.linen, color: C.inkFaint, icon: Clock };
  }
}

type CredentialRecord = {
  id: number;
  staffId: number;
  userId: number;
  type: string;
  category: "license" | "certification" | "training" | "background_check" | "sex_offender_registry" | "insurance" | "other";
  issuingBody: string | null;
  licenseNumber: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  status: "current" | "expiring_soon" | "expired" | "not_applicable";
  documentLink: string | null;
  notes: string | null;
  verificationStatus: "not_checked" | "verified" | "needs_review" | "not_found" | "manual_review_required";
  documentLocationType: "none" | "paper" | "google_drive" | "dropbox" | "sharepoint" | "hr_system" | "ehr_system" | "other" | null;
  documentLocationNote: string | null;
  verifiedBy: string | null;
  verificationDate: Date | null;
  verificationNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTimestamp(ts: Date | string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function StaffDetail() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [, params] = useRoute("/staff/:id");
  const staffId = params?.id ? parseInt(params.id, 10) : null;

  const [showAddCredential, setShowAddCredential] = useState(false);
  const [editingCredential, setEditingCredential] = useState<CredentialRecord | null>(null);
  const [renewScrollToUpload, setRenewScrollToUpload] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  const { data: staffMember, isLoading: staffLoading } = trpc.staff.getById.useQuery(
    { id: staffId! },
    { enabled: !!user && !!staffId }
  );

  const { data: credentialsList, isLoading: credsLoading, refetch: refetchCreds } = trpc.credentials.listByStaff.useQuery(
    { staffId: staffId! },
    { enabled: !!user && !!staffId }
  );

  const deleteMutation = trpc.credentials.delete.useMutation();
  const verifyMutation = trpc.credentials.verify.useMutation();
  const markInactiveMutation = trpc.staff.markInactive.useMutation();
  const deleteStaffMutation = trpc.staff.delete.useMutation();
  const [showDeleteStaff, setShowDeleteStaff] = useState(false);
  const [deleteOverride, setDeleteOverride] = useState(false);

  const handleDeleteCredential = async (credId: number) => {
    if (!confirm("Are you sure you want to delete this credential?")) return;
    try {
      await deleteMutation.mutateAsync({ id: credId });
      refetchCreds();
      toast.success("Credential deleted.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete credential.");
    }
  };

  const handleVerify = async (credId: number, status: "not_checked" | "verified" | "needs_review" | "not_found" | "manual_review_required", notes?: string) => {
    setVerifyingId(credId);
    try {
      await verifyMutation.mutateAsync({ id: credId, verificationStatus: status, verificationNotes: notes });
      refetchCreds();
      const labels: Record<string, string> = {
        verified: "Verified",
        needs_review: "Flagged for Review",
        not_found: "Marked Not Found",
        manual_review_required: "Marked Manual Review Required",
        not_checked: "Reset to Not Checked",
      };
      toast.success(`Credential ${labels[status] ?? status}.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update verification status.");
    } finally {
      setVerifyingId(null);
    }
  };

  if (authLoading || staffLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.parchment }}>
        <Loader2 size={32} color={C.forest} className="animate-spin" />
      </div>
    );
  }

  if (!staffMember) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.parchment, fontFamily: C.sans }}>
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontFamily: C.serif, fontSize: "1.5rem", color: C.inkDark }}>Staff member not found</h2>
          <button onClick={() => navigate("/staff")} style={{ marginTop: 16, background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 4, padding: "10px 20px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600 }}>
            Back to Staff
          </button>
        </div>
      </div>
    );
  }

  const credStats = (credentialsList ?? []).reduce(
    (acc, c) => {
      acc.total++;
      if (c.status === "current") acc.current++;
      if (c.status === "expiring_soon") acc.expiring++;
      if (c.status === "expired") acc.expired++;
      return acc;
    },
    { total: 0, current: 0, expiring: 0, expired: 0 }
  );

  return (
    <DashboardLayout>
      <PilotStatusBanner />
      <EmailVerificationBanner />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Back button */}
        <button
          onClick={() => navigate("/staff")}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight, marginBottom: 24, padding: 0 }}
        >
          <ArrowLeft size={16} /> Back to Staff Directory
        </button>

        {/* ── Staff Info Card ──────────────────────────────── */}
        <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "28px 32px", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
            <div>
              <h1 style={{ fontFamily: C.serif, fontSize: "1.8rem", fontWeight: 700, color: C.inkDark, letterSpacing: "-0.02em", margin: 0, textTransform: "capitalize" }}>
                {staffMember.firstName} {staffMember.lastName}
              </h1>
              <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
                {staffMember.role && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid }}>
                    <Briefcase size={14} color={C.sage} /> {staffMember.role}
                  </span>
                )}
                {staffMember.email && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid }}>
                    <Mail size={14} color={C.sage} /> {staffMember.email}
                  </span>
                )}
                {staffMember.phone && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid }}>
                    <Phone size={14} color={C.sage} /> {staffMember.phone}
                  </span>
                )}
                {staffMember.hireDate && (
                  <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid }}>
                    <Calendar size={14} color={C.sage} /> Hired {formatDate(staffMember.hireDate)}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{
                fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600, textTransform: "capitalize",
                padding: "4px 12px", borderRadius: 3,
                background: staffMember.status === "active" ? "rgba(58,140,92,0.1)" : staffMember.status === "inactive" ? C.linen : "rgba(184,64,64,0.08)",
                color: staffMember.status === "active" ? C.green : staffMember.status === "inactive" ? C.inkFaint : C.red,
              }}>
                {staffMember.status}
              </span>
              <button
                onClick={() => setShowAuditLog(true)}
                title="View audit log"
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: `1px solid ${C.rule}`, borderRadius: 3, padding: "4px 10px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.72rem", color: C.inkLight, fontWeight: 500 }}
              >
                <History size={13} /> Audit Log
              </button>
              <button
                onClick={() => navigate(`/staff/${staffId}/verify`)}
                title="Run national verification checks (BACB, OIG LEIE, NPI)"
                style={{ display: "flex", alignItems: "center", gap: 5, background: C.forest, border: "none", borderRadius: 3, padding: "4px 10px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.72rem", color: "#F0EBE3", fontWeight: 600 }}
              >
                <Shield size={13} /> Run Verification
              </button>
            </div>
          </div>

          {/* Credential summary stats */}
          <div style={{ display: "flex", gap: 32, marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.rule}` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: C.mono, fontSize: "2rem", fontWeight: 700, color: C.inkDark, lineHeight: 1 }}>{credStats.total}</span>
              <span style={{ fontFamily: C.sans, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.inkFaint }}>Total</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: C.mono, fontSize: "2rem", fontWeight: 700, color: C.green, lineHeight: 1 }}>{credStats.current}</span>
              <span style={{ fontFamily: C.sans, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.green }}>Current</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: C.mono, fontSize: "2rem", fontWeight: 700, color: C.amber, lineHeight: 1 }}>{credStats.expiring}</span>
              <span style={{ fontFamily: C.sans, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.amber }}>Expiring</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontFamily: C.mono, fontSize: "2rem", fontWeight: 700, color: C.red, lineHeight: 1 }}>{credStats.expired}</span>
              <span style={{ fontFamily: C.sans, fontSize: "0.7rem", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.red }}>Expired</span>
            </div>
          </div>
        </div>

        {/* ── Retention Banner (inactive staff only) ──────── */}
        {staffMember.status === "inactive" && staffMember.inactivatedAt && (() => {
          const inactivatedAt = new Date(staffMember.inactivatedAt);
          const retentionExpires = new Date(inactivatedAt.getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000);
          const now = new Date();
          const isEligible = now >= retentionExpires;
          const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          return (
            <div style={{
              background: isEligible ? "rgba(184,64,64,0.06)" : "rgba(196,134,42,0.08)",
              border: `1px solid ${isEligible ? "#B84040" : "#C4862A"}`,
              borderRadius: 4,
              padding: "16px 20px",
              marginBottom: 24,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <AlertCircle size={16} color={isEligible ? "#B84040" : "#C4862A"} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, color: isEligible ? "#B84040" : "#C4862A", margin: "0 0 4px 0" }}>
                    {isEligible ? "Record eligible for deletion" : "Inactive — retention period active"}
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, margin: 0, lineHeight: 1.5 }}>
                    Inactivated {fmtDate(inactivatedAt)} · Records retained until {fmtDate(retentionExpires)}
                    {isEligible ? " · 2-year retention period has passed." : " · Cannot delete before retention expires."}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowDeleteStaff(true); setDeleteOverride(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: isEligible ? "#B84040" : "transparent",
                  color: isEligible ? "#fff" : "#B84040",
                  border: `1px solid #B84040`,
                  borderRadius: 4, padding: "7px 14px", cursor: "pointer",
                  fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                <Trash2 size={13} /> Delete Record
              </button>
            </div>
          );
        })()}

        {/* ── Delete Staff Modal ───────────────────────────── */}
        {showDeleteStaff && staffMember && (() => {
          const inactivatedAt = staffMember.inactivatedAt ? new Date(staffMember.inactivatedAt) : null;
          const retentionExpires = inactivatedAt ? new Date(inactivatedAt.getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000) : null;
          const now = new Date();
          const isEligible = !retentionExpires || now >= retentionExpires;
          const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(28,25,23,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24 }}>
              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "32px", maxWidth: 480, width: "100%" }}>
                <h3 style={{ fontFamily: C.serif, fontSize: "1.3rem", fontWeight: 700, color: C.inkDark, margin: "0 0 12px 0" }}>Delete Staff Record</h3>
                <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, lineHeight: 1.6, margin: "0 0 16px 0" }}>
                  You are about to permanently delete <strong>{staffMember.firstName} {staffMember.lastName}</strong> and all their credential records. This cannot be undone.
                </p>
                {!isEligible && retentionExpires && (
                  <div style={{ background: "rgba(196,134,42,0.1)", border: `1px solid #C4862A`, borderRadius: 4, padding: "12px 16px", marginBottom: 16 }}>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8rem", fontWeight: 600, color: "#C4862A", margin: "0 0 4px 0" }}>Retention period has not expired</p>
                    <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, margin: 0, lineHeight: 1.5 }}>
                      Inactivated {fmtDate(inactivatedAt!)} · Records should be retained until {fmtDate(retentionExpires)}.
                    </p>
                    <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 12, cursor: "pointer" }}>
                      <input type="checkbox" checked={deleteOverride} onChange={e => setDeleteOverride(e.target.checked)} style={{ marginTop: 2 }} />
                      <span style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, lineHeight: 1.5 }}>
                        I understand this is a compliance exception and confirm early deletion is authorized.
                      </span>
                    </label>
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setShowDeleteStaff(false)}
                    style={{ background: "none", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "8px 18px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid }}
                  >Cancel</button>
                  <button
                    disabled={!isEligible && !deleteOverride}
                    onClick={async () => {
                      try {
                        await deleteStaffMutation.mutateAsync({ id: staffMember.id, overrideRetention: !isEligible && deleteOverride });
                        toast.success("Staff record deleted.");
                        navigate("/staff");
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to delete staff record.");
                      }
                    }}
                    style={{
                      background: (!isEligible && !deleteOverride) ? C.inkFaint : "#B84040",
                      color: "#fff", border: "none", borderRadius: 4, padding: "8px 18px",
                      cursor: (!isEligible && !deleteOverride) ? "not-allowed" : "pointer",
                      fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
                    }}
                  >Delete Permanently</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Credentials Section ─────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontFamily: C.serif, fontSize: "1.4rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>Credentials</h2>
          <button
            onClick={() => setShowAddCredential(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: C.forest, color: "#F0EBE3", border: "none",
              borderRadius: 4, padding: "9px 18px", cursor: "pointer",
              fontFamily: C.sans, fontSize: "0.8rem", fontWeight: 600,
            }}
          >
            <Plus size={14} /> Add Credential
          </button>
        </div>

        {credsLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 size={24} color={C.forest} className="animate-spin" style={{ margin: "0 auto" }} />
          </div>
        ) : (credentialsList ?? []).length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 4 }}>
            <FileText size={36} color={C.inkFaint} style={{ margin: "0 auto 12px" }} />
            <h3 style={{ fontFamily: C.serif, fontSize: "1.2rem", color: C.inkDark, marginBottom: 8 }}>No credentials tracked yet</h3>
            <p style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight, marginBottom: 16 }}>
              Add this staff member's licenses, certifications, and training records.
            </p>
            <button
              onClick={() => setShowAddCredential(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: C.forest, color: "#F0EBE3", border: "none",
                borderRadius: 4, padding: "10px 20px", cursor: "pointer",
                fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
              }}
            >
              <Plus size={14} /> Add Credential
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(credentialsList ?? []).map((cred) => {
              const statusInfo = getStatusColor(cred.status);
              const verBadge = getVerificationBadge(cred.verificationStatus);
              const days = daysUntil(cred.expirationDate);
              const StatusIcon = statusInfo.icon;
              const VerIcon = verBadge.icon;
              const isVerifying = verifyingId === cred.id;

              return (
                <div key={cred.id} style={{ background: C.cream, border: `1px solid ${C.rule}`, borderLeft: `4px solid ${statusInfo.color}`, borderRadius: "0 4px 4px 0", padding: "20px 24px" }}>
                  {/* Top row: credential name + status badges + actions */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                        <StatusIcon size={16} color={statusInfo.color} />
                        <span style={{ fontFamily: C.sans, fontSize: "0.92rem", fontWeight: 600, color: C.inkDark }}>{cred.type}</span>
                        {/* Expiry status badge */}
                        <span style={{
                          fontFamily: C.sans, fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase",
                          padding: "2px 8px", borderRadius: 2, letterSpacing: "0.06em",
                          background: statusInfo.bg, color: statusInfo.color,
                        }}>
                          {cred.status.replace("_", " ")}
                        </span>
                        {/* Verification status badge */}
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontFamily: C.sans, fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase",
                          padding: "2px 8px", borderRadius: 2, letterSpacing: "0.06em",
                          background: verBadge.bg, color: verBadge.color,
                        }}>
                          <VerIcon size={10} />
                          {verBadge.label}
                        </span>
                      </div>

                      {/* Metadata row */}
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 6 }}>
                        {cred.category && (
                          <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight }}>
                            Category: <strong style={{ color: C.inkMid }}>{cred.category.replace("_", " ")}</strong>
                          </span>
                        )}
                        {cred.issuingBody && (
                          <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight }}>
                            Issuer: <strong style={{ color: C.inkMid }}>{cred.issuingBody}</strong>
                          </span>
                        )}
                        {cred.licenseNumber && (
                          <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight }}>
                            License #: <strong style={{ fontFamily: C.mono, color: C.inkMid }}>{cred.licenseNumber}</strong>
                          </span>
                        )}
                      </div>

                      {/* Date row */}
                      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 6 }}>
                        {cred.issueDate && (
                          <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight }}>
                            Issued: {formatDate(cred.issueDate)}
                          </span>
                        )}
                        {cred.expirationDate && (
                          <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight }}>
                            Expires: <strong style={{ color: days !== null && days <= 30 ? C.red : days !== null && days <= 90 ? C.amber : C.inkMid }}>
                              {formatDate(cred.expirationDate)}
                              {days !== null && ` (${days > 0 ? `${days} days` : days === 0 ? "today" : `${Math.abs(days)} days ago`})`}
                            </strong>
                          </span>
                        )}
                      </div>

                      {/* Document location */}
                      {(cred.documentLocationType && cred.documentLocationType !== "none") && (
                        <div style={{ marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight }}>
                            Document:
                          </span>
                          <span style={{
                            fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600,
                            color: C.inkMid, background: C.linen,
                            padding: "1px 7px", borderRadius: 2,
                          }}>
                            {cred.documentLocationType === "paper" ? "Paper file" :
                             cred.documentLocationType === "google_drive" ? "Google Drive" :
                             cred.documentLocationType === "dropbox" ? "Dropbox" :
                             cred.documentLocationType === "sharepoint" ? "SharePoint" :
                             cred.documentLocationType === "hr_system" ? "HR system" :
                             cred.documentLocationType === "ehr_system" ? "EHR system" :
                             "Other"}
                          </span>
                          {cred.documentLocationNote && (
                            ["google_drive", "dropbox", "sharepoint", "hr_system", "ehr_system", "other"].includes(cred.documentLocationType) && cred.documentLocationNote.startsWith("http") ? (
                              <a
                                href={cred.documentLocationNote}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  fontFamily: C.sans, fontSize: "0.75rem", color: C.sage,
                                  textDecoration: "none", fontWeight: 600,
                                }}
                              >
                                <ExternalLink size={11} /> Open Link
                              </a>
                            ) : (
                              <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight }}>
                                {cred.documentLocationNote}
                              </span>
                            )
                          )}
                        </div>
                      )}
                      {/* Legacy document link (uploaded file) */}
                      {cred.documentLink && (
                        <div style={{ marginBottom: 8 }}>
                          <a
                            href={cred.documentLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              fontFamily: C.sans, fontSize: "0.75rem", color: C.sage,
                              textDecoration: "none", fontWeight: 600,
                            }}
                          >
                            <ExternalLink size={12} /> View Uploaded Document
                          </a>
                        </div>
                      )}

                      {/* Verification record */}
                      {cred.verificationStatus !== "not_checked" && (cred.verifiedBy || cred.verificationDate) && (
                        <div style={{ marginTop: 6, padding: "6px 10px", background: verBadge.bg, borderRadius: 3, display: "inline-flex", gap: 12, flexWrap: "wrap" }}>
                            {cred.verifiedBy && (
                            <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: verBadge.color }}>
                              <User size={10} style={{ display: "inline", marginRight: 3 }} />
                              {cred.verificationStatus === "verified" ? "Verified" : cred.verificationStatus === "not_found" ? "Not Found" : cred.verificationStatus === "manual_review_required" ? "Manual Review Required" : "Reviewed"} by {cred.verifiedBy}
                            </span>
                          )}
                          {cred.verificationDate && (
                            <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: verBadge.color }}>
                              on {formatTimestamp(cred.verificationDate)}
                            </span>
                          )}
                        </div>
                      )}

                      {cred.verificationNotes && (
                        <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight, marginTop: 6, fontStyle: "italic" }}>
                          Note: {cred.verificationNotes}
                        </p>
                      )}

                      {cred.notes && (
                        <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight, marginTop: 4, fontStyle: "italic" }}>
                          {cred.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                      {/* Renew shortcut — only shown for expiring or expired credentials */}
                      {(cred.status === "expiring_soon" || cred.status === "expired") && (
                        <button
                          onClick={() => { setRenewScrollToUpload(true); setEditingCredential(cred as CredentialRecord); }}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            padding: "5px 10px", borderRadius: 3,
                            border: `1px solid ${cred.status === "expired" ? C.red : C.amber}`,
                            background: cred.status === "expired" ? "rgba(184,64,64,0.08)" : "rgba(196,134,42,0.08)",
                            color: cred.status === "expired" ? C.red : C.amber,
                            fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600,
                            cursor: "pointer", whiteSpace: "nowrap",
                          }}
                          title="Renew this credential — opens edit form"
                        >
                          <RefreshCw size={11} />
                          Renew
                        </button>
                      )}
                      <button
                        onClick={() => setEditingCredential(cred as CredentialRecord)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 3 }}
                        title="Edit credential"
                      >
                        <Pencil size={15} color={C.inkFaint} />
                      </button>
                      <button
                        onClick={() => handleDeleteCredential(cred.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 3 }}
                        title="Delete credential"
                      >
                        <Trash2 size={15} color={C.inkFaint} />
                      </button>
                    </div>
                  </div>

                  {/* ── Verification action buttons ── */}
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.rule}`, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>
                      Admin Review:
                    </span>
                    <button
                      onClick={() => handleVerify(cred.id, "verified")}
                      disabled={isVerifying}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 3, border: `1px solid rgba(58,140,92,0.3)`,
                        background: cred.verificationStatus === "verified" ? "rgba(58,140,92,0.15)" : "transparent",
                        color: C.green, fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600,
                        cursor: isVerifying ? "not-allowed" : "pointer", opacity: isVerifying ? 0.6 : 1,
                      }}
                      title="Mark as Verified — admin approval required"
                    >
                      <CheckCircle size={12} /> Verified
                    </button>
                    <button
                      onClick={() => handleVerify(cred.id, "needs_review")}
                      disabled={isVerifying}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 3, border: `1px solid rgba(196,134,42,0.3)`,
                        background: cred.verificationStatus === "needs_review" ? "rgba(196,134,42,0.12)" : "transparent",
                        color: C.amber, fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600,
                        cursor: isVerifying ? "not-allowed" : "pointer", opacity: isVerifying ? 0.6 : 1,
                      }}
                    >
                      <AlertTriangle size={12} /> Needs Review
                    </button>
                    <button
                      onClick={() => handleVerify(cred.id, "not_found")}
                      disabled={isVerifying}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 3, border: `1px solid rgba(184,64,64,0.3)`,
                        background: cred.verificationStatus === "not_found" ? "rgba(184,64,64,0.1)" : "transparent",
                        color: C.red, fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600,
                        cursor: isVerifying ? "not-allowed" : "pointer", opacity: isVerifying ? 0.6 : 1,
                      }}
                    >
                      <XCircle size={12} /> Not Found
                    </button>
                    <button
                      onClick={() => handleVerify(cred.id, "manual_review_required")}
                      disabled={isVerifying}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "5px 12px", borderRadius: 3, border: `1px solid rgba(100,100,100,0.2)`,
                        background: cred.verificationStatus === "manual_review_required" ? "rgba(100,100,100,0.08)" : "transparent",
                        color: C.inkMid, fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600,
                        cursor: isVerifying ? "not-allowed" : "pointer", opacity: isVerifying ? 0.6 : 1,
                      }}
                    >
                      <Clock size={12} /> Manual Review Required
                    </button>
                    {isVerifying && <Loader2 size={14} color={C.inkFaint} className="animate-spin" />}
                  </div>

                  {/* Prompt to add document location if missing */}
                  {(!cred.documentLink && (!cred.documentLocationType || cred.documentLocationType === "none")) && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.rule}` }}>
                      <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, fontStyle: "italic" }}>
                        No document location recorded — edit this credential to add a document location (Google Drive, Dropbox, SharePoint, paper file, etc.).
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Phase 1 disclaimer */}
        <div style={{ marginTop: 32, padding: "12px 16px", background: C.linen, border: `1px solid ${C.rule}`, borderRadius: 4 }}>
          <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, margin: 0, lineHeight: 1.6 }}>
            <strong style={{ color: C.inkLight }}>AuditReady Phase 1 — No Document Storage:</strong> AuditReady stores credential tracking information and document links only. Agencies are responsible for controlling access to their own document storage systems (Google Drive, Dropbox, SharePoint, etc.). AuditReady does not store uploaded credential files, patient information, clinical notes, PHI, therapy records, billing records, Medicaid records, or client files.
          </p>
        </div>
      </div>

      {/* ── Add Credential Modal ───────────────────────────── */}
      {showAddCredential && staffId && (
        <AddCredentialModal
          staffId={staffId}
          staffName={staffMember ? `${staffMember.firstName} ${staffMember.lastName}` : undefined}
          onClose={() => setShowAddCredential(false)}
          onSuccess={() => { refetchCreds(); setShowAddCredential(false); }}
        />
      )}

      {/* ── Edit Credential Modal ─────────────────────────── */}
      {editingCredential && (
        <EditCredentialModal
          credential={editingCredential}
          scrollToUpload={renewScrollToUpload}
          onClose={() => { setEditingCredential(null); setRenewScrollToUpload(false); }}
          onSuccess={() => { refetchCreds(); setEditingCredential(null); setRenewScrollToUpload(false); }}
        />
      )}

      {/* ── Audit Log Panel ───────────────────────────────── */}
      {showAuditLog && staffId && (
        <AuditLogPanel
          staffId={staffId}
          onClose={() => setShowAuditLog(false)}
        />
            )}
    </DashboardLayout>
  );
}
// ── Document Location Type labels ────────────────────────────
const DOC_LOCATION_OPTIONS = [
  { value: "none", label: "— Not specified —" },
  { value: "paper", label: "Paper file (physical)" },
  { value: "google_drive", label: "Google Drive" },
  { value: "dropbox", label: "Dropbox" },
  { value: "sharepoint", label: "SharePoint" },
  { value: "hr_system", label: "HR system" },
  { value: "ehr_system", label: "EHR system" },
  { value: "other", label: "Other" },
];

// ── Extracted field type ─────────────────────────────────────
interface ExtractionData {
  credentialType: string | null;
  issuingBody: string | null;
  licenseNumber: string | null;
  issueDate: string | null;
  expirationDate: string | null;
  providerName: string | null;
  confidence: "high" | "medium" | "low";
  warnings: string[];
}

// ── Add Credential Modal ──────────────────────────────────────
function AddCredentialModal({ staffId, staffName, onClose, onSuccess }: { staffId: number; staffName?: string; onClose: () => void; onSuccess: () => void }) {
  const [type, setType] = useState("");
  const [category, setCategory] = useState<string>("license");
  const [issuingBody, setIssuingBody] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [status, setStatus] = useState<string>("current");
  // Document location
  const [documentLocationType, setDocumentLocationType] = useState<string>("none");
  const [documentLocationNote, setDocumentLocationNote] = useState("");
  const [documentLink, setDocumentLink] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // AI extraction state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractionData, setExtractionData] = useState<ExtractionData | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  // Track the temp credential created during AI extraction so we can reuse or clean it up
  const [tempCredId, setTempCredId] = useState<number | null>(null);

  const createMutation = trpc.credentials.create.useMutation();
  const updateMutationForTemp = trpc.credentials.update.useMutation();
  const deleteMutation = trpc.credentials.delete.useMutation();
  const uploadDocumentMutation = trpc.credentials.uploadDocument.useMutation();
  const extractFromDocumentMutation = trpc.credentials.extractFromDocument.useMutation();

  // Clean up orphan temp credential if the modal is closed without saving
  const tempCredIdRef = useRef<number | null>(null);
  useEffect(() => { tempCredIdRef.current = tempCredId; }, [tempCredId]);
  useEffect(() => {
    return () => {
      // On unmount (Cancel or close without saving): delete the temp credential if it was never promoted
      const id = tempCredIdRef.current;
      if (id) {
        // Fire-and-forget — we don't await here since the component is unmounting
        fetch("/api/trpc/credentials.delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ "0": { json: { id } } }),
        }).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upload file to S3 first (creates a temp credential record just for the upload, then we update)
  const handleUploadAndExtract = async () => {
    if (!selectedFile) {
      toast.error("Select a file first.");
      return;
    }
    setExtracting(true);
    setExtractionData(null);
    setShowConfirmation(false);
    let createdTempId: number | null = null;
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64Data = btoa(binary);

      // Create a temp placeholder credential so we have an ID to attach the S3 upload to
      const tempCred = await createMutation.mutateAsync({
        staffId,
        type: "__temp_ai_extraction__",
        category: category as any,
        status: "current",
      });
      createdTempId = tempCred.id;
      setTempCredId(tempCred.id);

      const uploadResult = await uploadDocumentMutation.mutateAsync({
        credentialId: tempCred.id,
        fileName: selectedFile.name,
        mimeType: selectedFile.type as any,
        base64Data,
      });

      setUploadedFileUrl(uploadResult.url);

      // Extract from the uploaded file URL
      const mimeType = selectedFile.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
      const extractResult = await extractFromDocumentMutation.mutateAsync({
        fileUrl: uploadResult.url,
        mimeType,
        staffName,
      });

      if (!extractResult.success || !extractResult.extracted) {
        // Extraction failed — delete the orphan temp credential
        try { await deleteMutation.mutateAsync({ id: createdTempId }); } catch (_) {}
        setTempCredId(null);
        toast.error(extractResult.error || "AI extraction failed. Please fill in the fields manually.");
        setExtracting(false);
        return;
      }

      setExtractionData(extractResult.extracted as ExtractionData);
      setShowConfirmation(true);
    } catch (err: any) {
      // Clean up orphan temp credential on any unexpected error
      if (createdTempId) {
        try { await deleteMutation.mutateAsync({ id: createdTempId }); } catch (_) {}
        setTempCredId(null);
      }
      toast.error(err?.message || "Upload or extraction failed. Please try again.");
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmExtraction = () => {
    if (!extractionData) return;
    if (extractionData.credentialType) setType(extractionData.credentialType);
    if (extractionData.issuingBody) setIssuingBody(extractionData.issuingBody);
    if (extractionData.licenseNumber) setLicenseNumber(extractionData.licenseNumber);
    if (extractionData.issueDate) setIssueDate(extractionData.issueDate);
    if (extractionData.expirationDate) setExpirationDate(extractionData.expirationDate);
    if (uploadedFileUrl) setDocumentLink(uploadedFileUrl);
    setShowConfirmation(false);
    setExtractionData(null);
    toast.success("AI suggestions applied — please review all fields before saving.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!type.trim()) {
      setError("Credential type is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (tempCredId) {
        // AI extraction already created a temp credential — update it with the final values
        // rather than creating a duplicate record
        await updateMutationForTemp.mutateAsync({
          id: tempCredId,
          type: type.trim(),
          category: category as any,
          issuingBody: issuingBody.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          issueDate: issueDate || undefined,
          expirationDate: expirationDate || undefined,
          status: status as any,
          documentLocationType: (documentLocationType as any) || undefined,
          documentLocationNote: documentLocationNote.trim() || undefined,
          documentLink: documentLink.trim() || undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        // No AI extraction — create a fresh credential
        const result = await createMutation.mutateAsync({
          staffId,
          type: type.trim(),
          category: category as any,
          issuingBody: issuingBody.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          issueDate: issueDate || undefined,
          expirationDate: expirationDate || undefined,
          status: status as any,
          documentLocationType: (documentLocationType as any) || undefined,
          documentLocationNote: documentLocationNote.trim() || undefined,
          documentLink: documentLink.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        // Upload file to S3 if one was selected (no AI extraction path)
        if (selectedFile && result.id) {
          try {
            const arrayBuffer = await selectedFile.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            const base64Data = btoa(binary);
            await uploadDocumentMutation.mutateAsync({
              credentialId: result.id,
              fileName: selectedFile.name,
              mimeType: selectedFile.type as any,
              base64Data,
            });
            toast.success("Document uploaded successfully.");
          } catch (uploadErr: any) {
            toast.warning(`Credential saved but document upload failed: ${uploadErr?.message || "Unknown error"}`);
          }
        }
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.message || "Failed to add credential.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${C.rule}`, borderRadius: 4,
    fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark,
    background: C.cream, outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600,
    color: C.inkMid, marginBottom: 4, display: "block",
  };

  const sectionHeadStyle: React.CSSProperties = {
    fontFamily: C.sans, fontSize: "0.6rem", fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: C.inkFaint, marginBottom: 12, marginTop: 4,
    display: "flex", alignItems: "center", gap: 8,
  };

  const needsLinkField = ["google_drive", "dropbox", "sharepoint", "hr_system", "ehr_system", "other"].includes(documentLocationType);
  const isStaffCredCategory = ["license", "certification", "training", "background_check", "sex_offender_registry"].includes(category);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: C.parchment, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "32px", width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(28,25,23,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontFamily: C.serif, fontSize: "1.4rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>Add Credential</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={20} color={C.inkLight} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── Credential Info ── */}
          <div style={sectionHeadStyle}>
            <span>Credential Information</span>
            <div style={{ flex: 1, height: 1, background: C.rule }} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Credential Type *</label>
            <input style={inputStyle} value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. BCBA License, CPR / First Aid, Background Check" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={category} onChange={(e) => setCategory(e.target.value)}>
                {CREDENTIAL_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="current">Current</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Issuing Body</label>
            <input style={inputStyle} value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} placeholder="e.g. NC Psychology Board, BACB, American Red Cross" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>License / Certificate Number</label>
            <input style={inputStyle} value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} placeholder="e.g. BCBA-12345" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Issue Date</label>
              <input style={inputStyle} type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Expiration Date</label>
              <input style={inputStyle} type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
            </div>
          </div>

          {/* ── Option 1: Document Location / Link ── */}
          <div style={sectionHeadStyle}>
            <span>Option 1 — Document Location / Link</span>
            <div style={{ flex: 1, height: 1, background: C.rule }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Where is the document stored?</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={documentLocationType}
              onChange={(e) => setDocumentLocationType(e.target.value)}
            >
              {DOC_LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {documentLocationType !== "none" && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                {needsLinkField ? "Document Link or Location Note" : "Location Note (optional)"}
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={documentLocationNote}
                  onChange={(e) => setDocumentLocationNote(e.target.value)}
                  placeholder={
                    documentLocationType === "paper" ? "e.g. Filing cabinet, Room 2B" :
                    documentLocationType === "google_drive" ? "https://drive.google.com/..." :
                    documentLocationType === "dropbox" ? "https://www.dropbox.com/..." :
                    documentLocationType === "sharepoint" ? "https://company.sharepoint.com/..." :
                    documentLocationType === "hr_system" ? "e.g. BambooHR — employee file" :
                    documentLocationType === "ehr_system" ? "e.g. CentralReach — staff record" :
                    "Describe where the document is located"
                  }
                />
              </div>
            </div>
          )}

          {/* ── Option 2: Upload & Auto-Fill with AI ── */}
          <div style={sectionHeadStyle}>
            <span>Option 2 — Upload Document & Auto-Fill with AI</span>
            <div style={{ flex: 1, height: 1, background: C.rule }} />
          </div>

          {/* PHI Warning */}
          <div style={{
            marginBottom: 12, padding: "10px 14px",
            background: "rgba(184,64,64,0.05)",
            border: `1px solid rgba(184,64,64,0.2)`,
            borderRadius: 4,
          }}>
            <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.red, margin: 0, lineHeight: 1.6 }}>
              <strong>Do not upload:</strong> patient/client records, clinical notes, therapy notes, treatment plans, billing records, Medicaid records, diagnosis information, or any PHI.
            </p>
            <p style={{ fontFamily: C.sans, fontSize: "0.68rem", color: C.inkFaint, margin: "4px 0 0", lineHeight: 1.5 }}>
              Allowed: staff credential documents only — license, CPR card, certification, training certificate, or background check confirmation.
            </p>
          </div>

          {isStaffCredCategory ? (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Upload Credential Document (optional)</label>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <input
                    style={{ ...inputStyle, cursor: "pointer" }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 15 * 1024 * 1024) {
                          toast.error("File too large. Maximum size is 15MB.");
                          e.target.value = "";
                          return;
                        }
                        setSelectedFile(file);
                      }
                    }}
                  />
                  <p style={{ fontFamily: C.sans, fontSize: "0.68rem", color: C.inkFaint, marginTop: 4 }}>
                    Accepted: PDF, JPG, PNG, WebP. Max 15MB. Staff credential documents only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUploadAndExtract}
                  disabled={extracting || !selectedFile}
                  title="Upload document and auto-fill fields with AI"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "10px 16px", border: `1px solid ${C.sage}`,
                    borderRadius: 4, background: extracting ? C.linen : C.cream,
                    color: C.sage, fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
                    cursor: extracting || !selectedFile ? "not-allowed" : "pointer",
                    opacity: !selectedFile ? 0.4 : 1,
                    whiteSpace: "nowrap", flexShrink: 0, marginTop: 0,
                  }}
                >
                  {extracting ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {extracting ? "Analyzing..." : "Upload & Auto-Fill"}
                </button>
              </div>
              {extracting && (
                <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(61,107,82,0.06)", border: `1px solid rgba(61,107,82,0.2)`, borderRadius: 4 }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.sage, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <Loader2 size={13} className="animate-spin" />
                    Uploading document and running AI-assisted extraction… This may take 10–20 seconds.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginBottom: 16, padding: "8px 12px", background: C.linen, borderRadius: 4 }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, margin: 0 }}>
                File upload and AI extraction are available for license, certification, training, and background check categories only.
              </p>
            </div>
          )}

          {/* ── AI Extraction Confirmation Overlay ── */}
          {showConfirmation && extractionData && (
            <div style={{
              position: "fixed", inset: 0, zIndex: 1100,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.6)", backdropFilter: "blur(4px)" }} />
              <div style={{
                position: "relative", background: C.parchment,
                border: `1px solid ${C.rule}`, borderRadius: 6,
                padding: "28px 32px", width: "100%", maxWidth: 520,
                maxHeight: "90vh", overflowY: "auto",
                boxShadow: "0 24px 64px rgba(28,25,23,0.25)",
              }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <Sparkles size={18} color={C.sage} />
                  <h3 style={{ fontFamily: C.serif, fontSize: "1.2rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>
                    AI-Assisted Extraction Results
                  </h3>
                </div>
                <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight, marginBottom: 20, lineHeight: 1.6 }}>
                  The following values were suggested by AI analysis of your document. Review each field carefully before applying.
                </p>

                {/* Disclaimer banner */}
                <div style={{
                  marginBottom: 20, padding: "12px 16px",
                  background: "rgba(196,134,42,0.07)",
                  border: `1px solid rgba(196,134,42,0.25)`,
                  borderRadius: 4,
                }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.amber, margin: 0, fontWeight: 600, marginBottom: 4 }}>
                    ⚠️ AI-extracted values are suggestions only.
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkMid, margin: 0, lineHeight: 1.6 }}>
                    Please verify all information against the original document before saving. You are responsible for the accuracy of all credential records.
                  </p>
                </div>

                {/* Confidence badge */}
                <div style={{ marginBottom: 16 }}>
                  <span style={{
                    display: "inline-block", padding: "3px 10px",
                    borderRadius: 3, fontSize: "0.7rem", fontWeight: 700,
                    fontFamily: C.sans, letterSpacing: "0.04em",
                    background: extractionData.confidence === "high" ? "rgba(58,140,92,0.1)" : extractionData.confidence === "medium" ? "rgba(196,134,42,0.1)" : "rgba(184,64,64,0.1)",
                    color: extractionData.confidence === "high" ? "#2d7a4f" : extractionData.confidence === "medium" ? C.amber : C.red,
                    border: `1px solid ${extractionData.confidence === "high" ? "rgba(58,140,92,0.25)" : extractionData.confidence === "medium" ? "rgba(196,134,42,0.25)" : "rgba(184,64,64,0.25)"}`,
                  }}>
                    Confidence: {extractionData.confidence.charAt(0).toUpperCase() + extractionData.confidence.slice(1)}
                  </span>
                </div>

                {/* Extracted fields */}
                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Credential Type", value: extractionData.credentialType },
                    { label: "Issuing Body", value: extractionData.issuingBody },
                    { label: "License / Cert Number", value: extractionData.licenseNumber },
                    { label: "Provider Name (if visible)", value: extractionData.providerName },
                    { label: "Issue Date", value: extractionData.issueDate },
                    { label: "Expiration Date", value: extractionData.expirationDate },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 12px", background: C.cream,
                      border: `1px solid ${C.rule}`, borderRadius: 3,
                    }}>
                      <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, fontWeight: 600 }}>{label}</span>
                      <span style={{ fontFamily: C.mono, fontSize: "0.78rem", color: value ? C.inkDark : C.inkFaint, fontStyle: value ? "normal" : "italic" }}>
                        {value || "Not detected"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Warnings */}
                {extractionData.warnings.length > 0 && (
                  <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(184,64,64,0.05)", border: `1px solid rgba(184,64,64,0.2)`, borderRadius: 4 }}>
                    {extractionData.warnings.map((w, i) => (
                      <p key={i} style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.red, margin: i === 0 ? 0 : "4px 0 0", lineHeight: 1.5 }}>
                        ⚠️ {w}
                      </p>
                    ))}
                  </div>
                )}

                {/* Terms note */}
                <p style={{ fontFamily: C.sans, fontSize: "0.65rem", color: C.inkFaint, marginBottom: 20, lineHeight: 1.6 }}>
                  Automated document extraction is provided as a convenience tool. Users are responsible for verifying all extracted information against original source documents.
                </p>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => { setShowConfirmation(false); setExtractionData(null); }}
                    style={{
                      padding: "10px 20px", border: `1px solid ${C.rule}`, borderRadius: 4,
                      background: "transparent", fontFamily: C.sans, fontSize: "0.82rem",
                      color: C.inkMid, cursor: "pointer",
                    }}
                  >
                    Discard
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmExtraction}
                    style={{
                      padding: "10px 24px", border: "none", borderRadius: 4,
                      background: C.forest, color: "#F0EBE3",
                      fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <CheckCircle size={14} />
                    Apply Suggestions & Review
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this credential..."
            />
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
              {saving ? "Adding..." : "Add Credential"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Credential Modal ─────────────────────────────────────
function EditCredentialModal({
  credential,
  onClose,
  onSuccess,
  scrollToUpload = false,
}: {
  credential: CredentialRecord;
  onClose: () => void;
  onSuccess: () => void;
  scrollToUpload?: boolean;
}) {
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollToUpload && uploadSectionRef.current) {
      // Small delay to let the modal render fully before scrolling
      setTimeout(() => {
        uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 200);
    }
  }, [scrollToUpload]);
  const [type, setType] = useState(credential.type);
  const [category, setCategory] = useState<CredentialRecord["category"]>(credential.category);
  const [issuingBody, setIssuingBody] = useState(credential.issuingBody ?? "");
  const [licenseNumber, setLicenseNumber] = useState(credential.licenseNumber ?? "");
  const [issueDate, setIssueDate] = useState(credential.issueDate ?? "");
  const [expirationDate, setExpirationDate] = useState(credential.expirationDate ?? "");
  const [status, setStatus] = useState<CredentialRecord["status"]>(credential.status);
  // Document location
  const [documentLocationType, setDocumentLocationType] = useState<string>(credential.documentLocationType ?? "none");
  const [documentLocationNote, setDocumentLocationNote] = useState(credential.documentLocationNote ?? "");
  // Optional file upload
  const [documentLink, setDocumentLink] = useState(credential.documentLink ?? "");
  const [notes, setNotes] = useState(credential.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(credential.documentLink?.startsWith("/manus-storage") ? credential.documentLink : null);
  // AI extraction state
  const [extracting, setExtracting] = useState(false);
  const [extractionData, setExtractionData] = useState<ExtractionData | null>(null);
  const [showExtractionConfirm, setShowExtractionConfirm] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", border: `1px solid ${C.rule}`,
    borderRadius: 4, fontFamily: C.sans, fontSize: "0.85rem",
    color: C.inkDark, background: C.cream, outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: C.sans, fontSize: "0.72rem",
    fontWeight: 600, color: C.inkMid, textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: 5,
  };
  const sectionHeadStyle: React.CSSProperties = {
    fontFamily: C.sans, fontSize: "0.6rem", fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase",
    color: C.inkFaint, marginBottom: 12, marginTop: 4,
    display: "flex", alignItems: "center", gap: 8,
  };

  const updateMutation = trpc.credentials.update.useMutation({
    onSuccess: () => {
      toast.success("Credential updated successfully.");
      onSuccess();
    },
    onError: (err) => {
      setError(err.message || "Failed to update credential.");
      setSaving(false);
    },
  });
  const uploadDocumentMutation = trpc.credentials.uploadDocument.useMutation();
  const extractFromDocumentMutation = trpc.credentials.extractFromDocument.useMutation();

  const handleExtractFromDocument = async () => {
    if (!selectedFile) { toast.error("Select a file first."); return; }
    setExtracting(true);
    setExtractionData(null);
    setShowExtractionConfirm(false);
    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64Data = btoa(binary);
      // Upload the file first so we have a real URL for the LLM
      const uploadResult = await uploadDocumentMutation.mutateAsync({
        credentialId: credential.id,
        fileName: selectedFile.name,
        mimeType: selectedFile.type as any,
        base64Data,
      });
      setUploadedUrl(uploadResult.url);
      setDocumentLink(uploadResult.url);
      setSelectedFile(null);
      // Now extract from the uploaded URL
      const mimeType = selectedFile.type as "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
      const extractResult = await extractFromDocumentMutation.mutateAsync({
        fileUrl: uploadResult.url,
        mimeType,
      });
      if (!extractResult.success || !extractResult.extracted) {
        toast.error(extractResult.error || "AI extraction failed. Document was uploaded — fill in fields manually.");
        return;
      }
      setExtractionData(extractResult.extracted as ExtractionData);
      setShowExtractionConfirm(true);
    } catch (err: any) {
      toast.error(err?.message || "Upload or extraction failed. Please try again.");
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmExtraction = () => {
    if (!extractionData) return;
    if (extractionData.credentialType) setType(extractionData.credentialType);
    if (extractionData.issuingBody) setIssuingBody(extractionData.issuingBody);
    if (extractionData.licenseNumber) setLicenseNumber(extractionData.licenseNumber);
    if (extractionData.issueDate) setIssueDate(extractionData.issueDate);
    if (extractionData.expirationDate) setExpirationDate(extractionData.expirationDate);
    setShowExtractionConfirm(false);
    setExtractionData(null);
    toast.success("AI suggestions applied — please review all fields before saving.");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!type.trim()) { setError("Credential type is required."); return; }
    setError(null);
    setSaving(true);
    try {
      // Upload file first if one was selected
      let finalDocumentLink = documentLink.trim() || undefined;
      if (selectedFile) {
        setUploading(true);
        try {
          const arrayBuffer = await selectedFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          const base64Data = btoa(binary);
          const uploadResult = await uploadDocumentMutation.mutateAsync({
            credentialId: credential.id,
            fileName: selectedFile.name,
            mimeType: selectedFile.type as any,
            base64Data,
          });
          finalDocumentLink = uploadResult.url;
          setUploadedUrl(uploadResult.url);
          setSelectedFile(null);
        } catch (uploadErr: any) {
          toast.warning(`Document upload failed: ${uploadErr?.message || "Unknown error"}. Saving other changes.`);
        } finally {
          setUploading(false);
        }
      }
      updateMutation.mutate({
        id: credential.id,
        type: type.trim(),
        category,
        issuingBody: issuingBody.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        issueDate: issueDate || undefined,
        expirationDate: expirationDate || undefined,
        status,
        documentLocationType: (documentLocationType as any) || undefined,
        documentLocationNote: documentLocationNote.trim() || undefined,
        documentLink: finalDocumentLink,
        notes: notes.trim() || undefined,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to update credential.");
      setSaving(false);
    }
  }

  const needsLinkField = ["google_drive", "dropbox", "sharepoint", "hr_system", "ehr_system", "other"].includes(documentLocationType);
  const isStaffCredCategory = ["license", "certification", "training", "background_check", "sex_offender_registry"].includes(category);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(28,25,23,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 24,
    }}>
      <div style={{
        background: C.cream, borderRadius: 6, width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto",
        border: `1px solid ${C.rule}`,
        boxShadow: "0 8px 40px rgba(28,25,23,0.18)",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.rule}`,
        }}>
          <div>
            <h2 style={{ fontFamily: C.serif, fontSize: "1.4rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>
              Edit Credential
            </h2>
            <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight, margin: "4px 0 0" }}>
              Update the credential details below.
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color={C.inkFaint} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px 24px 24px" }}>
          {/* ── Credential Info ── */}
          <div style={sectionHeadStyle}>
            <span>Credential Information</span>
            <div style={{ flex: 1, height: 1, background: C.rule }} />
          </div>

          {/* Type */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Credential Type *</label>
            <input
              style={inputStyle}
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g., BCBA License, CPR Certification"
              required
            />
          </div>

          {/* Category */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Category</label>
            <select
              style={inputStyle}
              value={category}
              onChange={(e) => setCategory(e.target.value as CredentialRecord["category"])}
            >
              {CREDENTIAL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Issuing Body + License Number */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Issuing Body</label>
              <input
                style={inputStyle}
                value={issuingBody}
                onChange={(e) => setIssuingBody(e.target.value)}
                placeholder="e.g., BACB, NC Board"
              />
            </div>
            <div>
              <label style={labelStyle}>License / Cert Number</label>
              <input
                style={inputStyle}
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g., 1-23-45678"
              />
            </div>
          </div>

          {/* Issue Date + Expiration Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Issue Date</label>
              <input
                type="date"
                style={inputStyle}
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Expiration Date</label>
              <input
                type="date"
                style={inputStyle}
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Status</label>
            <select
              style={inputStyle}
              value={status}
              onChange={(e) => setStatus(e.target.value as CredentialRecord["status"])}
            >
              <option value="current">Current</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="not_applicable">Not Applicable</option>
            </select>
          </div>

          {/* ── Option 1: Document Location / Link ── */}
          <div style={sectionHeadStyle}>
            <span>Option 1 — Document Location / Link</span>
            <div style={{ flex: 1, height: 1, background: C.rule }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Where is the document stored?</label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={documentLocationType}
              onChange={(e) => setDocumentLocationType(e.target.value)}
            >
              {DOC_LOCATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {documentLocationType !== "none" && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>
                {needsLinkField ? "Document Link or Location Note" : "Location Note (optional)"}
              </label>
              <input
                style={inputStyle}
                value={documentLocationNote}
                onChange={(e) => setDocumentLocationNote(e.target.value)}
                placeholder={
                  documentLocationType === "paper" ? "e.g. Filing cabinet, Room 2B" :
                  documentLocationType === "google_drive" ? "https://drive.google.com/..." :
                  documentLocationType === "dropbox" ? "https://www.dropbox.com/..." :
                  documentLocationType === "sharepoint" ? "https://company.sharepoint.com/..." :
                  documentLocationType === "hr_system" ? "e.g. BambooHR — employee file" :
                  documentLocationType === "ehr_system" ? "e.g. CentralReach — staff record" :
                  "Describe where the document is located"
                }
              />
            </div>
          )}

          {/* ── Option 2: Optional File Upload ── */}
          <div style={sectionHeadStyle}>
            <span>Option 2 — Optional File Upload</span>
            <div style={{ flex: 1, height: 1, background: C.rule }} />
          </div>

          {/* PHI Warning */}
          <div style={{
            marginBottom: 12, padding: "10px 14px",
            background: "rgba(184,64,64,0.05)",
            border: `1px solid rgba(184,64,64,0.2)`,
            borderRadius: 4,
          }}>
            <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.red, margin: 0, lineHeight: 1.6 }}>
              <strong>Do not upload:</strong> patient/client records, clinical notes, therapy notes, treatment plans, billing records, Medicaid records, diagnosis information, or any PHI.
            </p>
            <p style={{ fontFamily: C.sans, fontSize: "0.68rem", color: C.inkFaint, margin: "4px 0 0", lineHeight: 1.5 }}>
              Allowed: staff credential documents only — license, CPR card, certification, training certificate, or background check confirmation.
            </p>
          </div>

          {isStaffCredCategory ? (
            <div ref={uploadSectionRef} style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Upload Credential Document (optional)</label>
              {uploadedUrl && (
                <div style={{ marginBottom: 8, padding: "8px 12px", background: "rgba(61,107,82,0.06)", border: `1px solid rgba(61,107,82,0.2)`, borderRadius: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={13} color={C.sage} />
                  <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.sage, flex: 1 }}>Document uploaded</span>
                  <a href={uploadedUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.sage, display: "flex", alignItems: "center", gap: 4 }}>
                    <ExternalLink size={11} /> View
                  </a>
                </div>
              )}
              <input
                style={{ ...inputStyle, cursor: "pointer" }}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 15 * 1024 * 1024) {
                      toast.error("File too large. Maximum size is 15MB.");
                      e.target.value = "";
                      return;
                    }
                    setSelectedFile(file);
                  }
                }}
              />
              {selectedFile && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.sage, margin: 0, display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    <FileText size={12} /> {selectedFile.name}
                  </p>
                  <button
                    type="button"
                    onClick={handleExtractFromDocument}
                    disabled={extracting}
                    style={{
                      padding: "6px 14px", border: `1px solid ${C.sage}`, borderRadius: 4,
                      background: "rgba(61,107,82,0.06)", fontFamily: C.sans, fontSize: "0.72rem",
                      fontWeight: 600, color: C.sage, cursor: extracting ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", gap: 6, opacity: extracting ? 0.7 : 1,
                    }}
                  >
                    {extracting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {extracting ? "Extracting…" : "Upload & Auto-Fill"}
                  </button>
                </div>
              )}
              {!selectedFile && (
                <p style={{ fontFamily: C.sans, fontSize: "0.68rem", color: C.inkFaint, marginTop: 4 }}>
                  Select a file above, then click <strong>Upload &amp; Auto-Fill</strong> to let AI suggest the credential fields from the document.
                </p>
              )}
              {extracting && (
                <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.sage, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <Loader2 size={12} className="animate-spin" /> Uploading and running AI extraction… 10–20 seconds.
                </p>
              )}
              {uploading && (
                <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.sage, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <Loader2 size={12} className="animate-spin" /> Uploading document…
                </p>
              )}
              <p style={{ fontFamily: C.sans, fontSize: "0.68rem", color: C.inkFaint, marginTop: 4 }}>
                Accepted: PDF, JPG, PNG, WebP. Max 15MB. Staff credential documents only.
              </p>
            </div>
          ) : (
            <div style={{ marginBottom: 16, padding: "8px 12px", background: C.linen, borderRadius: 4 }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, margin: 0 }}>
                File upload is available for license, certification, training, and background check categories only.
              </p>
            </div>
          )}

          {/* ── AI Extraction Confirmation Overlay (Edit modal) ── */}
          {showExtractionConfirm && extractionData && (
            <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", inset: 0, background: "rgba(28,25,23,0.6)", backdropFilter: "blur(4px)" }} />
              <div style={{ position: "relative", background: C.parchment, border: `1px solid ${C.rule}`, borderRadius: 6, padding: "28px 32px", width: "100%", maxWidth: 520, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(28,25,23,0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <Sparkles size={18} color={C.sage} />
                  <h3 style={{ fontFamily: C.serif, fontSize: "1.2rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>AI-Assisted Extraction Results</h3>
                </div>
                <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight, marginBottom: 20, lineHeight: 1.6 }}>Review each field carefully before applying. These values will replace the current credential fields.</p>
                <div style={{ marginBottom: 20, padding: "12px 16px", background: "rgba(196,134,42,0.07)", border: `1px solid rgba(196,134,42,0.25)`, borderRadius: 4 }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.amber, margin: 0, fontWeight: 600, marginBottom: 4 }}>⚠️ AI-extracted values are suggestions only.</p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkMid, margin: 0, lineHeight: 1.6 }}>Verify all information against the original document before saving. You are responsible for the accuracy of all credential records.</p>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 3, fontSize: "0.7rem", fontWeight: 700, fontFamily: C.sans, letterSpacing: "0.04em", background: extractionData.confidence === "high" ? "rgba(58,140,92,0.1)" : extractionData.confidence === "medium" ? "rgba(196,134,42,0.1)" : "rgba(184,64,64,0.1)", color: extractionData.confidence === "high" ? "#2d7a4f" : extractionData.confidence === "medium" ? C.amber : C.red, border: `1px solid ${extractionData.confidence === "high" ? "rgba(58,140,92,0.25)" : extractionData.confidence === "medium" ? "rgba(196,134,42,0.25)" : "rgba(184,64,64,0.25)"}` }}>
                    Confidence: {extractionData.confidence.charAt(0).toUpperCase() + extractionData.confidence.slice(1)}
                  </span>
                </div>
                <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                  {[
                    { label: "Credential Type", value: extractionData.credentialType },
                    { label: "Issuing Body", value: extractionData.issuingBody },
                    { label: "License / Cert Number", value: extractionData.licenseNumber },
                    { label: "Provider Name (if visible)", value: extractionData.providerName },
                    { label: "Issue Date", value: extractionData.issueDate },
                    { label: "Expiration Date", value: extractionData.expirationDate },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 3 }}>
                      <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint, fontWeight: 600 }}>{label}</span>
                      <span style={{ fontFamily: C.mono, fontSize: "0.78rem", color: value ? C.inkDark : C.inkFaint, fontStyle: value ? "normal" : "italic" }}>{value || "Not detected"}</span>
                    </div>
                  ))}
                </div>
                {extractionData.warnings.length > 0 && (
                  <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(184,64,64,0.05)", border: `1px solid rgba(184,64,64,0.2)`, borderRadius: 4 }}>
                    {extractionData.warnings.map((w, i) => (
                      <p key={i} style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.red, margin: i === 0 ? 0 : "4px 0 0", lineHeight: 1.5 }}>⚠️ {w}</p>
                    ))}
                  </div>
                )}
                <p style={{ fontFamily: C.sans, fontSize: "0.65rem", color: C.inkFaint, marginBottom: 20, lineHeight: 1.6 }}>Automated document extraction is provided as a convenience tool. Users are responsible for verifying all extracted information against original source documents.</p>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => { setShowExtractionConfirm(false); setExtractionData(null); }} style={{ padding: "10px 20px", border: `1px solid ${C.rule}`, borderRadius: 4, background: "transparent", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid, cursor: "pointer" }}>Discard</button>
                  <button type="button" onClick={handleConfirmExtraction} style={{ padding: "10px 24px", border: "none", borderRadius: 4, background: C.forest, color: "#F0EBE3", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    <CheckCircle size={14} /> Apply Suggestions & Review
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this credential..."
            />
          </div>

          {error && (
            <div style={{
              fontFamily: C.sans, fontSize: "0.8rem", color: C.red,
              marginBottom: 16, padding: "8px 12px",
              background: "rgba(184,64,64,0.06)", borderRadius: 3,
            }}>
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

// ── Audit Log Panel ───────────────────────────────────────────
function AuditLogPanel({
  staffId,
  onClose,
}: {
  staffId: number;
  onClose: () => void;
}) {
  const { data: logs, isLoading } = trpc.auditLog.byStaff.useQuery({ staffId });

  function formatLogDate(d: Date | string | null | undefined): string {
    if (!d) return "—";
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  }

  function actionLabel(action: string): { label: string; color: string; bg: string } {
    switch (action) {
      case "create":  return { label: "Created",  color: "#166534", bg: "rgba(58,140,92,0.08)" };
      case "update":  return { label: "Updated",  color: C.amber,   bg: "rgba(196,134,42,0.08)" };
      case "delete":  return { label: "Deleted",  color: C.red,     bg: "rgba(184,64,64,0.08)" };
      case "verify":  return { label: "Verified", color: C.forest,  bg: "rgba(29,61,47,0.08)" };
      default:        return { label: action,     color: C.inkMid,  bg: C.linen };
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(28,25,23,0.35)",
          zIndex: 900,
        }}
      />
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 420,
        background: C.cream, borderLeft: `1px solid ${C.rule}`,
        boxShadow: "-4px 0 32px rgba(28,25,23,0.14)",
        zIndex: 901, display: "flex", flexDirection: "column",
        overflowY: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px 16px", borderBottom: `1px solid ${C.rule}`,
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontFamily: C.serif, fontSize: "1.35rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>
              Audit Log
            </h2>
            <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight, margin: "3px 0 0" }}>
              All changes for this staff member
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
            <X size={18} color={C.inkFaint} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 24px" }}>
          {isLoading ? (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 48 }}>
              <Loader2 size={22} color={C.inkFaint} className="animate-spin" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 48 }}>
              <History size={32} color={C.inkFaint} style={{ margin: "0 auto 12px" }} />
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight }}>
                No audit log entries yet.
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint, marginTop: 4 }}>
                Changes to staff and credentials will appear here.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {logs.map((entry) => {
                const { label, color, bg } = actionLabel(entry.action);
                return (
                  <div key={entry.id} style={{
                    padding: "12px 14px", borderRadius: 4,
                    border: `1px solid ${C.rule}`, background: C.parchment,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700,
                        textTransform: "uppercase", letterSpacing: "0.06em",
                        padding: "2px 8px", borderRadius: 3,
                        color, background: bg,
                      }}>
                        {label}
                      </span>
                      <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint }}>
                        {entry.entityType === "credential" ? "Credential" : "Staff"}
                      </span>
                    </div>

                    {entry.summary && (
                      <p style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkDark, margin: "0 0 6px", lineHeight: 1.5 }}>
                        {entry.summary}
                      </p>
                    )}

                    {entry.fieldChanged && (
                      <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight, margin: "0 0 4px" }}>
                        <strong>Field:</strong> {entry.fieldChanged}
                        {entry.oldValue && entry.newValue && (
                          <span> — <span style={{ fontFamily: C.mono, fontSize: "0.72rem" }}>{entry.oldValue}</span> → <span style={{ fontFamily: C.mono, fontSize: "0.72rem" }}>{entry.newValue}</span></span>
                        )}
                      </p>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                      <span style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint }}>
                        {formatLogDate(entry.changedAt)}
                      </span>
                      {entry.changedBy && (
                        <span style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint }}>
                          by {entry.changedBy}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
