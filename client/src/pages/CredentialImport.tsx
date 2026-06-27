import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import Papa from "papaparse";
import {
  Upload,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Loader2,
  X,
  ArrowLeft,
  Users,
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
  linenDark: "#E5DDD2",
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

// ── Column mapping ─────────────────────────────────────────────
type FieldKey = "staffName" | "type" | "category" | "issuingBody" | "licenseNumber" | "issueDate" | "expirationDate" | "status" | "documentLink" | "notes";
const FIELD_LABELS: Record<FieldKey, string> = {
  staffName: "Staff Name",
  type: "Credential Type",
  category: "Category",
  issuingBody: "Issuing Body",
  licenseNumber: "License / Cert Number",
  issueDate: "Issue Date",
  expirationDate: "Expiration Date",
  status: "Status",
  documentLink: "Document Link",
  notes: "Notes",
};
const REQUIRED_FIELDS: FieldKey[] = ["staffName", "type"];
const FIELD_ALIASES: Record<FieldKey, string[]> = {
  staffName: ["staff name", "staff", "employee", "name", "full name"],
  type: ["credential type", "type", "credential", "license type", "cert type", "certification type"],
  category: ["category", "cat"],
  issuingBody: ["issuing body", "issuer", "issued by", "board", "organization"],
  licenseNumber: ["license number", "license #", "cert number", "certification number", "number", "id"],
  issueDate: ["issue date", "issued date", "issued on", "start date"],
  expirationDate: ["expiration date", "expiry date", "expires", "expiry", "exp date", "expiration"],
  status: ["status"],
  documentLink: ["document link", "document url", "doc link", "link", "url"],
  notes: ["notes", "note", "comments"],
};

function autoDetect(headers: string[]): Partial<Record<FieldKey, string>> {
  const mapping: Partial<Record<FieldKey, string>> = {};
  const used = new Set<string>();
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [FieldKey, string[]][]) {
    for (const h of headers) {
      if (used.has(h)) continue;
      if (aliases.some(a => h.toLowerCase().trim() === a)) {
        mapping[field] = h;
        used.add(h);
        break;
      }
    }
  }
  // Fuzzy fallback
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [FieldKey, string[]][]) {
    if (mapping[field]) continue;
    for (const h of headers) {
      if (used.has(h)) continue;
      if (aliases.some(a => h.toLowerCase().includes(a) || a.includes(h.toLowerCase().trim()))) {
        mapping[field] = h;
        used.add(h);
        break;
      }
    }
  }
  return mapping;
}

type Step = "upload" | "map" | "preview" | "done";
type ParsedRow = { rowIndex: number; raw: Record<string, string>; mapped: Partial<Record<FieldKey, string>>; errors: string[]; staffId?: number };

const TEMPLATE_CSV = `Staff Name,Credential Type,Category,Issuing Body,License / Cert Number,Issue Date,Expiration Date,Status,Document Link,Notes
Jane Smith,BCBA License,license,BACB,1-23-45678,2020-01-15,2026-01-14,current,https://drive.google.com/...,Renewed Jan 2024
John Doe,CPR Certification,certification,American Red Cross,,2025-03-01,2027-03-01,current,,
`;

const CATEGORIES = ["license", "certification", "training", "background_check", "sex_offender_registry", "insurance", "other"];
const STATUSES = ["current", "expiring_soon", "expired", "not_applicable"];

export default function CredentialImport() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const staffQuery = trpc.staff.list.useQuery(undefined, { enabled: !!user });
  const staffList = staffQuery.data ?? [];

  const importMutation = trpc.credentials.importCsv.useMutation({
    onSuccess: (data) => {
      setStep("done");
      if (data.errors.length === 0) {
        toast.success(`${data.inserted} credential(s) imported successfully.`);
      } else {
        toast.warning(`${data.inserted} imported, ${data.errors.length} failed.`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) { toast.error("Please upload a .csv file."); return; }
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        setCsvHeaders(headers);
        setRawRows(result.data);
        setMapping(autoDetect(headers));
        setStep("map");
      },
      error: () => toast.error("Failed to parse CSV file."),
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // Find staff by name (fuzzy: "Jane Smith" → staffId)
  const findStaffId = (name: string): number | undefined => {
    if (!name) return undefined;
    const n = name.trim().toLowerCase();
    const match = staffList.find(s => {
      const full = `${s.firstName} ${s.lastName}`.toLowerCase();
      const rev = `${s.lastName} ${s.firstName}`.toLowerCase();
      return full === n || rev === n || full.includes(n) || n.includes(full);
    });
    return match?.id;
  };

  const handlePreview = () => {
    const rows: ParsedRow[] = rawRows.map((raw, i) => {
      const mapped: Partial<Record<FieldKey, string>> = {};
      for (const [field, col] of Object.entries(mapping) as [FieldKey, string][]) {
        if (col) mapped[field] = raw[col]?.trim() ?? "";
      }
      const errors: string[] = [];
      if (!mapped.staffName) errors.push("Staff Name is required");
      if (!mapped.type) errors.push("Credential Type is required");
      const staffId = findStaffId(mapped.staffName ?? "");
      if (mapped.staffName && !staffId) errors.push(`Staff member "${mapped.staffName}" not found in system`);
      if (mapped.issueDate && isNaN(new Date(mapped.issueDate).getTime())) errors.push("Issue Date is not a valid date");
      if (mapped.expirationDate && isNaN(new Date(mapped.expirationDate).getTime())) errors.push("Expiration Date is not a valid date");
      if (mapped.category && !CATEGORIES.includes(mapped.category.toLowerCase())) errors.push(`Category must be one of: ${CATEGORIES.join(", ")}`);
      if (mapped.status && !STATUSES.includes(mapped.status.toLowerCase())) errors.push(`Status must be one of: ${STATUSES.join(", ")}`);
      return { rowIndex: i + 2, raw, mapped, errors, staffId };
    });
    setParsedRows(rows);
    setStep("preview");
  };

  const validRows = parsedRows.filter(r => r.errors.length === 0);
  const invalidRows = parsedRows.filter(r => r.errors.length > 0);

  const handleImport = () => {
    if (validRows.length === 0) { toast.error("No valid rows to import."); return; }
    const rows = validRows.map(r => ({
      originalRow: r.rowIndex,
      staffId: r.staffId!,
      type: r.mapped.type!,
      category: (CATEGORIES.includes((r.mapped.category ?? "").toLowerCase()) ? r.mapped.category!.toLowerCase() : "license") as "license" | "certification" | "training" | "background_check" | "sex_offender_registry" | "insurance" | "other",
      issuingBody: r.mapped.issuingBody || undefined,
      licenseNumber: r.mapped.licenseNumber || undefined,
      issueDate: r.mapped.issueDate || undefined,
      expirationDate: r.mapped.expirationDate || undefined,
      status: (STATUSES.includes((r.mapped.status ?? "").toLowerCase()) ? r.mapped.status!.toLowerCase() : "current") as "current" | "expiring_soon" | "expired" | "not_applicable",
      documentLink: r.mapped.documentLink || undefined,
      notes: r.mapped.notes || undefined,
    }));
    importMutation.mutate({ fileName: fileName ?? "import.csv", rows });
  };

  const handleReset = () => {
    setStep("upload"); setFileName(null); setCsvHeaders([]); setRawRows([]); setMapping({}); setParsedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "credential-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: C.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Loader2 size={28} color={C.forest} className="animate-spin" />
    </div>
  );

  const STEPS: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "map", label: "Map Columns" },
    { key: "preview", label: "Preview" },
    { key: "done", label: "Done" },
  ];
  const stepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <DashboardLayout>
      <PilotStatusBanner />
      <EmailVerificationBanner />

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <button onClick={() => navigate("/credentials")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontFamily: C.sans, fontSize: "0.8rem", color: C.inkLight, marginBottom: 16, padding: 0 }}>
            <ArrowLeft size={14} /> Back to Credentials
          </button>
          <h1 style={{ fontFamily: C.serif, fontSize: "2rem", fontWeight: 700, color: C.inkDark, letterSpacing: "-0.02em", margin: 0 }}>Import Credentials from CSV</h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, marginTop: 6 }}>Bulk-add credentials for your staff from a spreadsheet export.</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
          {STEPS.map((s, i) => (
            <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: i < stepIndex ? C.forest : i === stepIndex ? C.amber : C.linen,
                  color: i <= stepIndex ? "#fff" : C.inkFaint,
                  fontSize: "0.75rem", fontWeight: 700,
                }}>
                  {i < stepIndex ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: i === stepIndex ? 700 : 400, color: i === stepIndex ? C.inkDark : C.inkFaint }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight size={14} color={C.inkFaint} style={{ margin: "0 8px" }} />}
            </div>
          ))}
        </div>

        {/* ── Step: Upload ── */}
        {step === "upload" && (
          <div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? C.forest : C.rule}`,
                borderRadius: 8, padding: "56px 24px", textAlign: "center",
                background: dragOver ? "#F0F7F3" : C.parchment,
                cursor: "pointer", transition: "all 150ms",
              }}
            >
              <Upload size={36} color={C.inkFaint} style={{ marginBottom: 16 }} />
              <p style={{ fontFamily: C.sans, fontSize: "0.95rem", fontWeight: 600, color: C.inkDark, margin: "0 0 8px" }}>Drop your CSV here or click to browse</p>
              <p style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.inkLight, margin: 0 }}>Accepts .csv files up to 1,000 rows</p>
              <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFileInput} />
            </div>
            <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 8, background: "transparent", color: C.forest, border: `1px solid ${C.forest}`, borderRadius: 4, padding: "9px 18px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.8rem", fontWeight: 600 }}>
                <Download size={14} /> Download CSV Template
              </button>
              <span style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight }}>Not sure of the format? Download the template first.</span>
            </div>
            {/* Staff requirement notice */}
            <div style={{ marginTop: 24, background: "#EEF6F1", border: `1px solid #C6DDD3`, borderRadius: 6, padding: "14px 18px", display: "flex", gap: 10 }}>
              <Users size={16} color={C.forest} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, color: C.forest, margin: "0 0 4px" }}>Staff members must exist first</p>
                <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, margin: 0 }}>
                  Your CSV must include a "Staff Name" column matching names already in your Staff Directory. 
                  {staffList.length > 0 ? ` You currently have ${staffList.length} staff member(s).` : " Add staff members before importing credentials."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Step: Map Columns ── */}
        {step === "map" && (
          <div>
            <div style={{ background: C.parchment, border: `1px solid ${C.rule}`, borderRadius: 8, padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <FileText size={16} color={C.forest} />
                <span style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600, color: C.inkDark }}>{fileName}</span>
                <span style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight }}>— {rawRows.length} data row(s)</span>
              </div>
              <p style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid, margin: "0 0 20px" }}>
                Map your CSV columns to AuditReady fields. Required fields are marked with *.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {(Object.keys(FIELD_LABELS) as FieldKey[]).map(field => (
                  <div key={field}>
                    <label style={{ fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600, color: REQUIRED_FIELDS.includes(field) ? C.forest : C.inkMid, display: "block", marginBottom: 4 }}>
                      {FIELD_LABELS[field]}{REQUIRED_FIELDS.includes(field) && " *"}
                    </label>
                    <select
                      value={mapping[field] ?? ""}
                      onChange={e => setMapping(prev => ({ ...prev, [field]: e.target.value || undefined }))}
                      style={{ width: "100%", fontFamily: C.sans, fontSize: "0.82rem", color: C.inkDark, background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "8px 10px" }}
                    >
                      <option value="">— Not mapped —</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={handleReset} style={{ background: "transparent", color: C.inkMid, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "10px 20px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.82rem" }}>
                Start Over
              </button>
              <button
                onClick={handlePreview}
                disabled={REQUIRED_FIELDS.some(f => !mapping[f])}
                style={{ display: "flex", alignItems: "center", gap: 8, background: REQUIRED_FIELDS.some(f => !mapping[f]) ? C.linenDark : C.forest, color: REQUIRED_FIELDS.some(f => !mapping[f]) ? C.inkFaint : "#F0EBE3", border: "none", borderRadius: 4, padding: "10px 24px", cursor: REQUIRED_FIELDS.some(f => !mapping[f]) ? "not-allowed" : "pointer", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600 }}
              >
                Preview Import <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Preview ── */}
        {step === "preview" && (
          <div>
            {/* Summary */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <div style={{ background: "#EEF6F1", border: `1px solid #C6DDD3`, borderRadius: 6, padding: "12px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={16} color={C.forest} />
                <span style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, color: C.forest }}>{validRows.length} ready to import</span>
              </div>
              {invalidRows.length > 0 && (
                <div style={{ background: "#FEF3CD", border: `1px solid #E8C97A`, borderRadius: 6, padding: "12px 18px", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={16} color={C.amber} />
                  <span style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, color: C.amber }}>{invalidRows.length} row(s) with errors (will be skipped)</span>
                </div>
              )}
            </div>

            {/* Error rows */}
            {invalidRows.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 700, color: C.red, marginBottom: 10 }}>Rows with errors</h3>
                <div style={{ border: `1px solid #F0C0C0`, borderRadius: 6, overflow: "hidden" }}>
                  {invalidRows.map(row => (
                    <div key={row.rowIndex} style={{ padding: "10px 16px", borderBottom: `1px solid #F0C0C0`, background: "#FFF5F5", display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <XCircle size={14} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <span style={{ fontFamily: C.mono, fontSize: "0.72rem", color: C.inkFaint }}>Row {row.rowIndex}</span>
                        <span style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.inkDark, marginLeft: 8 }}>{row.mapped.staffName || "(no staff)"} — {row.mapped.type || "(no type)"}</span>
                        <div style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.red, marginTop: 2 }}>{row.errors.join(" · ")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Valid rows preview table */}
            {validRows.length > 0 && (
              <div style={{ marginBottom: 24, border: `1px solid ${C.rule}`, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ background: C.linen, padding: "10px 16px", borderBottom: `1px solid ${C.rule}` }}>
                  <span style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 700, color: C.inkMid, textTransform: "uppercase", letterSpacing: "0.06em" }}>Preview — {validRows.length} row(s)</span>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: C.sans, fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ background: C.parchment }}>
                        {["Staff", "Type", "Category", "Issuing Body", "Exp. Date", "Status"].map(h => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.inkMid, fontWeight: 600, borderBottom: `1px solid ${C.rule}`, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.slice(0, 50).map(row => (
                        <tr key={row.rowIndex} style={{ borderBottom: `1px solid ${C.rule}` }}>
                          <td style={{ padding: "8px 12px", color: C.inkDark }}>{row.mapped.staffName}</td>
                          <td style={{ padding: "8px 12px", color: C.inkDark }}>{row.mapped.type}</td>
                          <td style={{ padding: "8px 12px", color: C.inkLight }}>{row.mapped.category || "license"}</td>
                          <td style={{ padding: "8px 12px", color: C.inkLight }}>{row.mapped.issuingBody || "—"}</td>
                          <td style={{ padding: "8px 12px", color: C.inkLight }}>{row.mapped.expirationDate || "—"}</td>
                          <td style={{ padding: "8px 12px", color: C.inkLight }}>{row.mapped.status || "current"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 50 && (
                    <div style={{ padding: "10px 16px", fontFamily: C.sans, fontSize: "0.78rem", color: C.inkFaint, borderTop: `1px solid ${C.rule}` }}>
                      Showing 50 of {validRows.length} rows
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep("map")} style={{ background: "transparent", color: C.inkMid, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "10px 20px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.82rem" }}>
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={validRows.length === 0 || importMutation.isPending}
                style={{ display: "flex", alignItems: "center", gap: 8, background: validRows.length === 0 ? C.linenDark : C.forest, color: validRows.length === 0 ? C.inkFaint : "#F0EBE3", border: "none", borderRadius: 4, padding: "10px 24px", cursor: validRows.length === 0 ? "not-allowed" : "pointer", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600 }}
              >
                {importMutation.isPending ? <><Loader2 size={14} className="animate-spin" /> Importing…</> : <>Import {validRows.length} Credential{validRows.length !== 1 ? "s" : ""}</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && importMutation.data && (
          <div style={{ textAlign: "center", padding: "48px 24px" }}>
            <CheckCircle size={52} color={C.forest} style={{ marginBottom: 20 }} />
            <h2 style={{ fontFamily: C.serif, fontSize: "1.8rem", fontWeight: 700, color: C.inkDark, margin: "0 0 12px" }}>Import Complete</h2>
            <p style={{ fontFamily: C.sans, fontSize: "0.9rem", color: C.inkLight, marginBottom: 32 }}>
              <strong style={{ color: C.forest }}>{importMutation.data.inserted}</strong> credential(s) imported successfully.
              {importMutation.data.errors.length > 0 && (
                <> <strong style={{ color: C.red }}>{importMutation.data.errors.length}</strong> row(s) failed.</>
              )}
            </p>
            {importMutation.data.errors.length > 0 && (
              <div style={{ background: "#FFF5F5", border: `1px solid #F0C0C0`, borderRadius: 6, padding: 16, marginBottom: 28, textAlign: "left", maxWidth: 500, margin: "0 auto 28px" }}>
                <p style={{ fontFamily: C.sans, fontSize: "0.8rem", fontWeight: 600, color: C.red, marginBottom: 8 }}>Failed rows:</p>
                {importMutation.data.errors.map(e => (
                  <div key={e.row} style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkDark, marginBottom: 4 }}>
                    <span style={{ fontFamily: C.mono, color: C.inkFaint }}>Row {e.row}:</span> {e.message}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={handleReset} style={{ background: "transparent", color: C.forest, border: `1px solid ${C.forest}`, borderRadius: 4, padding: "10px 20px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600 }}>
                Import Another File
              </button>
              <button onClick={() => navigate("/credentials")} style={{ background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 4, padding: "10px 24px", cursor: "pointer", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600 }}>
                View Credentials
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
