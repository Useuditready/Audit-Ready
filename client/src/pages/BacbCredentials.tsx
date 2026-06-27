import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronUp, Trash2, BookOpen, Award, AlertTriangle, CheckCircle, Clock } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────

const CERT_LABELS: Record<string, string> = {
  bcba: "BCBA",
  bcaba: "BCaBA",
  rbt: "RBT",
};

const CERT_CEU_DEFAULTS: Record<string, { ceuRequired: number; ceuEthicsRequired: number }> = {
  bcba: { ceuRequired: 32, ceuEthicsRequired: 3 },
  bcaba: { ceuRequired: 20, ceuEthicsRequired: 1 },
  rbt: { ceuRequired: 20, ceuEthicsRequired: 1 },
};

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatHours(tenths: number) {
  return (tenths / 10).toFixed(1);
}

function StatusBadge({ expirationDate }: { expirationDate: string | null | undefined }) {
  const days = daysUntil(expirationDate);
  if (days === null) return <Badge variant="secondary">No Expiry Set</Badge>;
  if (days < 0) return <Badge className="bg-red-100 text-red-700 border-red-200">Expired</Badge>;
  if (days <= 90) return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Expiring in {days}d</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Current</Badge>;
}

function CeuProgressBar({ completed, required, label }: { completed: number; required: number; label: string }) {
  const pct = required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0;
  const done = completed >= required;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className={done ? "text-emerald-600 font-medium" : ""}>
          {formatHours(completed)} / {formatHours(required)} hrs {done && "✓"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : pct >= 75 ? "bg-amber-400" : "bg-[#3A8C5C]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Add Certification Modal ───────────────────────────────────────

function AddCertModal({
  open,
  onClose,
  staffList,
}: {
  open: boolean;
  onClose: () => void;
  staffList: { id: number; firstName: string; lastName: string; role: string }[];
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    staffId: "",
    certType: "bcba",
    certNumber: "",
    issueDate: "",
    expirationDate: "",
    renewalCycleStartDate: "",
    renewalCycleEndDate: "",
    notes: "",
  });

  const create = trpc.bacb.createCertification.useMutation({
    onSuccess: () => {
      utils.bacb.listCertifications.invalidate();
      toast.success("Certification added");
      onClose();
      setForm({ staffId: "", certType: "bcba", certNumber: "", issueDate: "", expirationDate: "", renewalCycleStartDate: "", renewalCycleEndDate: "", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.staffId) return toast.error("Select a staff member");
    create.mutate({
      staffId: Number(form.staffId),
      certType: form.certType as "bcba" | "bcaba" | "rbt",
      certNumber: form.certNumber || undefined,
      issueDate: form.issueDate || undefined,
      expirationDate: form.expirationDate || undefined,
      renewalCycleStartDate: form.renewalCycleStartDate || undefined,
      renewalCycleEndDate: form.renewalCycleEndDate || undefined,
      notes: form.notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add BACB Certification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Staff Member *</Label>
              <Select value={form.staffId} onValueChange={(v) => setForm((f) => ({ ...f, staffId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.firstName} {s.lastName} — {s.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Certification Type *</Label>
              <Select value={form.certType} onValueChange={(v) => setForm((f) => ({ ...f, certType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bcba">BCBA</SelectItem>
                  <SelectItem value="bcaba">BCaBA</SelectItem>
                  <SelectItem value="rbt">RBT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Certification Number</Label>
              <Input placeholder="e.g. 1-23-45678" value={form.certNumber} onChange={(e) => setForm((f) => ({ ...f, certNumber: e.target.value }))} />
            </div>
            <div>
              <Label>Issue Date</Label>
              <Input type="date" value={form.issueDate} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
            </div>
            <div>
              <Label>Expiration Date</Label>
              <Input type="date" value={form.expirationDate} onChange={(e) => setForm((f) => ({ ...f, expirationDate: e.target.value }))} />
            </div>
            <div>
              <Label>Renewal Cycle Start</Label>
              <Input type="date" value={form.renewalCycleStartDate} onChange={(e) => setForm((f) => ({ ...f, renewalCycleStartDate: e.target.value }))} />
            </div>
            <div>
              <Label>Renewal Cycle End</Label>
              <Input type="date" value={form.renewalCycleEndDate} onChange={(e) => setForm((f) => ({ ...f, renewalCycleEndDate: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Optional notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            CEU requirements are set automatically by cert type (BCBA: 32 hrs / 3 ethics; BCaBA/RBT: 20 hrs / 1 ethics). You can add CEU records after saving.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Saving…" : "Add Certification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Add CEU Record Modal ──────────────────────────────────────────

function AddCeuModal({
  open,
  onClose,
  certId,
  staffId,
}: {
  open: boolean;
  onClose: () => void;
  certId: number;
  staffId: number;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    title: "",
    provider: "",
    completedDate: "",
    hoursStr: "",
    isEthics: false,
  });

  const add = trpc.bacb.addCeuRecord.useMutation({
    onSuccess: () => {
      utils.bacb.listCertifications.invalidate();
      utils.bacb.listCeuRecords.invalidate({ bacbCertId: certId });
      toast.success("CEU record added");
      onClose();
      setForm({ title: "", provider: "", completedDate: "", hoursStr: "", isEthics: false });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.title || !form.completedDate || !form.hoursStr) {
      return toast.error("Title, date, and hours are required");
    }
    const hoursFloat = parseFloat(form.hoursStr);
    if (isNaN(hoursFloat) || hoursFloat <= 0) {
      return toast.error("Enter a valid number of hours");
    }
    // Store as tenths*10 (e.g. 1.5 hrs → 15)
    const hours = Math.round(hoursFloat * 10);
    add.mutate({
      staffId,
      bacbCertId: certId,
      title: form.title,
      provider: form.provider || undefined,
      completedDate: form.completedDate,
      hours,
      isEthics: form.isEthics,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add CEU Record</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Training / Course Title *</Label>
            <Input placeholder="e.g. Ethics in ABA Practice" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <Label>Provider / Organization</Label>
            <Input placeholder="e.g. BACB, ABAI, Relias" value={form.provider} onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Completion Date *</Label>
              <Input type="date" value={form.completedDate} onChange={(e) => setForm((f) => ({ ...f, completedDate: e.target.value }))} />
            </div>
            <div>
              <Label>Hours *</Label>
              <Input type="number" step="0.5" min="0.5" placeholder="e.g. 1.5" value={form.hoursStr} onChange={(e) => setForm((f) => ({ ...f, hoursStr: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isEthics"
              checked={form.isEthics}
              onChange={(e) => setForm((f) => ({ ...f, isEthics: e.target.checked }))}
              className="rounded border-border"
            />
            <Label htmlFor="isEthics" className="cursor-pointer">Ethics training (counts toward ethics requirement)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={add.isPending}>
            {add.isPending ? "Saving…" : "Add CEU Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Cert Card ─────────────────────────────────────────────────────

function CertCard({ row }: { row: any }) {
  const [expanded, setExpanded] = useState(false);
  const [addCeu, setAddCeu] = useState(false);
  const utils = trpc.useUtils();

  const cert = row.cert;
  const staffName = row.staffFirstName && row.staffLastName
    ? `${row.staffFirstName} ${row.staffLastName}`
    : "Unknown Staff";

  const ceuRecords = trpc.bacb.listCeuRecords.useQuery(
    { bacbCertId: cert.id },
    { enabled: expanded }
  );

  const deleteCert = trpc.bacb.deleteCertification.useMutation({
    onSuccess: () => {
      utils.bacb.listCertifications.invalidate();
      toast.success("Certification deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteCeu = trpc.bacb.deleteCeuRecord.useMutation({
    onSuccess: () => {
      utils.bacb.listCertifications.invalidate();
      utils.bacb.listCeuRecords.invalidate({ bacbCertId: cert.id });
      toast.success("CEU record removed");
    },
    onError: (e) => toast.error(e.message),
  });

  const days = daysUntil(cert.expirationDate);
  const isUrgent = days !== null && days <= 90;

  return (
    <div className={`rounded-lg border bg-card ${isUrgent ? "border-amber-200" : "border-border"}`}>
      {/* Header row */}
      <div className="flex items-start justify-between p-4 gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            cert.certType === "bcba" ? "bg-[#1D3D2F] text-white" :
            cert.certType === "bcaba" ? "bg-[#3A8C5C] text-white" :
            "bg-amber-100 text-amber-800"
          }`}>
            {CERT_LABELS[cert.certType]}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm">{staffName}</div>
            <div className="text-xs text-muted-foreground">
              {CERT_LABELS[cert.certType]} Certification
              {cert.certNumber && <span className="ml-2 font-mono">#{cert.certNumber}</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Expires: {formatDate(cert.expirationDate)}
              {cert.renewalCycleEndDate && <span className="ml-3">Cycle ends: {formatDate(cert.renewalCycleEndDate)}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge expirationDate={cert.expirationDate} />
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete ${CERT_LABELS[cert.certType]} certification for ${staffName}? This will also delete all CEU records.`)) {
                deleteCert.mutate({ id: cert.id });
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* CEU Progress bars */}
      <div className="px-4 pb-3 space-y-2">
        <CeuProgressBar
          completed={cert.ceuCompleted}
          required={cert.ceuRequired}
          label="Total CEU Hours"
        />
        <CeuProgressBar
          completed={cert.ceuEthicsCompleted}
          required={cert.ceuEthicsRequired}
          label="Ethics Hours"
        />
      </div>

      {/* Expanded CEU records */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CEU Records</span>
            <Button size="sm" variant="outline" onClick={() => setAddCeu(true)}>
              <Plus className="w-3 h-3 mr-1" /> Add CEU
            </Button>
          </div>
          {ceuRecords.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {ceuRecords.data && ceuRecords.data.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No CEU records yet. Add training completions above.</p>
          )}
          {ceuRecords.data?.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
              <div className="min-w-0">
                <span className="font-medium">{r.title}</span>
                {r.provider && <span className="text-muted-foreground ml-2">— {r.provider}</span>}
                {r.isEthics && <Badge className="ml-2 text-[10px] py-0 px-1 bg-purple-100 text-purple-700">Ethics</Badge>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                <span className="text-muted-foreground">{formatDate(r.completedDate)}</span>
                <span className="font-mono font-medium">{formatHours(r.hours)} hrs</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm("Remove this CEU record?")) deleteCeu.mutate({ id: r.id });
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addCeu && (
        <AddCeuModal
          open={addCeu}
          onClose={() => setAddCeu(false)}
          certId={cert.id}
          staffId={cert.staffId}
        />
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function BacbCredentials() {
  const [addOpen, setAddOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const certs = trpc.bacb.listCertifications.useQuery({ });
  const staffQuery = trpc.staff.list.useQuery(undefined);

  const staffList = useMemo(() => {
    return (staffQuery.data ?? []).map((s: any) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
    }));
  }, [staffQuery.data]);

  const filtered = useMemo(() => {
    const rows = certs.data ?? [];
    return rows.filter((row: any) => {
      const matchType = filterType === "all" || row.cert.certType === filterType;
      const name = `${row.staffFirstName ?? ""} ${row.staffLastName ?? ""}`.toLowerCase();
      const matchSearch = !search || name.includes(search.toLowerCase()) || (row.cert.certNumber ?? "").toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [certs.data, filterType, search]);

  // Summary stats
  const stats = useMemo(() => {
    const rows = certs.data ?? [];
    const total = rows.length;
    const expiringSoon = rows.filter((r: any) => {
      const d = daysUntil(r.cert.expirationDate);
      return d !== null && d >= 0 && d <= 90;
    }).length;
    const expired = rows.filter((r: any) => {
      const d = daysUntil(r.cert.expirationDate);
      return d !== null && d < 0;
    }).length;
    const ceuBehind = rows.filter((r: any) => r.cert.ceuCompleted < r.cert.ceuRequired).length;
    return { total, expiringSoon, expired, ceuBehind };
  }, [certs.data]);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">BACB Certifications</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track BCBA, BCaBA, and RBT certifications — expiration dates, renewal cycles, and CEU progress. No patient data stored.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Certification
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total Certifications</div>
          </div>
          <div className={`rounded-lg border p-3 text-center ${stats.expiringSoon > 0 ? "border-amber-200 bg-amber-50" : "bg-card"}`}>
            <div className={`text-2xl font-bold ${stats.expiringSoon > 0 ? "text-amber-700" : ""}`}>{stats.expiringSoon}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Expiring Within 90 Days</div>
          </div>
          <div className={`rounded-lg border p-3 text-center ${stats.expired > 0 ? "border-red-200 bg-red-50" : "bg-card"}`}>
            <div className={`text-2xl font-bold ${stats.expired > 0 ? "text-red-700" : ""}`}>{stats.expired}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Expired</div>
          </div>
          <div className={`rounded-lg border p-3 text-center ${stats.ceuBehind > 0 ? "border-amber-200 bg-amber-50" : "bg-card"}`}>
            <div className={`text-2xl font-bold ${stats.ceuBehind > 0 ? "text-amber-700" : ""}`}>{stats.ceuBehind}</div>
            <div className="text-xs text-muted-foreground mt-0.5">CEU Hours Incomplete</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Input
            placeholder="Search by name or cert number…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="bcba">BCBA</SelectItem>
              <SelectItem value="bcaba">BCaBA</SelectItem>
              <SelectItem value="rbt">RBT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* BACB requirement note */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          <strong>BACB CEU Requirements:</strong> BCBA — 32 hrs total / 3 ethics hrs per 2-year cycle. BCaBA — 20 hrs / 1 ethics hr. RBT — 20 hrs / 1 ethics hr per 2-year cycle.
          CEU totals update automatically when you add or remove records.
        </div>

        {/* Cert list */}
        {certs.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}
        {!certs.isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No BACB certifications yet</p>
            <p className="text-sm mt-1">Add a certification to start tracking CEU progress and renewal cycles.</p>
          </div>
        )}
        <div className="space-y-3">
          {filtered.map((row: any) => (
            <CertCard key={row.cert.id} row={row} />
          ))}
        </div>
      </div>

      <AddCertModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        staffList={staffList}
      />
    </DashboardLayout>
  );
}
