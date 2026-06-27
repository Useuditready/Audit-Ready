import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Edit2, Trash2, CheckCircle, Clock, AlertTriangle,
  XCircle, Loader2, FileText, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { Provider } from "@shared/types";

// ── Types ──────────────────────────────────────────────────────
type PayerName = "bcbs" | "aetna" | "cigna" | "uhc_optum" | "medicaid" | "tricare" | "other";
type PayerStatus = "not_started" | "submitted" | "in_review" | "approved" | "needs_update" | "expired";
type DocLocationType = "none" | "paper" | "google_drive" | "dropbox" | "sharepoint" | "hr_system" | "ehr_system" | "other";

const PAYER_LABELS: Record<PayerName, string> = {
  bcbs: "BCBS",
  aetna: "Aetna",
  cigna: "Cigna",
  uhc_optum: "UnitedHealthcare / Optum",
  medicaid: "Medicaid",
  tricare: "Tricare",
  other: "Other",
};

const ALL_PAYERS: PayerName[] = ["bcbs", "aetna", "cigna", "uhc_optum", "medicaid", "tricare", "other"];

const DOC_LOCATION_LABELS: Record<DocLocationType, string> = {
  none: "Not specified",
  paper: "Paper file",
  google_drive: "Google Drive",
  dropbox: "Dropbox",
  sharepoint: "SharePoint",
  hr_system: "HR System",
  ehr_system: "EHR System",
  other: "Other",
};

// ── Status badge ───────────────────────────────────────────────
function PayerStatusBadge({ status }: { status: PayerStatus }) {
  const config: Record<PayerStatus, { label: string; className: string; icon: React.ReactNode }> = {
    not_started: { label: "Not Started", className: "bg-muted text-muted-foreground border", icon: <Clock size={11} /> },
    submitted: { label: "Submitted", className: "bg-blue-100 text-blue-700 border-blue-200", icon: <FileText size={11} /> },
    in_review: { label: "In Review", className: "bg-amber-100 text-amber-700 border-amber-200", icon: <Loader2 size={11} /> },
    approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CheckCircle size={11} /> },
    needs_update: { label: "Needs Update", className: "bg-orange-100 text-orange-700 border-orange-200", icon: <AlertTriangle size={11} /> },
    expired: { label: "Expired / Recredentialing Due", className: "bg-red-100 text-red-700 border-red-200", icon: <XCircle size={11} /> },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${c.className}`}>
      {c.icon}{c.label}
    </span>
  );
}

// ── Date helpers ───────────────────────────────────────────────
function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return d; }
}

function expiryClass(d: string | null | undefined) {
  if (!d) return "";
  const days = Math.ceil((new Date(d + "T00:00:00").getTime() - Date.now()) / 86400000);
  if (days < 0) return "text-red-600 font-medium";
  if (days <= 90) return "text-amber-600 font-medium";
  return "";
}

// ── Payer Status Row Edit Modal ────────────────────────────────
function PayerStatusModal({
  open, onClose, providerId, existing, payerName,
}: {
  open: boolean;
  onClose: () => void;
  providerId: number;
  existing?: { status: PayerStatus; submittedAt?: string | null; approvedAt?: string | null; expiresAt?: string | null; notes?: string | null; payerDisplayName?: string | null };
  payerName: PayerName;
}) {
  const utils = trpc.useUtils();
  const upsert = trpc.credentialing.upsertPayerStatus.useMutation({
    onSuccess: () => {
      utils.credentialing.listPayerStatuses.invalidate({ providerId });
      toast.success("Payer status updated");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    status: (existing?.status ?? "not_started") as PayerStatus,
    payerDisplayName: existing?.payerDisplayName ?? "",
    submittedAt: existing?.submittedAt ?? "",
    approvedAt: existing?.approvedAt ?? "",
    expiresAt: existing?.expiresAt ?? "",
    notes: existing?.notes ?? "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsert.mutate({
      providerId,
      payerName,
      payerDisplayName: payerName === "other" ? form.payerDisplayName || undefined : undefined,
      status: form.status,
      submittedAt: form.submittedAt || undefined,
      approvedAt: form.approvedAt || undefined,
      expiresAt: form.expiresAt || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {PAYER_LABELS[payerName]} — Credentialing Status
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {payerName === "other" && (
            <div className="space-y-1">
              <Label>Payer Name</Label>
              <Input value={form.payerDisplayName} onChange={e => set("payerDisplayName", e.target.value)} placeholder="Enter payer name" />
            </div>
          )}
          <div className="space-y-1">
            <Label>Status *</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="needs_update">Needs Update</SelectItem>
                <SelectItem value="expired">Expired / Recredentialing Due</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Submitted Date</Label>
              <Input type="date" value={form.submittedAt} onChange={e => set("submittedAt", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Approved Date</Label>
              <Input type="date" value={form.approvedAt} onChange={e => set("approvedAt", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Expiration / Recredentialing Due Date</Label>
            <Input type="date" value={form.expiresAt} onChange={e => set("expiresAt", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Application notes, follow-up items, contact info…" />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={upsert.isPending} className="bg-[#1D3D2F] hover:bg-[#2A5240] text-white">
              {upsert.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Provider Modal ────────────────────────────────────────
function EditProviderModal({
  open, onClose, provider,
}: {
  open: boolean;
  onClose: () => void;
  provider: Provider;
}) {
  const utils = trpc.useUtils();
  const update = trpc.credentialing.updateProvider.useMutation({
    onSuccess: () => {
      utils.credentialing.getProvider.invalidate({ providerId: provider.id });
      toast.success("Provider updated");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    firstName: provider.firstName,
    lastName: provider.lastName,
    role: provider.role ?? "",
    npi: provider.npi ?? "",
    caqhId: provider.caqhId ?? "",
    licenseType: provider.licenseType ?? "",
    licenseNumber: provider.licenseNumber ?? "",
    licenseExpirationDate: provider.licenseExpirationDate ?? "",
    malpracticeInsuranceExpiration: provider.malpracticeInsuranceExpiration ?? "",
    cprFirstAidExpiration: provider.cprFirstAidExpiration ?? "",
    backgroundCheckDate: provider.backgroundCheckDate ?? "",
    oigCheckDate: provider.oigCheckDate ?? "",
    recredentialingDueDate: provider.recredentialingDueDate ?? "",
    documentLocationType: (provider.documentLocationType ?? "none") as DocLocationType,
    documentLocationNote: provider.documentLocationNote ?? "",
    verifiedBy: provider.verifiedBy ?? "",
    notes: provider.notes ?? "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate({
      providerId: provider.id,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role || undefined,
      npi: form.npi || undefined,
      caqhId: form.caqhId || undefined,
      licenseType: form.licenseType || undefined,
      licenseNumber: form.licenseNumber || undefined,
      licenseExpirationDate: form.licenseExpirationDate || undefined,
      malpracticeInsuranceExpiration: form.malpracticeInsuranceExpiration || undefined,
      cprFirstAidExpiration: form.cprFirstAidExpiration || undefined,
      backgroundCheckDate: form.backgroundCheckDate || undefined,
      oigCheckDate: form.oigCheckDate || undefined,
      recredentialingDueDate: form.recredentialingDueDate || undefined,
      documentLocationType: form.documentLocationType,
      documentLocationNote: form.documentLocationNote || undefined,
      verifiedBy: form.verifiedBy || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Provider</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {/* Identity */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name *</Label>
                <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Last Name *</Label>
                <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div className="space-y-1">
                <Label>Role / Credential Type</Label>
                <Input value={form.role} onChange={e => set("role", e.target.value)} placeholder="e.g. BCBA, LCSW" />
              </div>
              <div className="space-y-1">
                <Label>NPI</Label>
                <Input value={form.npi} onChange={e => set("npi", e.target.value)} placeholder="10-digit NPI" maxLength={10} />
              </div>
              <div className="space-y-1">
                <Label>CAQH ID</Label>
                <Input value={form.caqhId} onChange={e => set("caqhId", e.target.value)} />
              </div>
            </div>
          </div>

          {/* License */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">License</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>License Type</Label>
                <Input value={form.licenseType} onChange={e => set("licenseType", e.target.value)} placeholder="e.g. LCSW, BCBA" />
              </div>
              <div className="space-y-1">
                <Label>License Number</Label>
                <Input value={form.licenseNumber} onChange={e => set("licenseNumber", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>License Expiration</Label>
                <Input type="date" value={form.licenseExpirationDate} onChange={e => set("licenseExpirationDate", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Other credential dates */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Credential Dates</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Malpractice Insurance Expiration</Label>
                <Input type="date" value={form.malpracticeInsuranceExpiration} onChange={e => set("malpracticeInsuranceExpiration", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>CPR / First Aid Expiration</Label>
                <Input type="date" value={form.cprFirstAidExpiration} onChange={e => set("cprFirstAidExpiration", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Background Check Date</Label>
                <Input type="date" value={form.backgroundCheckDate} onChange={e => set("backgroundCheckDate", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>OIG Check Date</Label>
                <Input type="date" value={form.oigCheckDate} onChange={e => set("oigCheckDate", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Recredentialing Due Date</Label>
                <Input type="date" value={form.recredentialingDueDate} onChange={e => set("recredentialingDueDate", e.target.value)} />
              </div>
            </div>
          </div>

          {/* Document location */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Document Location</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Where documents are stored</Label>
                <Select value={form.documentLocationType} onValueChange={v => set("documentLocationType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(DOC_LOCATION_LABELS) as [DocLocationType, string][]).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Link or location note</Label>
                <Input value={form.documentLocationNote} onChange={e => set("documentLocationNote", e.target.value)} placeholder="URL or folder path" />
              </div>
            </div>
          </div>

          {/* Verification */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Verification</p>
            <div className="space-y-1">
              <Label>Verified By</Label>
              <Input value={form.verifiedBy} onChange={e => set("verifiedBy", e.target.value)} placeholder="Name of person who verified" />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={update.isPending} className="bg-[#1D3D2F] hover:bg-[#2A5240] text-white">
              {update.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function ProviderDetail() {
  const params = useParams<{ id: string }>();
  const providerId = parseInt(params.id ?? "0", 10);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [showEdit, setShowEdit] = useState(false);
  const [payerModal, setPayerModal] = useState<PayerName | null>(null);

  const { data: provider, isLoading } = trpc.credentialing.getProvider.useQuery(
    { providerId },
    { enabled: !!providerId }
  );
  const { data: payerStatuses = [] } = trpc.credentialing.listPayerStatuses.useQuery(
    { providerId },
    { enabled: !!providerId }
  );
  const deleteProvider = trpc.credentialing.deleteProvider.useMutation({
    onSuccess: () => {
      toast.success("Provider deleted");
      navigate("/credentialing");
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Provider not found.</p>
        <Button variant="link" onClick={() => navigate("/credentialing")}>Back to Credentialing</Button>
      </div>
    );
  }

  // Build payer status map for quick lookup
  const statusMap = new Map(payerStatuses.map(s => [s.payerName, s]));

  const handleDelete = () => {
    if (!confirm(`Delete ${provider.firstName} ${provider.lastName} and all their payer credentialing records? This cannot be undone.`)) return;
    deleteProvider.mutate({ providerId });
  };

  return (
    <DashboardLayout><div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/credentialing")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft size={14} /> Payer Credentialing
          </button>
          <h1 className="text-2xl font-semibold text-foreground">
            {provider.firstName} {provider.lastName}
          </h1>
          {provider.role && <p className="text-muted-foreground text-sm mt-0.5">{provider.role}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 pt-8">
          <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="gap-1.5">
            <Edit2 size={13} /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} className="gap-1.5 text-red-600 hover:text-red-700 hover:border-red-300">
            <Trash2 size={13} /> Delete
          </Button>
        </div>
      </div>

      {/* Identity card */}
      <div className="bg-card border border-border rounded-lg p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Provider Identity</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">NPI</p>
            <p className="text-sm font-mono font-medium mt-0.5">{provider.npi || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CAQH ID</p>
            <p className="text-sm font-mono font-medium mt-0.5">{provider.caqhId || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">License Type</p>
            <p className="text-sm font-medium mt-0.5">{provider.licenseType || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">License Number</p>
            <p className="text-sm font-mono font-medium mt-0.5">{provider.licenseNumber || "—"}</p>
          </div>
        </div>
      </div>

      {/* Credential dates */}
      <div className="bg-card border border-border rounded-lg p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Credential Dates</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: "License Expiration", value: provider.licenseExpirationDate },
            { label: "Malpractice Insurance Exp.", value: provider.malpracticeInsuranceExpiration },
            { label: "CPR / First Aid Exp.", value: provider.cprFirstAidExpiration },
            { label: "Background Check Date", value: provider.backgroundCheckDate },
            { label: "OIG Check Date", value: provider.oigCheckDate },
            { label: "Recredentialing Due", value: provider.recredentialingDueDate },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-sm font-medium mt-0.5 ${expiryClass(value)}`}>{formatDate(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Document location */}
      <div className="bg-card border border-border rounded-lg p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Document Location</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Storage Type</p>
            <p className="text-sm font-medium mt-0.5">
              {DOC_LOCATION_LABELS[(provider.documentLocationType as DocLocationType) ?? "none"]}
            </p>
          </div>
          {provider.documentLocationNote && (
            <div>
              <p className="text-xs text-muted-foreground">Link / Note</p>
              {provider.documentLocationNote.startsWith("http") ? (
                <a
                  href={provider.documentLocationNote}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                >
                  Open document <ExternalLink size={12} />
                </a>
              ) : (
                <p className="text-sm font-medium mt-0.5">{provider.documentLocationNote}</p>
              )}
            </div>
          )}
        </div>
        {provider.verifiedBy && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">Verified By</p>
            <p className="text-sm font-medium mt-0.5">{provider.verifiedBy}</p>
          </div>
        )}
      </div>

      {/* Payer credentialing status table */}
      <div className="bg-card border border-border rounded-lg p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Payer Credentialing Status</p>
        <div className="space-y-1">
          {ALL_PAYERS.map(payer => {
            const row = statusMap.get(payer);
            const status = (row?.status ?? "not_started") as PayerStatus;
            return (
              <div
                key={payer}
                className="flex items-center justify-between gap-4 py-3 px-3 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium">
                      {row?.payerDisplayName && payer === "other" ? row.payerDisplayName : PAYER_LABELS[payer]}
                    </p>
                  </div>
                  <PayerStatusBadge status={status} />
                  {row && (
                    <div className="flex items-center gap-4 text-xs text-muted-foreground hidden sm:flex">
                      {row.submittedAt && <span>Submitted {formatDate(row.submittedAt)}</span>}
                      {row.approvedAt && <span>Approved {formatDate(row.approvedAt)}</span>}
                      {row.expiresAt && (
                        <span className={expiryClass(row.expiresAt)}>
                          Expires {formatDate(row.expiresAt)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setPayerModal(payer)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-xs h-7 px-2"
                >
                  <Edit2 size={12} className="mr-1" /> Edit
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      {provider.notes && (
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{provider.notes}</p>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <EditProviderModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          provider={provider}
        />
      )}

      {/* Payer status modal */}
      {payerModal && (
        <PayerStatusModal
          open={!!payerModal}
          onClose={() => setPayerModal(null)}
          providerId={providerId}
          payerName={payerModal}
          existing={statusMap.get(payerModal) as any}
        />
      )}
    </div></DashboardLayout>
  );
}
