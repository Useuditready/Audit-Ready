import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Loader2,
  Search,
  Filter,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

// ── Design tokens (same as rest of app) ──────────────────────
const C = {
  forest:     "#1D3D2F",
  forestMid:  "#2A5240",
  sage:       "#3D6B52",
  amber:      "#C4862A",
  amberLight: "#E8A94A",
  parchment:  "#F7F3ED",
  cream:      "#FDFAF6",
  linen:      "#EFE9E0",
  inkDark:    "#1C1917",
  inkMid:     "#5A5048",
  inkLight:   "#7A6E64",
  inkFaint:   "#A89880",
  rule:       "#E2D9CE",
  ruleDark:   "#C4B8A8",
  red:        "#B84040",
  green:      "#2D6A4F",
  serif:      "'DM Serif Display', Georgia, serif",
  sans:       "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:       "'JetBrains Mono', 'Courier New', monospace",
};

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  // Handle both date-only strings (YYYY-MM-DD) and full ISO datetime strings
  const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    license: "License",
    certification: "Certification",
    training: "Training",
    background_check: "Background Check",
    sex_offender_registry: "Sex Offender Registry Check",
    insurance: "Insurance",
    other: "Other",
  };
  return map[cat] ?? cat;
}

export default function PendingReview() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [verifyingId, setVerifyingId] = useState<number | null>(null);
  const [showNotesModal, setShowNotesModal] = useState<{
    credentialId: number;
    action: "verified" | "needs_review" | "not_found" | "manual_review_required";
  } | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: pendingList, isLoading } = trpc.credentials.pending.useQuery(undefined, {
    enabled: !!user,
  });

  const verifyMutation = trpc.credentials.verify.useMutation({
    onSuccess: (_, vars) => {
      const actionLabels: Record<string, string> = {
        verified: "Verified",
        needs_review: "Flagged for Review",
        not_found: "Marked Not Found",
        manual_review_required: "Marked Manual Review Required",
        not_checked: "Reset to Not Checked",
      };
      toast.success(`${actionLabels[vars.verificationStatus] ?? "Updated"} successfully.`);
      utils.credentials.pending.invalidate();
      setVerifyingId(null);
      setShowNotesModal(null);
      setVerificationNotes("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update verification status.");
      setVerifyingId(null);
    },
  });

  function handleVerify(
    credentialId: number,
    action: "verified" | "needs_review" | "not_found" | "manual_review_required",
    notes?: string
  ) {
    setVerifyingId(credentialId);
    verifyMutation.mutate({
      id: credentialId,
      verificationStatus: action,
      verificationNotes: notes || undefined,
    });
  }

  function openNotesModal(credentialId: number, action: "verified" | "needs_review" | "not_found" | "manual_review_required") {
    setVerificationNotes("");
    setShowNotesModal({ credentialId, action });
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} color={C.inkFaint} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  // Filter logic
  const filtered = (pendingList ?? []).filter((cred) => {
    const fullName = `${cred.staffFirstName} ${cred.staffLastName}`.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      fullName.includes(searchQuery.toLowerCase()) ||
      cred.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cred.issuingBody ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === "all" || cred.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <PilotStatusBanner />
      <EmailVerificationBanner />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 32px 64px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: C.serif, fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 700, color: C.inkDark, margin: "0 0 6px" }}>
            Pending Review Queue
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.88rem", color: C.inkLight, margin: 0 }}>
            Credentials awaiting verification. Open the document link, review it, then approve, reject, or flag for update.
          </p>
        </div>

        {/* Filters */}
        <div style={{
          display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap",
          alignItems: "center",
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <Search size={14} color={C.inkFaint} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search by staff name or credential type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "9px 12px 9px 32px",
                border: `1px solid ${C.rule}`, borderRadius: 4,
                fontFamily: C.sans, fontSize: "0.83rem", color: C.inkDark,
                background: C.cream, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Category filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Filter size={13} color={C.inkFaint} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                padding: "9px 12px", border: `1px solid ${C.rule}`, borderRadius: 4,
                fontFamily: C.sans, fontSize: "0.83rem", color: C.inkDark,
                background: C.cream, outline: "none", cursor: "pointer",
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
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <Loader2 size={28} color={C.inkFaint} className="animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 6,
            padding: "64px 32px", textAlign: "center",
          }}>
            <Clock size={36} color={C.inkFaint} style={{ margin: "0 auto 16px" }} />
            <h3 style={{ fontFamily: C.serif, fontSize: "1.4rem", fontWeight: 700, color: C.inkDark, margin: "0 0 8px" }}>
              {searchQuery || filterCategory !== "all" ? "No matching credentials" : "All caught up!"}
            </h3>
            <p style={{ fontFamily: C.sans, fontSize: "0.88rem", color: C.inkLight, margin: 0 }}>
              {searchQuery || filterCategory !== "all"
                ? "Try adjusting your search or filter."
                : "There are no credentials pending review. New credentials added by staff will appear here."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((cred) => (
              <div key={cred.id} style={{
                background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 6,
                padding: "18px 20px",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 16,
                alignItems: "start",
              }}>
                {/* Left: credential info */}
                <div>
                  {/* Staff name + role */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{
                      fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      padding: "2px 8px", borderRadius: 3,
                      background: "rgba(29,61,47,0.08)", color: C.forest,
                    }}>
                      {cred.staffFirstName} {cred.staffLastName}
                    </span>
                    {cred.staffRole && (
                      <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint }}>
                        {cred.staffRole}
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/staff/${cred.staffId}`)}
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontFamily: C.sans, fontSize: "0.72rem", color: C.sage,
                        padding: 0, textDecoration: "underline",
                      }}
                    >
                      View profile
                    </button>
                  </div>

                  {/* Credential type + category */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontFamily: C.serif, fontSize: "1.15rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>
                      {cred.type}
                    </h3>
                    <span style={{
                      fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 600,
                      textTransform: "uppercase", letterSpacing: "0.06em",
                      color: C.inkFaint,
                    }}>
                      {categoryLabel(cred.category)}
                    </span>
                  </div>

                  {/* Meta row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 8 }}>
                    {cred.issuingBody && (
                      <span style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight }}>
                        <strong>Issuer:</strong> {cred.issuingBody}
                      </span>
                    )}
                    {cred.licenseNumber && (
                      <span style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight }}>
                        <strong>No.:</strong>{" "}
                        <span style={{ fontFamily: C.mono, fontSize: "0.75rem" }}>{cred.licenseNumber}</span>
                      </span>
                    )}
                    {cred.expirationDate && (
                      <span style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight }}>
                        <strong>Expires:</strong> {formatDate(cred.expirationDate)}
                      </span>
                    )}
                    <span style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkFaint }}>
                      Added {formatDate(cred.createdAt?.toString())}
                    </span>
                  </div>

                  {/* Document link */}
                  {cred.documentLink ? (
                    <a
                      href={cred.documentLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        fontFamily: C.sans, fontSize: "0.78rem", color: C.forest,
                        textDecoration: "none", fontWeight: 600,
                        padding: "4px 10px", borderRadius: 3,
                        border: `1px solid ${C.forest}`,
                        background: "rgba(29,61,47,0.04)",
                      }}
                    >
                      <ExternalLink size={12} /> Open Document
                    </a>
                  ) : (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint,
                      fontStyle: "italic",
                    }}>
                      <FileText size={12} /> No document link provided
                    </span>
                  )}

                  {cred.notes && (
                    <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight, marginTop: 6, fontStyle: "italic" }}>
                      Note: {cred.notes}
                    </p>
                  )}
                </div>

                {/* Right: action buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 180 }}>
                  <button
                    onClick={() => openNotesModal(cred.id, "verified")}
                    disabled={verifyingId === cred.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px 14px", border: "none", borderRadius: 4,
                      background: "rgba(58,140,92,0.1)", color: C.green,
                      fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
                      cursor: verifyingId === cred.id ? "not-allowed" : "pointer",
                      opacity: verifyingId === cred.id ? 0.6 : 1,
                    }}
                    title="Mark as Verified — admin approval required"
                  >
                    {verifyingId === cred.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                    Mark Verified
                  </button>
                  <button
                    onClick={() => openNotesModal(cred.id, "needs_review")}
                    disabled={verifyingId === cred.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px 14px", border: "none", borderRadius: 4,
                      background: "rgba(196,134,42,0.1)", color: C.amber,
                      fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
                      cursor: verifyingId === cred.id ? "not-allowed" : "pointer",
                      opacity: verifyingId === cred.id ? 0.6 : 1,
                    }}
                  >
                    <RefreshCw size={13} /> Needs Review
                  </button>
                  <button
                    onClick={() => openNotesModal(cred.id, "not_found")}
                    disabled={verifyingId === cred.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px 14px", border: "none", borderRadius: 4,
                      background: "rgba(184,64,64,0.08)", color: C.red,
                      fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
                      cursor: verifyingId === cred.id ? "not-allowed" : "pointer",
                      opacity: verifyingId === cred.id ? 0.6 : 1,
                    }}
                  >
                    <XCircle size={13} /> Not Found
                  </button>
                  <button
                    onClick={() => openNotesModal(cred.id, "manual_review_required")}
                    disabled={verifyingId === cred.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      padding: "8px 14px", border: "none", borderRadius: 4,
                      background: "rgba(100,100,100,0.08)", color: C.inkMid,
                      fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
                      cursor: verifyingId === cred.id ? "not-allowed" : "pointer",
                      opacity: verifyingId === cred.id ? 0.6 : 1,
                    }}
                  >
                    <Clock size={13} /> Manual Review Required
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Phase 1 disclaimer */}
        <p style={{
          fontFamily: C.sans, fontSize: "0.72rem", color: C.inkFaint,
          marginTop: 32, textAlign: "center", lineHeight: 1.6,
        }}>
          Phase 1: AuditReady stores document links only — no files are uploaded or retained.
          Always open and review the original document before approving.
        </p>
      </div>

      {/* Verification notes modal */}
      {showNotesModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(28,25,23,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 1000, padding: 24,
        }}>
          <div style={{
            background: C.cream, borderRadius: 6, width: "100%", maxWidth: 440,
            border: `1px solid ${C.rule}`,
            boxShadow: "0 8px 40px rgba(28,25,23,0.18)",
            padding: "24px",
          }}>
            <h3 style={{ fontFamily: C.serif, fontSize: "1.25rem", fontWeight: 700, color: C.inkDark, margin: "0 0 8px" }}>
              {showNotesModal.action === "verified" ? "Mark as Verified" :
               showNotesModal.action === "not_found" ? "Mark as Not Found" :
               showNotesModal.action === "manual_review_required" ? "Flag: Manual Review Required" : "Flag for Review"}
            </h3>
            <p style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight, margin: "0 0 16px" }}>
              Add an optional note explaining your decision.
            </p>
            <textarea
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              placeholder={
                showNotesModal.action === "verified" ? "e.g., Verified against BACB registry on 5/18/2026" :
                showNotesModal.action === "not_found" ? "e.g., License number does not match state board records" :
                showNotesModal.action === "manual_review_required" ? "e.g., Cannot confirm via online registry — requires manual check" :
                "e.g., Expiration date is missing from the document"
              }
              style={{
                width: "100%", padding: "9px 12px",
                border: `1px solid ${C.rule}`, borderRadius: 4,
                fontFamily: C.sans, fontSize: "0.83rem", color: C.inkDark,
                background: C.parchment, outline: "none",
                minHeight: 80, resize: "vertical", boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button
                onClick={() => { setShowNotesModal(null); setVerificationNotes(""); }}
                style={{
                  padding: "9px 18px", border: `1px solid ${C.rule}`, borderRadius: 4,
                  background: "transparent", fontFamily: C.sans, fontSize: "0.82rem",
                  color: C.inkMid, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerify(showNotesModal.credentialId, showNotesModal.action, verificationNotes)}
                disabled={verifyingId === showNotesModal.credentialId}
                style={{
                  padding: "9px 20px", border: "none", borderRadius: 4,
                  background: showNotesModal.action === "verified" ? C.forest : showNotesModal.action === "not_found" ? C.red : showNotesModal.action === "manual_review_required" ? C.inkMid : C.amber,
                  color: "#F0EBE3",
                  fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {verifyingId === showNotesModal.credentialId && <Loader2 size={13} className="animate-spin" />}
                {showNotesModal.action === "verified" ? "Mark Verified" :
                 showNotesModal.action === "not_found" ? "Mark Not Found" :
                 showNotesModal.action === "manual_review_required" ? "Flag Manual Review" : "Flag for Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
