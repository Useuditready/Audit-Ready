/**
 * ABA New-Hire Onboarding Checklist
 * ───────────────────────────────────
 * Tracks required credential documents for new ABA staff.
 * Zero PHI — staff-side only. No patient data.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ClipboardList, Plus, CheckCircle2, AlertCircle, Clock,
  ChevronDown, ChevronUp, Trash2, UserPlus, X
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  certification: "Certifications",
  training: "Training",
  background_check: "Background Checks",
  documentation: "Documentation",
  insurance: "Insurance",
  other: "Other",
};

const CATEGORY_ORDER = ["certification", "training", "background_check", "documentation", "insurance", "other"];

export default function OnboardingChecklist() {
  const utils = trpc.useUtils();

  // Data
  const { data: staffList = [], isLoading: staffLoading } = trpc.staff.list.useQuery();
  const { data: checklists = [], isLoading: checklistsLoading } = trpc.onboarding.list.useQuery();

  // Selected checklist
  const [selectedChecklistId, setSelectedChecklistId] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(CATEGORY_ORDER));

  const selectedChecklist = checklists.find(c => c.id === selectedChecklistId) ?? null;

  const { data: items = [], isLoading: itemsLoading } = trpc.onboarding.getItems.useQuery(
    { checklistId: selectedChecklistId! },
    { enabled: !!selectedChecklistId }
  );

  // Mutations
  const createChecklist = trpc.onboarding.create.useMutation({
    onSuccess: () => {
      utils.onboarding.list.invalidate();
      toast.success("Onboarding checklist created");
      setShowNewChecklistModal(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleItem = trpc.onboarding.toggleItem.useMutation({
    onSuccess: () => {
      utils.onboarding.getItems.invalidate({ checklistId: selectedChecklistId! });
      utils.onboarding.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteChecklist = trpc.onboarding.delete.useMutation({
    onSuccess: () => {
      utils.onboarding.list.invalidate();
      setSelectedChecklistId(null);
      toast.success("Checklist deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const addItem = trpc.onboarding.addItem.useMutation({
    onSuccess: () => {
      utils.onboarding.getItems.invalidate({ checklistId: selectedChecklistId! });
      toast.success("Item added");
      setShowAddItemModal(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteItem = trpc.onboarding.deleteItem.useMutation({
    onSuccess: () => {
      utils.onboarding.getItems.invalidate({ checklistId: selectedChecklistId! });
      utils.onboarding.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Modals
  const [showNewChecklistModal, setShowNewChecklistModal] = useState(false);
  const [newChecklistStaffId, setNewChecklistStaffId] = useState<string>("");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<string>("other");
  const [newItemRequired, setNewItemRequired] = useState(true);

  // Helpers
  const getStaffName = (staffId: number) => {
    const s = staffList.find(s => s.id === staffId);
    return s ? `${s.firstName} ${s.lastName}` : `Staff #${staffId}`;
  };

  const getStaffRole = (staffId: number) => {
    const s = staffList.find(s => s.id === staffId);
    return s?.role ?? "";
  };

  const itemsByCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = items.filter(i => i.category === cat);
    return acc;
  }, {} as Record<string, typeof items>);

  const requiredItems = items.filter(i => i.isRequired);
  const receivedRequired = requiredItems.filter(i => i.isReceived);
  const progress = requiredItems.length > 0 ? Math.round((receivedRequired.length / requiredItems.length) * 100) : 0;

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const handleToggleItem = (item: typeof items[0], checked: boolean) => {
    toggleItem.mutate({
      id: item.id,
      checklistId: item.checklistId,
      isReceived: checked,
    });
  };

  const isLoading = staffLoading || checklistsLoading;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-emerald-700" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">New-Hire Onboarding Checklists</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Track required credential documents for ABA new hires before they work with clients. Zero PHI.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowNewChecklistModal(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
          >
            <UserPlus className="w-4 h-4" />
            New Checklist
          </Button>
        </div>

        {isLoading ? (
          <div className="text-gray-400 text-sm py-12 text-center">Loading...</div>
        ) : (
          <div className="flex gap-6">
            {/* Left panel — checklist list */}
            <div className="w-72 shrink-0">
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Staff Checklists ({checklists.length})
                  </span>
                </div>
                {checklists.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    No checklists yet.<br />Click "New Checklist" to start.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {checklists.map(cl => {
                      const isSelected = cl.id === selectedChecklistId;
                      return (
                        <button
                          key={cl.id}
                          onClick={() => setSelectedChecklistId(cl.id)}
                          className={`w-full text-left px-4 py-3 transition-colors ${
                            isSelected ? "bg-emerald-50 border-l-2 border-emerald-600" : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {getStaffName(cl.staffId)}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{getStaffRole(cl.staffId)}</div>
                          <div className="mt-1.5">
                            {cl.status === "complete" ? (
                              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs px-2 py-0">
                                <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                              </Badge>
                            ) : cl.status === "on_hold" ? (
                              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs px-2 py-0">
                                <Clock className="w-3 h-3 mr-1" /> On Hold
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs px-2 py-0">
                                <AlertCircle className="w-3 h-3 mr-1" /> In Progress
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right panel — checklist detail */}
            <div className="flex-1 min-w-0">
              {!selectedChecklistId ? (
                <div className="bg-white border border-gray-200 rounded-lg flex items-center justify-center py-24 text-gray-400 text-sm">
                  Select a staff member from the list to view their checklist
                </div>
              ) : itemsLoading ? (
                <div className="bg-white border border-gray-200 rounded-lg flex items-center justify-center py-24 text-gray-400 text-sm">
                  Loading checklist...
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-lg">
                  {/* Checklist header */}
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {getStaffName(selectedChecklist!.staffId)}
                      </h2>
                      <p className="text-sm text-gray-500">{getStaffRole(selectedChecklist!.staffId)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Progress */}
                      <div className="text-right">
                        <div className="text-xs text-gray-500 mb-1">
                          {receivedRequired.length} of {requiredItems.length} required items received
                        </div>
                        <div className="w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{progress}% complete</div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => setShowAddItemModal(true)}
                      >
                        <Plus className="w-3 h-3" /> Add Item
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 text-xs"
                        onClick={() => {
                          if (confirm("Delete this checklist and all its items?")) {
                            deleteChecklist.mutate({ id: selectedChecklistId });
                          }
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Items by category */}
                  <div className="divide-y divide-gray-100">
                    {CATEGORY_ORDER.map(cat => {
                      const catItems = itemsByCategory[cat] ?? [];
                      if (catItems.length === 0) return null;
                      const isExpanded = expandedCategories.has(cat);
                      const receivedCount = catItems.filter(i => i.isReceived).length;

                      return (
                        <div key={cat}>
                          <button
                            onClick={() => toggleCategory(cat)}
                            className="w-full flex items-center justify-between px-6 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-700">
                                {CATEGORY_LABELS[cat]}
                              </span>
                              <span className="text-xs text-gray-400">
                                {receivedCount}/{catItems.length}
                              </span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="divide-y divide-gray-50">
                              {catItems.map(item => (
                                <div
                                  key={item.id}
                                  className={`flex items-start gap-4 px-6 py-3 ${
                                    item.isReceived ? "bg-emerald-50/30" : ""
                                  }`}
                                >
                                  <Checkbox
                                    id={`item-${item.id}`}
                                    checked={item.isReceived}
                                    onCheckedChange={(checked) => handleToggleItem(item, !!checked)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <label
                                      htmlFor={`item-${item.id}`}
                                      className={`text-sm font-medium cursor-pointer ${
                                        item.isReceived ? "text-gray-400 line-through" : "text-gray-800"
                                      }`}
                                    >
                                      {item.label}
                                      {item.isRequired && (
                                        <span className="ml-1.5 text-xs text-red-400 font-normal">required</span>
                                      )}
                                    </label>
                                    {item.documentNote && (
                                      <p className="text-xs text-gray-400 mt-0.5">{item.documentNote}</p>
                                    )}
                                    {item.isReceived && item.receivedAt && (
                                      <p className="text-xs text-emerald-600 mt-0.5">
                                        Received {new Date(item.receivedAt).toLocaleDateString()}
                                        {item.expiresAt && ` · Expires ${new Date(item.expiresAt).toLocaleDateString()}`}
                                      </p>
                                    )}
                                  </div>
                                  {!item.isRequired && (
                                    <button
                                      onClick={() => deleteItem.mutate({ id: item.id, checklistId: item.checklistId })}
                                      className="text-gray-300 hover:text-red-400 transition-colors mt-0.5"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Checklist Modal */}
      <Dialog open={showNewChecklistModal} onOpenChange={setShowNewChecklistModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Onboarding Checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Staff Member</Label>
              <Select value={newChecklistStaffId} onValueChange={setNewChecklistStaffId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a staff member..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList
                    .filter(s => s.status === "active")
                    .filter(s => !checklists.find(c => c.staffId === s.id))
                    .map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.firstName} {s.lastName} {s.role ? `— ${s.role}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400 mt-1">
                A standard ABA checklist (13 items) will be created automatically.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewChecklistModal(false)}>Cancel</Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={!newChecklistStaffId || createChecklist.isPending}
              onClick={() => {
                if (!newChecklistStaffId) return;
                createChecklist.mutate({ staffId: parseInt(newChecklistStaffId) });
              }}
            >
              {createChecklist.isPending ? "Creating..." : "Create Checklist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Item Modal */}
      <Dialog open={showAddItemModal} onOpenChange={setShowAddItemModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Item Label</Label>
              <Input
                className="mt-1"
                placeholder="e.g. State-specific license"
                value={newItemLabel}
                onChange={e => setNewItemLabel(e.target.value)}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="item-required"
                checked={newItemRequired}
                onCheckedChange={v => setNewItemRequired(!!v)}
              />
              <Label htmlFor="item-required" className="cursor-pointer">Required item</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemModal(false)}>Cancel</Button>
            <Button
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
              disabled={!newItemLabel.trim() || addItem.isPending || !selectedChecklistId || !selectedChecklist}
              onClick={() => {
                if (!newItemLabel.trim() || !selectedChecklistId || !selectedChecklist) return;
                addItem.mutate({
                  checklistId: selectedChecklistId,
                  staffId: selectedChecklist.staffId,
                  itemKey: newItemLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                  label: newItemLabel.trim(),
                  category: newItemCategory as any,
                  isRequired: newItemRequired,
                });
                setNewItemLabel("");
                setNewItemCategory("other");
                setNewItemRequired(true);
              }}
            >
              {addItem.isPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
