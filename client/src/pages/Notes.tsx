/**
 * Note Compliance Page
 *
 * Tracks documentation timeliness for staff members (e.g. session notes).
 * AuditReady NEVER stores clinical content, PHI, or patient data.
 * Only metadata: who completed notes, when, and whether they were on time.
 *
 * Bug 1 fix: Export uses trpc.notes.exportCsv.useQuery({ enabled: false }) + refetch()
 *            — no raw fetch(), no missing auth tokens.
 * Bug 3 fix: Timeliness % uses safe math — no div-by-zero, no negative values.
 *            Formula: sessionsHeld > 0 ? max(0, (sessionsHeld - clamp(notesPending, 0, sessionsHeld)) / sessionsHeld * 100) : 100
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Download, Trash2, ClipboardList, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

// ── Safe timeliness math (Bug 3 fix) ─────────────────────────────────────────
// Guard against div-by-zero and negative values.
function calcTimeliness(sessionsHeld: number, notesPending: number): number {
  if (sessionsHeld <= 0) return 100; // no sessions → 100%
  const clampedPending = Math.min(Math.max(0, notesPending), sessionsHeld);
  return Math.max(0, Math.round(((sessionsHeld - clampedPending) / sessionsHeld) * 100));
}

function timelinessColor(pct: number): string {
  if (pct >= 90) return "#1D3D2F"; // forest green
  if (pct >= 70) return "#C4862A"; // amber
  return "#B84040"; // red
}

function timelinessLabel(pct: number): string {
  if (pct >= 90) return "On Track";
  if (pct >= 70) return "Needs Attention";
  return "At Risk";
}

// ── Get Monday of the week for a given date ───────────────────────────────────
function getMondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

// ── Generate last N weeks for the week picker ─────────────────────────────────
function getRecentWeeks(n = 12): { label: string; value: string }[] {
  const weeks: { label: string; value: string }[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i * 7);
    const monday = getMondayOf(d);
    const end = new Date(monday);
    end.setDate(end.getDate() + 6);
    const label = `Week of ${new Date(monday).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
    weeks.push({ label, value: monday });
  }
  return weeks;
}

type NoteLogRow = {
  id: number;
  staffId: number;
  weekOf: string;
  sessionsHeld: number;
  notesCompleted: number;
  notesPending: number;
  notesLate: number;
  supervisorReviewed: boolean;
  reviewerName: string | null;
  notes: string | null;
  staffFirstName: string;
  staffLastName: string;
  staffRole: string | null;
};

const WEEKS = getRecentWeeks(12);

export default function Notes() {
  const utils = trpc.useUtils();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterWeek, setFilterWeek] = useState<string>("all");
  const [filterStaff, setFilterStaff] = useState<string>("all");

  // ── Data queries ──────────────────────────────────────────────────────────
  const { data: noteLogs = [], isLoading } = trpc.notes.list.useQuery();
  const { data: staffList = [] } = trpc.staff.list.useQuery();

  // ── Bug 1 fix: Export uses enabled:false + refetch() — no raw fetch() ─────
  const exportQuery = trpc.notes.exportCsv.useQuery(undefined, { enabled: false });

  const handleExport = async () => {
    const result = await exportQuery.refetch();
    if (result.data) {
      const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Note compliance report downloaded");
    } else if (result.error) {
      toast.error("Failed to export: " + (result.error.message ?? "Unknown error"));
    }
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const upsertMutation = trpc.notes.upsert.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      setShowAddDialog(false);
      toast.success("Note log saved");
    },
    onError: (err) => toast.error("Failed to save: " + err.message),
  });

  const deleteMutation = trpc.notes.delete.useMutation({
    onSuccess: () => {
      utils.notes.list.invalidate();
      toast.success("Entry deleted");
    },
    onError: (err) => toast.error("Failed to delete: " + err.message),
  });

  // ── Filtered rows ─────────────────────────────────────────────────────────
  const filteredLogs = useMemo(() => {
    return (noteLogs as NoteLogRow[]).filter(log => {
      if (filterWeek !== "all" && log.weekOf !== filterWeek) return false;
      if (filterStaff !== "all" && String(log.staffId) !== filterStaff) return false;
      return true;
    });
  }, [noteLogs, filterWeek, filterStaff]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    const logs = noteLogs as NoteLogRow[];
    const totalSessions = logs.reduce((s, l) => s + (l.sessionsHeld ?? 0), 0);
    const totalPending = logs.reduce((s, l) => s + Math.min(l.notesPending ?? 0, l.sessionsHeld ?? 0), 0);
    const overallTimeliness = calcTimeliness(totalSessions, totalPending);
    const atRisk = logs.filter(l => calcTimeliness(l.sessionsHeld, l.notesPending) < 70).length;
    return { totalSessions, overallTimeliness, atRisk };
  }, [noteLogs]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-primary" />
              Note Compliance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track documentation timeliness for staff. No clinical content or patient data is stored.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={exportQuery.isFetching}
            >
              {exportQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export Report
            </Button>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Log Week
            </Button>
          </div>
        </div>

        {/* ── Summary cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Overall Timeliness</p>
            <p className="text-3xl font-bold" style={{ color: timelinessColor(summaryStats.overallTimeliness) }}>
              {summaryStats.overallTimeliness}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{timelinessLabel(summaryStats.overallTimeliness)}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Total Sessions Logged</p>
            <p className="text-3xl font-bold text-foreground">{summaryStats.totalSessions}</p>
            <p className="text-xs text-muted-foreground mt-1">Across all staff & weeks</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Staff At Risk</p>
            <p className="text-3xl font-bold" style={{ color: summaryStats.atRisk > 0 ? "#B84040" : "#1D3D2F" }}>
              {summaryStats.atRisk}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Below 70% timeliness</p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex gap-3 flex-wrap">
          <div className="w-56">
            <Select value={filterWeek} onValueChange={setFilterWeek}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All weeks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All weeks</SelectItem>
                {WEEKS.map(w => (
                  <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Select value={filterStaff} onValueChange={setFilterStaff}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff</SelectItem>
                {(staffList as any[]).map((s: any) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.firstName} {s.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Table ── */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg bg-muted/20">
            <ClipboardList className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No note logs found</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Log Week" to add your first entry.</p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Staff</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Week Of</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Sessions</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Completed</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Pending</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Late</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Timeliness</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Reviewed</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const pct = calcTimeliness(log.sessionsHeld, log.notesPending);
                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{log.staffFirstName} {log.staffLastName}</p>
                          {log.staffRole && (
                            <p className="text-xs text-muted-foreground">{log.staffRole}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.weekOf + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-center text-sm font-mono">{log.sessionsHeld}</TableCell>
                      <TableCell className="text-center text-sm font-mono">{log.notesCompleted}</TableCell>
                      <TableCell className="text-center text-sm font-mono">{Math.min(log.notesPending, log.sessionsHeld)}</TableCell>
                      <TableCell className="text-center text-sm font-mono">{log.notesLate}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-sm font-bold font-mono" style={{ color: timelinessColor(pct) }}>
                            {pct}%
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[0.6rem] px-1.5 py-0 border-0"
                            style={{ color: timelinessColor(pct), background: timelinessColor(pct) + "18" }}
                          >
                            {timelinessLabel(pct)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {log.supervisorReviewed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            if (confirm("Delete this note log entry?")) {
                              deleteMutation.mutate({ id: log.id });
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ── Add / Log Week Dialog ── */}
      <AddNoteLogDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        staffList={staffList as any[]}
        onSave={(data) => upsertMutation.mutate(data)}
        isSaving={upsertMutation.isPending}
      />
    </DashboardLayout>
  );
}

// ── Add Note Log Dialog ────────────────────────────────────────────────────────
function AddNoteLogDialog({
  open,
  onOpenChange,
  staffList,
  onSave,
  isSaving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staffList: { id: number; firstName: string; lastName: string; role: string | null }[];
  onSave: (data: any) => void;
  isSaving: boolean;
}) {
  const [staffId, setStaffId] = useState<string>("");
  const [weekOf, setWeekOf] = useState<string>(WEEKS[0].value);
  const [sessionsHeld, setSessionsHeld] = useState<string>("0");
  const [notesCompleted, setNotesCompleted] = useState<string>("0");
  const [notesPending, setNotesPending] = useState<string>("0");
  const [notesLate, setNotesLate] = useState<string>("0");
  const [supervisorReviewed, setSupervisorReviewed] = useState(false);
  const [reviewerName, setReviewerName] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const sessions = parseInt(sessionsHeld) || 0;
  const pending = parseInt(notesPending) || 0;
  // Bug 3 fix: preview timeliness with safe math
  const previewPct = calcTimeliness(sessions, pending);

  const handleSave = () => {
    if (!staffId) { toast.error("Please select a staff member"); return; }
    if (!weekOf) { toast.error("Please select a week"); return; }
    onSave({
      staffId: parseInt(staffId),
      weekOf,
      sessionsHeld: parseInt(sessionsHeld) || 0,
      notesCompleted: parseInt(notesCompleted) || 0,
      notesPending: parseInt(notesPending) || 0,
      notesLate: parseInt(notesLate) || 0,
      supervisorReviewed,
      reviewerName: reviewerName || undefined,
      notes: adminNotes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Note Compliance</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Disclaimer */}
          <div className="flex gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed">
              Record documentation timeliness only. Do not enter clinical content, patient names, or any PHI.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs font-medium">Staff Member</Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue placeholder="Select staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.firstName} {s.lastName}{s.role ? ` — ${s.role}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-xs font-medium">Week</Label>
              <Select value={weekOf} onValueChange={setWeekOf}>
                <SelectTrigger className="mt-1 h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKS.map(w => (
                    <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium">Sessions Held</Label>
              <Input className="mt-1 h-9" type="number" min="0" value={sessionsHeld} onChange={e => setSessionsHeld(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium">Notes Completed</Label>
              <Input className="mt-1 h-9" type="number" min="0" value={notesCompleted} onChange={e => setNotesCompleted(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium">Notes Pending</Label>
              <Input className="mt-1 h-9" type="number" min="0" value={notesPending} onChange={e => setNotesPending(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs font-medium">Notes Late</Label>
              <Input className="mt-1 h-9" type="number" min="0" value={notesLate} onChange={e => setNotesLate(e.target.value)} />
            </div>
          </div>

          {/* Timeliness preview */}
          {sessions > 0 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40 text-sm">
              <span className="text-muted-foreground text-xs">Timeliness preview</span>
              <span className="font-bold font-mono" style={{ color: timelinessColor(previewPct) }}>
                {previewPct}% — {timelinessLabel(previewPct)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Checkbox
              id="supervisorReviewed"
              checked={supervisorReviewed}
              onCheckedChange={(v) => setSupervisorReviewed(!!v)}
            />
            <Label htmlFor="supervisorReviewed" className="text-xs cursor-pointer">
              Supervisor has reviewed this week's documentation
            </Label>
          </div>

          {supervisorReviewed && (
            <div>
              <Label className="text-xs font-medium">Reviewer Name</Label>
              <Input
                className="mt-1 h-9"
                placeholder="e.g. Jane Smith, BCBA"
                value={reviewerName}
                onChange={e => setReviewerName(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label className="text-xs font-medium">Admin Notes (optional)</Label>
            <Input
              className="mt-1 h-9"
              placeholder="Internal notes — no clinical content"
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
