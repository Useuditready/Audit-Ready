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
import { Plus, Trash2, CheckCircle, XCircle, Users, Download, AlertTriangle } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────

function getCurrentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthYear(my: string) {
  const [year, month] = my.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function generateMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    options.push({ value: val, label: formatMonthYear(val) });
  }
  return options;
}

const MONTH_OPTIONS = generateMonthOptions();

// ── Log Supervision Modal ─────────────────────────────────────────

function LogSupervisionModal({
  open,
  onClose,
  staffList,
  selectedMonth,
}: {
  open: boolean;
  onClose: () => void;
  staffList: { id: number; firstName: string; lastName: string; role: string }[];
  selectedMonth: string;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    staffId: "",
    supervisorStaffId: "",
    monthYear: selectedMonth,
    totalHoursStr: "",
    supervisionHoursStr: "",
    notes: "",
  });

  const rbtList = staffList.filter((s) =>
    s.role?.toLowerCase().includes("rbt") || s.role?.toLowerCase().includes("registered")
  );
  const bcbaList = staffList.filter((s) =>
    s.role?.toLowerCase().includes("bcba") ||
    s.role?.toLowerCase().includes("bcaba") ||
    s.role?.toLowerCase().includes("supervisor")
  );
  // If no filtered list, show all staff
  const rbtOptions = rbtList.length > 0 ? rbtList : staffList;
  const supervisorOptions = bcbaList.length > 0 ? bcbaList : staffList;

  const upsert = trpc.bacb.upsertSupervision.useMutation({
    onSuccess: (data) => {
      utils.bacb.listSupervision.invalidate();
      utils.bacb.supervisionSummary.invalidate();
      const ratio = data.ratioPercent ?? 0;
      const compliant = data.isCompliant;
      toast.success(
        `Supervision logged — ${ratio}% ratio. ${compliant ? "✓ Compliant (≥5%)" : "⚠ Non-compliant (<5%)"}`
      );
      onClose();
      setForm({ staffId: "", supervisorStaffId: "", monthYear: selectedMonth, totalHoursStr: "", supervisionHoursStr: "", notes: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!form.staffId) return toast.error("Select an RBT");
    const total = parseInt(form.totalHoursStr);
    const supervision = parseInt(form.supervisionHoursStr);
    if (isNaN(total) || total <= 0) return toast.error("Enter valid total hours worked");
    if (isNaN(supervision) || supervision < 0) return toast.error("Enter valid supervision hours");
    if (supervision > total) return toast.error("Supervision hours cannot exceed total hours worked");

    upsert.mutate({
      staffId: Number(form.staffId),
      supervisorStaffId: form.supervisorStaffId ? Number(form.supervisorStaffId) : undefined,
      monthYear: form.monthYear,
      totalHoursWorked: total,
      supervisionHoursLogged: supervision,
      notes: form.notes || undefined,
    });
  };

  // Live ratio preview
  const total = parseInt(form.totalHoursStr) || 0;
  const supervision = parseInt(form.supervisionHoursStr) || 0;
  const previewRatio = total > 0 ? Math.round((supervision / total) * 100) : null;
  const previewCompliant = previewRatio !== null && previewRatio >= 5;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Log Supervision Hours</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            <strong>De-identified tracking only.</strong> Enter hours only — no client names, session details, or clinical notes. BACB minimum: 5% of total hours worked per month.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>RBT Staff Member *</Label>
              <Select value={form.staffId} onValueChange={(v) => setForm((f) => ({ ...f, staffId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select RBT" /></SelectTrigger>
                <SelectContent>
                  {rbtOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.firstName} {s.lastName}
                      {s.role && <span className="text-muted-foreground ml-1">— {s.role}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Supervising BCBA</Label>
              <Select value={form.supervisorStaffId} onValueChange={(v) => setForm((f) => ({ ...f, supervisorStaffId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select supervisor (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Not specified —</SelectItem>
                  {supervisorOptions.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.firstName} {s.lastName}
                      {s.role && <span className="text-muted-foreground ml-1">— {s.role}</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Month *</Label>
              <Select value={form.monthYear} onValueChange={(v) => setForm((f) => ({ ...f, monthYear: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Total Hours Worked *</Label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 80"
                value={form.totalHoursStr}
                onChange={(e) => setForm((f) => ({ ...f, totalHoursStr: e.target.value }))}
              />
            </div>

            <div className="col-span-2">
              <Label>Supervision Hours Logged *</Label>
              <Input
                type="number"
                min="0"
                placeholder="e.g. 5"
                value={form.supervisionHoursStr}
                onChange={(e) => setForm((f) => ({ ...f, supervisionHoursStr: e.target.value }))}
              />
            </div>

            {/* Live ratio preview */}
            {previewRatio !== null && (
              <div className={`col-span-2 rounded-lg p-3 text-sm font-medium flex items-center gap-2 ${
                previewCompliant ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {previewCompliant
                  ? <CheckCircle className="w-4 h-4" />
                  : <XCircle className="w-4 h-4" />
                }
                Supervision ratio: <strong>{previewRatio}%</strong>
                {previewCompliant ? " — Compliant (≥5% BACB minimum)" : " — Non-compliant (<5% BACB minimum)"}
              </div>
            )}

            <div className="col-span-2">
              <Label>Admin Notes</Label>
              <Textarea
                rows={2}
                placeholder="Optional internal notes — no client names or clinical content"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={upsert.isPending}>
            {upsert.isPending ? "Saving…" : "Log Hours"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function SupervisionRatios() {
  const [logOpen, setLogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [search, setSearch] = useState("");

  const logs = trpc.bacb.listSupervision.useQuery({ monthYear: selectedMonth });
  const summary = trpc.bacb.supervisionSummary.useQuery({ monthYear: selectedMonth });
  const staffQuery = trpc.staff.list.useQuery(undefined);

  const staffList = useMemo(() => {
    return (staffQuery.data ?? []).map((s: any) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      role: s.role,
    }));
  }, [staffQuery.data]);

  const utils = trpc.useUtils();

  const deleteLog = trpc.bacb.deleteSupervision.useMutation({
    onSuccess: () => {
      utils.bacb.listSupervision.invalidate();
      utils.bacb.supervisionSummary.invalidate();
      toast.success("Entry deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const rows = logs.data ?? [];
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r: any) => {
      const name = `${r.rbtFirstName ?? ""} ${r.rbtLastName ?? ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [logs.data, search]);

  // CSV export
  const handleExport = () => {
    const rows = logs.data ?? [];
    if (rows.length === 0) return toast.error("No data to export");
    const header = ["Month", "RBT Name", "Total Hours Worked", "Supervision Hours", "Ratio %", "Compliant", "Notes"];
    const lines = rows.map((r: any) => [
      r.log.monthYear,
      `${r.rbtFirstName ?? ""} ${r.rbtLastName ?? ""}`.trim(),
      r.log.totalHoursWorked,
      r.log.supervisionHoursLogged,
      r.log.ratioPercent + "%",
      r.log.isCompliant ? "Yes" : "No",
      (r.log.notes ?? "").replace(/,/g, ";"),
    ]);
    const csv = [header, ...lines].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supervision-ratios-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  };

  const summ = summary.data;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">RBT Supervision Ratios</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track monthly supervision hours per RBT. BACB minimum: 5% of total hours worked. No client names or PHI stored.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={() => setLogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Log Hours
            </Button>
          </div>
        </div>

        {/* Month selector + search */}
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Search by RBT name…"
            className="max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Monthly summary cards */}
        {summ && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-card p-3 text-center">
              <div className="text-2xl font-bold">{summ.total}</div>
              <div className="text-xs text-muted-foreground mt-0.5">RBTs Logged</div>
            </div>
            <div className={`rounded-lg border p-3 text-center ${summ.compliant > 0 ? "border-emerald-200 bg-emerald-50" : "bg-card"}`}>
              <div className={`text-2xl font-bold ${summ.compliant > 0 ? "text-emerald-700" : ""}`}>{summ.compliant}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Compliant (≥5%)</div>
            </div>
            <div className={`rounded-lg border p-3 text-center ${summ.nonCompliant > 0 ? "border-red-200 bg-red-50" : "bg-card"}`}>
              <div className={`text-2xl font-bold ${summ.nonCompliant > 0 ? "text-red-700" : ""}`}>{summ.nonCompliant}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Non-Compliant (&lt;5%)</div>
            </div>
          </div>
        )}

        {/* BACB requirement note */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>BACB Requirement:</strong> RBTs must receive ongoing supervision equal to at least 5% of the hours they provide behavior-analytic services each month. This is a BACB certification requirement and a common audit finding. Tracking is de-identified — hours only, no client information.
        </div>

        {/* Table */}
        {logs.isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!logs.isLoading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No supervision entries for {formatMonthYear(selectedMonth)}</p>
            <p className="text-sm mt-1">Click "Log Hours" to record supervision hours for an RBT this month.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">RBT</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total Hrs</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Supervision Hrs</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ratio</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => {
                  const log = r.log;
                  const name = `${r.rbtFirstName ?? ""} ${r.rbtLastName ?? ""}`.trim() || "Unknown";
                  return (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{name}</td>
                      <td className="px-4 py-3 text-right font-mono">{log.totalHoursWorked}</td>
                      <td className="px-4 py-3 text-right font-mono">{log.supervisionHoursLogged}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono font-semibold ${log.isCompliant ? "text-emerald-700" : "text-red-700"}`}>
                          {log.ratioPercent}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.isCompliant ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle className="w-3 h-3 mr-1" /> Compliant
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-red-200">
                            <XCircle className="w-3 h-3 mr-1" /> Non-Compliant
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                          onClick={() => {
                            if (confirm(`Delete supervision entry for ${name}?`)) {
                              deleteLog.mutate({ id: log.id });
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          AuditReady tracks hours and ratios only — no client names, session notes, or clinical information are stored. This tool is for administrative compliance tracking, not clinical documentation.
        </p>
      </div>

      <LogSupervisionModal
        open={logOpen}
        onClose={() => setLogOpen(false)}
        staffList={staffList}
        selectedMonth={selectedMonth}
      />
    </DashboardLayout>
  );
}
