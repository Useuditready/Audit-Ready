import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, ChevronRight, User, Users, CheckCircle,
  AlertTriangle, Clock, RefreshCw, FileText,
} from "lucide-react";
import { toast } from "sonner";

// ── Recredentialing badge ──────────────────────────────────────
function getRecredentialingBadge(dueDateStr: string | null | undefined) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const now = new Date();
  const daysUntil = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0) return <Badge variant="destructive" className="text-xs">Recredentialing Overdue</Badge>;
  if (daysUntil <= 90) return <Badge className="text-xs bg-amber-500 hover:bg-amber-500 text-white">Recredentialing Due in {daysUntil}d</Badge>;
  return null;
}

// ── Add Provider Modal ─────────────────────────────────────────
function AddProviderModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const utils = trpc.useUtils();
  const createProvider = trpc.credentialing.createProvider.useMutation({
    onSuccess: () => {
      utils.credentialing.listProviders.invalidate();
      utils.credentialing.dashboardStats.invalidate();
      toast.success("Provider added");
      onSuccess();
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    firstName: "", lastName: "", role: "", npi: "", caqhId: "",
    licenseType: "", licenseNumber: "", licenseExpirationDate: "",
    recredentialingDueDate: "",
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;
    createProvider.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      role: form.role || undefined,
      npi: form.npi || undefined,
      caqhId: form.caqhId || undefined,
      licenseType: form.licenseType || undefined,
      licenseNumber: form.licenseNumber || undefined,
      licenseExpirationDate: form.licenseExpirationDate || undefined,
      recredentialingDueDate: form.recredentialingDueDate || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Provider</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Jane" required />
            </div>
            <div className="space-y-1">
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Smith" required />
            </div>
          </div>

          {/* Role */}
          <div className="space-y-1">
            <Label>Role / Credential Type</Label>
            <Input value={form.role} onChange={e => set("role", e.target.value)} placeholder="e.g. BCBA, LCSW, Psychologist" />
          </div>

          {/* NPI + CAQH */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>NPI</Label>
              <Input value={form.npi} onChange={e => set("npi", e.target.value)} placeholder="10-digit NPI" maxLength={10} />
            </div>
            <div className="space-y-1">
              <Label>CAQH ID</Label>
              <Input value={form.caqhId} onChange={e => set("caqhId", e.target.value)} placeholder="CAQH ID" />
            </div>
          </div>

          {/* License */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>License Type</Label>
              <Input value={form.licenseType} onChange={e => set("licenseType", e.target.value)} placeholder="LCSW" />
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

          {/* Recredentialing due */}
          <div className="space-y-1">
            <Label>Recredentialing Due Date</Label>
            <Input type="date" value={form.recredentialingDueDate} onChange={e => set("recredentialingDueDate", e.target.value)} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createProvider.isPending} className="bg-[#1D3D2F] hover:bg-[#2A5240] text-white">
              {createProvider.isPending ? "Adding…" : "Add Provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Stats Card ─────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
  bgClass,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${bgClass}`}>
        <Icon size={16} className={colorClass} />
      </div>
      <div>
        <p className="text-2xl font-semibold text-foreground font-mono leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function ProviderCredentialing() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: providers = [], isLoading } = trpc.credentialing.listProviders.useQuery();
  const { data: stats } = trpc.credentialing.dashboardStats.useQuery();

  const filtered = providers.filter(p => {
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      (p.role ?? "").toLowerCase().includes(q) ||
      (p.npi ?? "").includes(q) ||
      (p.caqhId ?? "").toLowerCase().includes(q)
    );
  });

  // Compute recredentialing alerts from provider list
  const recredentialingAlerts = providers.filter(p => {
    if (!p.recredentialingDueDate) return false;
    const days = Math.ceil((new Date(p.recredentialingDueDate).getTime() - Date.now()) / 86400000);
    return days <= 90;
  }).length;

  return (
    <DashboardLayout>
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Payer Credentialing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track provider credentialing status with insurance payers
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="bg-[#1D3D2F] hover:bg-[#2A5240] text-white gap-2">
          <Plus size={16} /> Add Provider
        </Button>
      </div>

      {/* Stats bar */}
      {stats !== undefined && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            icon={Users}
            label="Total Providers"
            value={stats.totalProviders}
            colorClass="text-[#1D3D2F]"
            bgClass="bg-[#1D3D2F]/10"
          />
          <StatCard
            icon={CheckCircle}
            label="Approved Panels"
            value={stats.approved}
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50"
          />
          <StatCard
            icon={Clock}
            label="In Review"
            value={stats.inReview}
            colorClass="text-blue-600"
            bgClass="bg-blue-50"
          />
          <StatCard
            icon={AlertTriangle}
            label="Needs Update"
            value={stats.needsUpdate}
            colorClass="text-amber-600"
            bgClass="bg-amber-50"
          />
          <StatCard
            icon={RefreshCw}
            label="Recredentialing Due"
            value={recredentialingAlerts}
            colorClass="text-orange-600"
            bgClass="bg-orange-50"
          />
        </div>
      )}

      {/* Info banner — what this page is for */}
      {providers.length === 0 && !isLoading && (
        <div className="bg-[#1D3D2F]/5 border border-[#1D3D2F]/15 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText size={16} className="text-[#1D3D2F] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">About Payer Credentialing</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Track each provider's credentialing status with insurance payers (BCBS, Aetna, Medicaid, etc.).
                Add a provider to start tracking their panel applications, approval dates, expiration dates, and recredentialing schedules.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      {providers.length > 0 && (
        <div className="relative max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, role, NPI…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Provider list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {search ? "No providers match your search" : "No providers added yet"}
          </p>
          {!search && (
            <div className="mt-4">
              <p className="text-sm mb-4">Add your first provider to start tracking payer credentialing</p>
              <Button onClick={() => setShowAdd(true)} className="bg-[#1D3D2F] hover:bg-[#2A5240] text-white gap-2">
                <Plus size={15} /> Add Provider
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => {
            // Compute payer summary from the provider's recredentialing date
            const recredBadge = getRecredentialingBadge(p.recredentialingDueDate);
            const hasLicenseExpiry = p.licenseExpirationDate
              ? Math.ceil((new Date(p.licenseExpirationDate).getTime() - Date.now()) / 86400000) <= 90
              : false;

            return (
              <button
                key={p.id}
                onClick={() => navigate(`/credentialing/${p.id}`)}
                className="w-full text-left bg-card border border-border rounded-lg px-5 py-4 hover:border-[#1D3D2F]/40 hover:bg-[#1D3D2F]/5 transition-all group"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-[#1D3D2F]/10 flex items-center justify-center shrink-0">
                      <span className="text-[#1D3D2F] font-semibold text-sm">
                        {p.firstName[0]}{p.lastName[0]}
                      </span>
                    </div>

                    {/* Name + meta */}
                    <div className="min-w-0">
                      <div className="font-medium text-foreground">
                        {p.firstName} {p.lastName}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap mt-0.5">
                        {p.role && <span>{p.role}</span>}
                        {p.npi && <span className="font-mono text-xs">NPI: {p.npi}</span>}
                        {p.caqhId && <span className="font-mono text-xs">CAQH: {p.caqhId}</span>}
                        {p.licenseType && p.licenseNumber && (
                          <span className="font-mono text-xs">{p.licenseType}: {p.licenseNumber}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: badges + chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {recredBadge}
                    {hasLicenseExpiry && !recredBadge && (
                      <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-100">
                        License Expiring Soon
                      </Badge>
                    )}
                    <ChevronRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AddProviderModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={() => setShowAdd(false)}
      />
    </div></DashboardLayout>
  );
}
