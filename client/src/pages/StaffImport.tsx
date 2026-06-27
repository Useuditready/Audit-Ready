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
type FieldKey = "firstName" | "lastName" | "email" | "phone" | "role" | "hireDate" | "status";

const FIELD_LABELS: Record<FieldKey, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  phone: "Phone",
  role: "Role / Title",
  hireDate: "Hire Date",
  status: "Status",
};

const REQUIRED_FIELDS: FieldKey[] = ["firstName", "lastName"];

// Common header aliases for auto-detection
const FIELD_ALIASES: Record<FieldKey, string[]> = {
  firstName: ["first name", "firstname", "first", "given name", "givenname"],
  lastName: ["last name", "lastname", "last", "surname", "family name"],
  email: ["email", "email address", "e-mail", "emailaddress"],
  phone: ["phone", "phone number", "phonenumber", "mobile", "cell", "telephone"],
  role: ["role", "title", "position", "job title", "jobtitle", "job role"],
  hireDate: ["hire date", "hiredate", "start date", "startdate", "date hired", "employment date"],
  status: ["status", "employment status", "active"],
};

function detectMapping(headers: string[]): Record<FieldKey, string | null> {
  const mapping: Record<FieldKey, string | null> = {
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    role: null,
    hireDate: null,
    status: null,
  };
  for (const header of headers) {
    const lower = header.toLowerCase().trim();
    for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [FieldKey, string[]][]) {
      if (!mapping[field] && aliases.some(a => lower === a || lower.includes(a))) {
        mapping[field] = header;
      }
    }
  }
  return mapping;
}

type ParsedRow = {
  rowIndex: number;
  raw: Record<string, string>;
  mapped: Partial<Record<FieldKey, string>>;
  errors: string[];
};

function mapRow(raw: Record<string, string>, mapping: Record<FieldKey, string | null>): ParsedRow["mapped"] {
  const mapped: Partial<Record<FieldKey, string>> = {};
  for (const [field, header] of Object.entries(mapping) as [FieldKey, string | null][]) {
    if (header && raw[header] !== undefined) {
      mapped[field] = raw[header].trim();
    }
  }
  return mapped;
}

function validateRow(mapped: Partial<Record<FieldKey, string>>, rowIndex: number): string[] {
  const errors: string[] = [];
  if (!mapped.firstName?.trim()) errors.push("First Name is required");
  if (!mapped.lastName?.trim()) errors.push("Last Name is required");
  if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
    errors.push("Email format is invalid");
  }
  if (mapped.hireDate && mapped.hireDate.trim()) {
    const d = new Date(mapped.hireDate);
    if (isNaN(d.getTime())) errors.push("Hire Date is not a valid date");
  }
  if (mapped.status && !["active", "inactive", "terminated"].includes(mapped.status.toLowerCase())) {
    errors.push(`Status "${mapped.status}" is not valid (use: active, inactive, terminated)`);
  }
  return errors;
}

// ── Sample CSV template ────────────────────────────────────────
const SAMPLE_CSV = `First Name,Last Name,Email,Phone,Role,Hire Date,Status
Jane,Smith,jane.smith@example.com,555-0101,BCBA,2023-01-15,active
John,Doe,john.doe@example.com,555-0102,RBT,2023-03-01,active
Maria,Garcia,,555-0103,BCBA-D,2022-06-10,active
`;

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "auditready-staff-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ──────────────────────────────────────────────────
type ImportStep = "upload" | "map" | "preview" | "result";

export default function StaffImport() {
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();

  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, string | null>>({
    firstName: null, lastName: null, email: null, phone: null, role: null, hireDate: null, status: null,
  });
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{ inserted: number; errors: { row: number; message: string }[] } | null>(null);
  const [duplicates, setDuplicates] = useState<{ index: number; matchedId: number; matchType: "name" | "email" }[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkDuplicatesMutation = trpc.staff.checkDuplicates.useMutation({
    onSuccess: (data) => setDuplicates(data.duplicates),
    onError: () => setDuplicates([]),
  });
  const importMutation = trpc.staff.importCsv.useMutation({
    onSuccess: (result) => {
      setImportResult(result);
      setStep("result");
      if (result.inserted > 0) {
        toast.success(`${result.inserted} staff member${result.inserted !== 1 ? "s" : ""} imported successfully.`);
      }
    },
    onError: (err) => {
      toast.error(`Import failed: ${err.message}`);
    },
  });

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file.");
      return;
    }
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        setCsvHeaders(headers);
        setRawRows(result.data as Record<string, string>[]);
        const detected = detectMapping(headers);
        setMapping(detected);
        setStep("map");
      },
      error: (err) => {
        toast.error(`CSV parse error: ${err.message}`);
      },
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleProceedToPreview = () => {
    const rows: ParsedRow[] = rawRows.map((raw, i) => {
      const mapped = mapRow(raw, mapping);
      const errors = validateRow(mapped, i + 1);
      return { rowIndex: i + 1, raw, mapped, errors };
    });
    setParsedRows(rows);
    setDuplicates([]);
    setSkipDuplicates(new Set());
    // Fire duplicate check for all valid rows
    const valid = rows.filter(r => r.errors.length === 0);
    if (valid.length > 0) {
      checkDuplicatesMutation.mutate({
        candidates: valid.map(r => ({
          firstName: r.mapped.firstName ?? "",
          lastName: r.mapped.lastName ?? "",
          email: r.mapped.email || undefined,
        })),
      });
    }
    setStep("preview");
  };

  const validRows = parsedRows.filter(r => r.errors.length === 0);
  const invalidRows = parsedRows.filter(r => r.errors.length > 0);

  // Map duplicate index (into validRows array) to rowIndex for display
  const duplicateRowIndexes = new Set(duplicates.map(d => validRows[d.index]?.rowIndex));
  const rowsToImport = validRows.filter(r => !skipDuplicates.has(r.rowIndex));

  const handleImport = () => {
    if (rowsToImport.length === 0) {
      toast.error("No rows to import after skipping duplicates.");
      return;
    }
    const rows = rowsToImport.map(r => ({
      originalRow: r.rowIndex,
      firstName: r.mapped.firstName!,
      lastName: r.mapped.lastName!,
      email: r.mapped.email || undefined,
      phone: r.mapped.phone || undefined,
      role: r.mapped.role || undefined,
      hireDate: r.mapped.hireDate || undefined,
      status: (["active", "inactive", "terminated"].includes((r.mapped.status ?? "").toLowerCase())
        ? (r.mapped.status!.toLowerCase() as "active" | "inactive" | "terminated")
        : "active"),
    }));
    importMutation.mutate({ fileName: fileName ?? "import.csv", rows });
  };

  const handleReset = () => {
    setStep("upload");
    setFileName(null);
    setCsvHeaders([]);
    setRawRows([]);
    setMapping({ firstName: null, lastName: null, email: null, phone: null, role: null, hireDate: null, status: null });
    setParsedRows([]);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} color={C.forest} className="animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <PilotStatusBanner />
      <EmailVerificationBanner />

      {/* ── Page Content ─────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
        {/* Back link + title */}
        <div style={{ marginBottom: 32 }}>
          <a
            href="/staff"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight, textDecoration: "none", marginBottom: 16 }}
          >
            <ArrowLeft size={14} /> Back to Staff Directory
          </a>
          <h1 style={{ fontFamily: C.serif, fontSize: "2rem", fontWeight: 700, color: C.inkDark, letterSpacing: "-0.02em", margin: 0 }}>
            Import Staff from CSV
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.9rem", color: C.inkLight, marginTop: 8, lineHeight: 1.6 }}>
            Upload a CSV file to add multiple staff members at once. No patient or client data — staff records only.
          </p>
        </div>

        {/* ── Step indicator ─────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 36 }}>
          {(["upload", "map", "preview", "result"] as ImportStep[]).map((s, i) => {
            const labels: Record<ImportStep, string> = { upload: "Upload", map: "Map Columns", preview: "Preview", result: "Done" };
            const isActive = step === s;
            const isDone = ["upload", "map", "preview", "result"].indexOf(step) > i;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontFamily: C.sans, fontSize: "0.78rem", fontWeight: isActive ? 700 : 500,
                  color: isActive ? C.forest : isDone ? C.sage : C.inkFaint,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    background: isActive ? C.forest : isDone ? C.sage : C.linenDark,
                    color: isActive || isDone ? "#fff" : C.inkFaint,
                    fontSize: "0.7rem", fontWeight: 700,
                  }}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  {labels[s]}
                </div>
                {i < 3 && <ChevronRight size={12} color={C.inkFaint} />}
              </div>
            );
          })}
        </div>

        {/* ── Step: Upload ─────────────────────────────────────── */}
        {step === "upload" && (
          <div>
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragging ? C.forest : C.rule}`,
                borderRadius: 8,
                background: isDragging ? "#EBF2ED" : C.cream,
                padding: "56px 32px",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 180ms ease, background 180ms ease",
                marginBottom: 24,
              }}
            >
              <Upload size={40} color={isDragging ? C.forest : C.inkFaint} style={{ margin: "0 auto 16px" }} />
              <p style={{ fontFamily: C.sans, fontSize: "1rem", fontWeight: 600, color: C.inkDark, margin: "0 0 8px" }}>
                Drop your CSV file here, or click to browse
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkLight, margin: 0 }}>
                Accepts .csv files — up to 500 staff members per import
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleFileInput}
              />
            </div>

            {/* Sample template */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: C.linen, borderRadius: 6, border: `1px solid ${C.rule}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <FileText size={18} color={C.amber} />
                <div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600, color: C.inkDark, margin: 0 }}>
                    Need a template?
                  </p>
                  <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight, margin: 0 }}>
                    Download our sample CSV with the correct column headers
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); downloadSampleCsv(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  fontFamily: C.sans, fontSize: "0.8rem", fontWeight: 600,
                  color: C.forest, background: "transparent", border: `1px solid ${C.forest}`,
                  borderRadius: 4, padding: "8px 16px", cursor: "pointer",
                }}
              >
                <Download size={14} /> Download Template
              </button>
            </div>

            {/* Format notes */}
            <div style={{ marginTop: 24, padding: "16px 20px", background: "#EBF2ED", borderRadius: 6, border: `1px solid rgba(29,61,47,0.15)` }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 600, color: C.forest, margin: "0 0 8px" }}>
                CSV format requirements
              </p>
              <ul style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.inkMid, margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                <li><strong>Required columns:</strong> First Name, Last Name</li>
                <li><strong>Optional columns:</strong> Email, Phone, Role, Hire Date (YYYY-MM-DD), Status (active / inactive / terminated)</li>
                <li>Column headers are auto-detected — common variations like "firstname" or "given name" are recognized</li>
                <li>Maximum 500 rows per import</li>
                <li>No patient, client, or clinical data — staff records only</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Step: Map Columns ─────────────────────────────────── */}
        {step === "map" && (
          <div>
            <div style={{ marginBottom: 24, padding: "14px 18px", background: C.linen, borderRadius: 6, border: `1px solid ${C.rule}` }}>
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, margin: 0 }}>
                <strong style={{ color: C.inkDark }}>{fileName}</strong> — {rawRows.length} row{rawRows.length !== 1 ? "s" : ""} detected.
                Map each field to a column from your CSV. Required fields are marked with *.
              </p>
            </div>

            <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: C.linen }}>
                    <th style={{ fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 700, color: C.inkMid, textTransform: "uppercase", letterSpacing: "0.08em", padding: "12px 20px", textAlign: "left", borderBottom: `1px solid ${C.rule}` }}>
                      AuditReady Field
                    </th>
                    <th style={{ fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 700, color: C.inkMid, textTransform: "uppercase", letterSpacing: "0.08em", padding: "12px 20px", textAlign: "left", borderBottom: `1px solid ${C.rule}` }}>
                      CSV Column
                    </th>
                    <th style={{ fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 700, color: C.inkMid, textTransform: "uppercase", letterSpacing: "0.08em", padding: "12px 20px", textAlign: "left", borderBottom: `1px solid ${C.rule}` }}>
                      Sample Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(FIELD_LABELS) as FieldKey[]).map((field, i) => {
                    const isRequired = REQUIRED_FIELDS.includes(field);
                    const selectedHeader = mapping[field];
                    const sampleValue = selectedHeader && rawRows[0] ? rawRows[0][selectedHeader] : "";
                    return (
                      <tr key={field} style={{ borderBottom: i < Object.keys(FIELD_LABELS).length - 1 ? `1px solid ${C.rule}` : "none" }}>
                        <td style={{ padding: "12px 20px", fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600, color: C.inkDark }}>
                          {FIELD_LABELS[field]}
                          {isRequired && <span style={{ color: C.red, marginLeft: 4 }}>*</span>}
                        </td>
                        <td style={{ padding: "12px 20px" }}>
                          <select
                            value={selectedHeader ?? ""}
                            onChange={(e) => setMapping(prev => ({ ...prev, [field]: e.target.value || null }))}
                            style={{
                              fontFamily: C.sans, fontSize: "0.82rem", color: C.inkDark,
                              background: C.parchment, border: `1px solid ${C.rule}`,
                              borderRadius: 4, padding: "6px 10px", width: "100%", cursor: "pointer",
                            }}
                          >
                            <option value="">— Skip this field —</option>
                            {csvHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "12px 20px", fontFamily: C.mono, fontSize: "0.78rem", color: C.inkLight }}>
                          {sampleValue || <span style={{ color: C.inkFaint, fontStyle: "italic", fontFamily: C.sans }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={handleReset}
                style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600, color: C.inkMid, background: "transparent", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "10px 20px", cursor: "pointer" }}
              >
                ← Choose Different File
              </button>
              <button
                onClick={handleProceedToPreview}
                disabled={!mapping.firstName || !mapping.lastName}
                style={{
                  fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                  color: "#F0EBE3", background: (!mapping.firstName || !mapping.lastName) ? C.inkFaint : C.forest,
                  border: "none", borderRadius: 4, padding: "10px 24px", cursor: (!mapping.firstName || !mapping.lastName) ? "not-allowed" : "pointer",
                }}
              >
                Preview Import →
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Preview ─────────────────────────────────────── */}
        {step === "preview" && (
          <div>
            {/* Summary bar */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <div style={{ flex: 1, padding: "14px 18px", background: "#EBF2ED", borderRadius: 6, border: `1px solid rgba(29,61,47,0.15)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCircle size={16} color={C.sage} />
                  <span style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 700, color: C.forest }}>
                    {validRows.length} row{validRows.length !== 1 ? "s" : ""} ready to import
                  </span>
                </div>
              </div>
              {invalidRows.length > 0 && (
                <div style={{ flex: 1, padding: "14px 18px", background: "#FEF3CD", borderRadius: 6, border: `1px solid rgba(196,134,42,0.3)` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertTriangle size={16} color={C.amber} />
                    <span style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 700, color: C.amber }}>
                      {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} with errors (will be skipped)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Duplicate detection banner */}
            {checkDuplicatesMutation.isPending && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "#F0F7F3", border: `1px solid #C6DDD3`, borderRadius: 6, marginBottom: 16 }}>
                <Loader2 size={14} color={C.forest} className="animate-spin" />
                <span style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.forest }}>Checking for duplicate staff members…</span>
              </div>
            )}
            {duplicates.length > 0 && (() => {
              const skippedCount = duplicates.filter(d => skipDuplicates.has(validRows[d.index]?.rowIndex)).length;
              const importingCount = duplicates.length - skippedCount;
              return (
                <div style={{ background: "#FEF3CD", border: `1px solid #E8C97A`, borderRadius: 6, padding: "14px 18px", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AlertTriangle size={15} color={C.amber} />
                      <span style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 700, color: C.amber }}>
                        {duplicates.length} potential duplicate{duplicates.length !== 1 ? "s" : ""} detected
                      </span>
                    </div>
                    <span style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid }}>
                      {skippedCount} will be skipped · {importingCount} will be imported
                    </span>
                  </div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkMid, margin: "0 0 10px" }}>
                    Use the <strong>Skip</strong> / <strong>Import</strong> buttons on each duplicate row to decide individually.
                  </p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => setSkipDuplicates(new Set(duplicates.map(d => validRows[d.index]?.rowIndex).filter(Boolean) as number[]))}
                      style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, background: C.amber, color: "#fff", border: "none", borderRadius: 4, padding: "6px 12px", cursor: "pointer" }}
                    >
                      Skip all ({duplicates.length})
                    </button>
                    <button
                      onClick={() => setSkipDuplicates(new Set())}
                      style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, background: "transparent", color: C.inkMid, border: `1px solid ${C.rule}`, borderRadius: 4, padding: "6px 12px", cursor: "pointer" }}
                    >
                      Import all
                    </button>
                  </div>
                </div>
              );
            })()}
            {/* Preview table */}
            <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, overflow: "auto", marginBottom: 24, maxHeight: 420 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr style={{ background: C.linen, position: "sticky", top: 0 }}>
                    <th style={{ ...thStyle, width: 48 }}>#</th>
                    <th style={thStyle}>First Name</th>
                    <th style={thStyle}>Last Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Hire Date</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Validation</th>
                    {duplicates.length > 0 && <th style={{ ...thStyle, width: 100 }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => {
                    const hasErrors = row.errors.length > 0;
                    const isDuplicate = duplicateRowIndexes.has(row.rowIndex);
                    const isSkipped = skipDuplicates.has(row.rowIndex);
                    return (
                      <tr key={row.rowIndex} style={{ borderBottom: `1px solid ${C.rule}`, background: isSkipped ? "#F5F5F5" : isDuplicate ? "#FFFBEB" : hasErrors ? "#FFF8F0" : "transparent", opacity: isSkipped ? 0.5 : 1 }}>
                        <td style={{ ...tdStyle, fontFamily: C.mono, color: C.inkFaint }}>{row.rowIndex}</td>
                        <td style={tdStyle}>{row.mapped.firstName || <span style={{ color: C.red, fontStyle: "italic" }}>missing</span>}</td>
                        <td style={tdStyle}>{row.mapped.lastName || <span style={{ color: C.red, fontStyle: "italic" }}>missing</span>}</td>
                        <td style={{ ...tdStyle, color: C.inkLight }}>{row.mapped.email || "—"}</td>
                        <td style={{ ...tdStyle, color: C.inkLight }}>{row.mapped.role || "—"}</td>
                        <td style={{ ...tdStyle, fontFamily: C.mono, fontSize: "0.78rem", color: C.inkLight }}>{row.mapped.hireDate || "—"}</td>
                        <td style={tdStyle}>
                          {row.mapped.status ? (
                            <span style={{
                              fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 10,
                              background: row.mapped.status === "active" ? "#D1FAE5" : row.mapped.status === "terminated" ? "#FEE2E2" : "#FEF3CD",
                              color: row.mapped.status === "active" ? "#065F46" : row.mapped.status === "terminated" ? C.red : C.amber,
                            }}>
                              {row.mapped.status}
                            </span>
                          ) : (
                            <span style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "#D1FAE5", color: "#065F46" }}>active</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {hasErrors ? (
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                              <XCircle size={14} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
                              <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.red }}>
                                {row.errors.join("; ")}
                              </span>
                            </div>
                          ) : isDuplicate ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <AlertTriangle size={14} color={C.amber} />
                              <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.amber }}>Duplicate</span>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <CheckCircle size={14} color={C.sage} />
                              <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.sage }}>OK</span>
                            </div>
                          )}
                        </td>
                        {duplicates.length > 0 && (
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            {isDuplicate ? (
                              <button
                                onClick={() => {
                                  setSkipDuplicates(prev => {
                                    const next = new Set(prev);
                                    if (next.has(row.rowIndex)) {
                                      next.delete(row.rowIndex);
                                    } else {
                                      next.add(row.rowIndex);
                                    }
                                    return next;
                                  });
                                }}
                                style={{
                                  fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600,
                                  padding: "4px 10px", borderRadius: 4, border: "none", cursor: "pointer",
                                  background: isSkipped ? "#EFE9E0" : C.amber,
                                  color: isSkipped ? C.inkMid : "#fff",
                                }}
                              >
                                {isSkipped ? "Import" : "Skip"}
                              </button>
                            ) : null}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {validRows.length === 0 && (
              <div style={{ padding: "16px 20px", background: "#FEE2E2", borderRadius: 6, border: `1px solid rgba(184,64,64,0.2)`, marginBottom: 24 }}>
                <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.red, margin: 0 }}>
                  No valid rows found. Please fix the errors above or upload a corrected file.
                </p>
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setStep("map")}
                style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600, color: C.inkMid, background: "transparent", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "10px 20px", cursor: "pointer" }}
              >
                ← Back to Column Mapping
              </button>
              <button
                onClick={handleImport}
                disabled={validRows.length === 0 || importMutation.isPending}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                  color: "#F0EBE3", background: validRows.length === 0 ? C.inkFaint : C.forest,
                  border: "none", borderRadius: 4, padding: "10px 24px",
                  cursor: validRows.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                {importMutation.isPending ? (
                  <><Loader2 size={14} className="animate-spin" /> Importing…</>
                ) : (
                  <>Import {validRows.length} Staff Member{validRows.length !== 1 ? "s" : ""}</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step: Result ──────────────────────────────────────── */}
        {step === "result" && importResult && (
          <div>
            <div style={{
              padding: "32px", borderRadius: 8,
              background: importResult.inserted > 0 ? "#EBF2ED" : "#FEF3CD",
              border: `1px solid ${importResult.inserted > 0 ? "rgba(29,61,47,0.15)" : "rgba(196,134,42,0.3)"}`,
              marginBottom: 24, textAlign: "center",
            }}>
              {importResult.inserted > 0 ? (
                <CheckCircle size={48} color={C.sage} style={{ margin: "0 auto 16px" }} />
              ) : (
                <AlertTriangle size={48} color={C.amber} style={{ margin: "0 auto 16px" }} />
              )}
              <h2 style={{ fontFamily: C.serif, fontSize: "1.75rem", fontWeight: 700, color: C.inkDark, margin: "0 0 8px" }}>
                {importResult.inserted > 0
                  ? `${importResult.inserted} staff member${importResult.inserted !== 1 ? "s" : ""} imported`
                  : "Import completed with issues"}
              </h2>
              <p style={{ fontFamily: C.sans, fontSize: "0.9rem", color: C.inkLight, margin: 0 }}>
                {importResult.errors.length > 0
                  ? `${importResult.errors.length} row${importResult.errors.length !== 1 ? "s" : ""} could not be saved.`
                  : "All rows were saved successfully."}
              </p>
            </div>

            {importResult.errors.length > 0 && (
              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "12px 20px", background: C.linen, borderBottom: `1px solid ${C.rule}` }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>
                    Rows that failed to save
                  </p>
                </div>
                {importResult.errors.map((e, i) => (
                  <div key={i} style={{ padding: "10px 20px", borderBottom: i < importResult.errors.length - 1 ? `1px solid ${C.rule}` : "none", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <XCircle size={14} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: C.inkMid }}>
                      <strong>Row {e.row}:</strong> {e.message}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => navigate("/staff")}
                style={{
                  fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                  color: "#F0EBE3", background: C.forest,
                  border: "none", borderRadius: 4, padding: "10px 24px", cursor: "pointer",
                }}
              >
                View Staff Directory
              </button>
              <button
                onClick={handleReset}
                style={{ fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600, color: C.inkMid, background: "transparent", border: `1px solid ${C.rule}`, borderRadius: 4, padding: "10px 20px", cursor: "pointer" }}
              >
                Import Another File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.rule}`, padding: "24px 32px", textAlign: "center" }}>
        <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint, margin: 0 }}>
          AuditReady does not collect patient, client, or clinical data. Staff records only. &copy; {new Date().getFullYear()} AuditReady.
        </p>
            </footer>
    </DashboardLayout>
  );
}
// ── Table cell styles ──────────────────────────────────────────
const thStyle: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  fontSize: "0.72rem",
  fontWeight: 700,
  color: "#5A5048",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  padding: "11px 16px",
  textAlign: "left",
  borderBottom: "1px solid #E2D9CE",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  fontSize: "0.83rem",
  color: "#1C1917",
  padding: "10px 16px",
  verticalAlign: "top",
};
