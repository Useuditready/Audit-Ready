/**
 * AdminDeletionQueue — GDPR/CCPA Account Deletion Request Queue
 * Admin-only panel for reviewing and processing account deletion requests.
 * Irreversibly deletes all user data and sends a confirmation email to the user.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowLeft, Trash2, RefreshCw, AlertTriangle, Loader2,
  CheckCircle, Clock, Mail, Building2, Calendar, StickyNote, Save
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
  redBg:     "#FEF2F2",
  green:     "#2A7A4A",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
  serif:     "'DM Serif Display', Georgia, serif",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
};

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysSince(d: Date | string | null | undefined): number {
  if (!d) return 0;
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
}

function DaysChip({ requestedAt }: { requestedAt: Date | string | null | undefined }) {
  const days = daysSince(requestedAt);
  const isUrgent = days >= 25;
  const isWarning = days >= 15;
  const bg = isUrgent ? C.redBg : isWarning ? C.amberBg : "#F0F9FF";
  const color = isUrgent ? C.red : isWarning ? C.amber : C.sage;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: bg, color, borderRadius: 4, padding: "2px 8px",
      fontFamily: C.mono, fontSize: "0.7rem", fontWeight: 700,
    }}>
      {isUrgent && <AlertTriangle size={10} />}
      {days}d ago
    </span>
  );
}

export default function AdminDeletionQueue() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [editingNotesId, setEditingNotesId] = useState<number | null>(null);
  const [notesText, setNotesText] = useState<Record<number, string>>({});

  const { data: requests, isLoading, refetch } = trpc.devTools.listDeletionRequests.useQuery(undefined, {
    enabled: !authLoading && user?.role === "admin",
  });

  const updateNotesMutation = trpc.devTools.updateDeletionNotes.useMutation({
    onSuccess: (_, vars) => {
      toast.success("Notes saved");
      setEditingNotesId(null);
      refetch();
      // Update local state to reflect saved notes
      setNotesText(prev => ({ ...prev, [vars.userId]: vars.notes }));
    },
    onError: (err) => toast.error(`Failed to save notes: ${err.message}`),
  });

  const processMutation = trpc.devTools.processDeletion.useMutation({
    onSuccess: (data) => {
      toast.success(`Account deleted — confirmation email sent to ${data.email ?? "user"}`);
      setConfirmingId(null);
      setConfirmText("");
      refetch();
    },
    onError: (err) => {
      toast.error(`Deletion failed: ${err.message}`);
    },
  });

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={24} style={{ color: C.forest, animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <AlertTriangle size={32} style={{ color: C.red, margin: "0 auto 12px" }} />
          <p style={{ fontFamily: C.sans, color: C.inkMid }}>Admin access required.</p>
        </div>
      </div>
    );
  }

  const pendingCount = requests?.length ?? 0;
  const urgentCount = requests?.filter(r => daysSince(r.deletionRequestedAt) >= 25).length ?? 0;

  return (
    <DashboardLayout>
      {/* Header */}


      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
          <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 6, padding: "16px 20px", borderTop: `3px solid ${C.forest}` }}>
            <div style={{ fontFamily: C.mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 6 }}>Pending Requests</div>
            <div style={{ fontFamily: C.serif, fontSize: "2rem", fontWeight: 700, color: C.inkDark }}>{pendingCount}</div>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 6, padding: "16px 20px", borderTop: `3px solid ${urgentCount > 0 ? C.red : C.sage}` }}>
            <div style={{ fontFamily: C.mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 6 }}>Urgent (25+ days)</div>
            <div style={{ fontFamily: C.serif, fontSize: "2rem", fontWeight: 700, color: urgentCount > 0 ? C.red : C.inkDark }}>{urgentCount}</div>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 6, padding: "16px 20px", borderTop: `3px solid ${C.amber}` }}>
            <div style={{ fontFamily: C.mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 6 }}>GDPR Deadline</div>
            <div style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600, color: C.inkMid, marginTop: 4 }}>30 days from request</div>
          </div>
        </div>

        {/* Compliance notice */}
        <div style={{ background: C.amberBg, border: `1px solid #E8C97A`, borderRadius: 6, padding: "14px 18px", marginBottom: 28, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <AlertTriangle size={16} style={{ color: C.amber, flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid, lineHeight: 1.6 }}>
            <strong style={{ color: C.inkDark }}>GDPR/CCPA requirement:</strong> All deletion requests must be processed within 30 days of submission.
            Clicking "Process Deletion" is <strong>irreversible</strong> — all staff records, credentials, and account data will be permanently deleted.
            A confirmation email will be sent to the user automatically.
          </div>
        </div>

        {/* Request list */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <Loader2 size={24} style={{ color: C.forest, animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontFamily: C.sans, color: C.inkLight, fontSize: "0.85rem" }}>Loading deletion requests…</p>
          </div>
        ) : pendingCount === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 8 }}>
            <CheckCircle size={32} style={{ color: C.green, margin: "0 auto 12px" }} />
            <p style={{ fontFamily: C.serif, fontSize: "1.1rem", color: C.inkDark, margin: "0 0 6px" }}>No pending deletion requests</p>
            <p style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight, margin: 0 }}>All requests have been processed.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {requests!.map((req) => {
              const isConfirming = confirmingId === req.id;
              const days = daysSince(req.deletionRequestedAt);
              const isUrgent = days >= 25;
              return (
                <div key={req.id} style={{
                  background: "#fff",
                  border: `1px solid ${isUrgent ? "#FECACA" : C.rule}`,
                  borderRadius: 8,
                  overflow: "hidden",
                  borderLeft: `4px solid ${isUrgent ? C.red : C.amber}`,
                }}>
                  {/* Card header */}
                  <div style={{ padding: "18px 24px", display: "flex", alignItems: "flex-start", gap: 16 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: C.serif, fontSize: "1rem", fontWeight: 700, color: C.inkDark }}>
                          {req.name ?? "Unknown User"}
                        </span>
                        <DaysChip requestedAt={req.deletionRequestedAt} />
                        {isUrgent && (
                          <span style={{ background: C.redBg, color: C.red, borderRadius: 4, padding: "2px 8px", fontFamily: C.mono, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.08em" }}>
                            URGENT — DEADLINE APPROACHING
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                        {req.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: C.sans, fontSize: "0.8rem", color: C.inkLight }}>
                            <Mail size={12} /> {req.email}
                          </div>
                        )}
                        {req.agencyName && (
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: C.sans, fontSize: "0.8rem", color: C.inkLight }}>
                            <Building2 size={12} /> {req.agencyName}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: C.sans, fontSize: "0.8rem", color: C.inkLight }}>
                          <Calendar size={12} /> Requested {formatDate(req.deletionRequestedAt)}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: C.sans, fontSize: "0.8rem", color: C.inkLight }}>
                          <Clock size={12} /> Deadline {formatDate(req.deletionRequestedAt ? new Date(new Date(req.deletionRequestedAt).getTime() + 30 * 24 * 60 * 60 * 1000) : null)}
                        </div>
                      </div>
                      {req.deletionReason && (
                        <div style={{ marginTop: 10, background: C.linen, borderRadius: 4, padding: "10px 14px" }}>
                          <div style={{ fontFamily: C.mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 4 }}>Reason provided</div>
                          <p style={{ margin: 0, fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid, lineHeight: 1.6 }}>{req.deletionReason}</p>
                        </div>
                      )}

                      {/* Admin Notes */}
                      <div style={{ marginTop: 12 }}>
                        {editingNotesId === req.id ? (
                          <div>
                            <div style={{ fontFamily: C.mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 6 }}>Internal Notes (admin only)</div>
                            <textarea
                              value={notesText[req.id] ?? req.deletionAdminNotes ?? ""}
                              onChange={e => setNotesText(prev => ({ ...prev, [req.id]: e.target.value }))}
                              placeholder="e.g. Emailed user to confirm, waiting on billing confirmation…"
                              rows={3}
                              style={{
                                width: "100%", fontFamily: C.sans, fontSize: "0.82rem",
                                padding: "8px 12px", border: `1px solid ${C.rule}`, borderRadius: 4,
                                background: "#fff", color: C.inkDark, resize: "vertical",
                                outline: "none", lineHeight: 1.5, boxSizing: "border-box",
                              }}
                            />
                            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                              <button
                                onClick={() => updateNotesMutation.mutate({ userId: req.id, notes: notesText[req.id] ?? req.deletionAdminNotes ?? "" })}
                                disabled={updateNotesMutation.isPending}
                                style={{
                                  background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 4,
                                  padding: "6px 14px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.78rem",
                                  fontWeight: 600, display: "flex", alignItems: "center", gap: 5,
                                }}
                              >
                                {updateNotesMutation.isPending ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={11} />}
                                Save
                              </button>
                              <button
                                onClick={() => setEditingNotesId(null)}
                                style={{
                                  background: "transparent", color: C.inkMid, border: `1px solid ${C.rule}`,
                                  borderRadius: 4, padding: "6px 12px", cursor: "pointer",
                                  fontFamily: C.sans, fontSize: "0.78rem",
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingNotesId(req.id);
                              setNotesText(prev => ({ ...prev, [req.id]: req.deletionAdminNotes ?? "" }));
                            }}
                            style={{
                              background: "transparent", border: `1px dashed ${C.rule}`, borderRadius: 4,
                              padding: "7px 12px", cursor: "pointer", color: C.inkFaint,
                              fontFamily: C.sans, fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 6,
                            }}
                          >
                            <StickyNote size={12} />
                            {req.deletionAdminNotes
                              ? <span style={{ color: C.inkMid }}>{req.deletionAdminNotes.length > 80 ? req.deletionAdminNotes.slice(0, 80) + "…" : req.deletionAdminNotes}</span>
                              : "Add internal notes…"}
                          </button>
                        )}
                      </div>
                    </div>

                    {!isConfirming && (
                      <button
                        onClick={() => { setConfirmingId(req.id); setConfirmText(""); }}
                        style={{
                          background: C.redBg, color: C.red, border: `1px solid #FECACA`,
                          borderRadius: 4, padding: "8px 16px", cursor: "pointer",
                          fontFamily: C.sans, fontSize: "0.8rem", fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
                        }}
                      >
                        <Trash2 size={13} /> Process Deletion
                      </button>
                    )}
                  </div>

                  {/* Confirmation panel */}
                  {isConfirming && (
                    <div style={{ borderTop: `1px solid #FECACA`, background: C.redBg, padding: "18px 24px" }}>
                      <p style={{ margin: "0 0 12px", fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600, color: C.red }}>
                        ⚠ This will permanently delete all data for {req.name ?? req.email}. This cannot be undone.
                      </p>
                      <p style={{ margin: "0 0 12px", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid }}>
                        Type <strong>DELETE</strong> to confirm:
                      </p>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="text"
                          value={confirmText}
                          onChange={e => setConfirmText(e.target.value)}
                          placeholder="Type DELETE"
                          style={{
                            fontFamily: C.mono, fontSize: "0.85rem", padding: "8px 12px",
                            border: `1px solid #FECACA`, borderRadius: 4, background: "#fff",
                            color: C.inkDark, width: 160, outline: "none",
                          }}
                        />
                        <button
                          onClick={() => {
                            if (confirmText !== "DELETE") {
                              toast.error("Type DELETE to confirm");
                              return;
                            }
                            processMutation.mutate({ userId: req.id });
                          }}
                          disabled={confirmText !== "DELETE" || processMutation.isPending}
                          style={{
                            background: confirmText === "DELETE" ? C.red : "#D1D5DB",
                            color: "#fff", border: "none", borderRadius: 4,
                            padding: "8px 18px", cursor: confirmText === "DELETE" ? "pointer" : "not-allowed",
                            fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 700,
                            display: "flex", alignItems: "center", gap: 6,
                            transition: "background 150ms ease-out",
                          }}
                        >
                          {processMutation.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={13} />}
                          Confirm Deletion
                        </button>
                        <button
                          onClick={() => { setConfirmingId(null); setConfirmText(""); }}
                          style={{
                            background: "transparent", color: C.inkMid, border: `1px solid ${C.rule}`,
                            borderRadius: 4, padding: "8px 14px", cursor: "pointer",
                            fontFamily: C.sans, fontSize: "0.82rem",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
        </DashboardLayout>
  );
}
