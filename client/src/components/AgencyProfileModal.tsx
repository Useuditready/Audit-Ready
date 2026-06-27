/**
 * AgencyProfileModal
 * Shown before Stripe checkout to collect required agency information.
 * Fields: Agency Name, Address, City, State, Zip, Tax ID / EIN, Agency Type.
 * Optional: Rep Code (validated live against rep.validateCode).
 * On submit, saves via trpc.settings.updateProfile, then calls onComplete(repCode?).
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { X, Building2, MapPin, FileText, ChevronRight, Loader2, Tag, CheckCircle, AlertCircle } from "lucide-react";

// ── Design tokens (match Home.tsx / Pricing.tsx) ──────────────
const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  amber:     "#C4862A",
  parchment: "#F7F3ED",
  ink:       "#1A1A1A",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  rule:      "#E2D9CE",
  linen:     "#EFE9E0",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
  serif:     "'DM Serif Display', Georgia, serif",
};

const NC_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

const AGENCY_TYPES = [
  "ABA / Autism Services",
  "Mental Health Clinic",
  "Psychology Practice",
  "Behavioral Health",
  "Home Health Agency",
  "Other",
];

interface AgencyProfileModalProps {
  planName: string;
  billingInterval: "monthly" | "annual";
  onComplete: (repCode?: string) => void;
  onClose: () => void;
}

interface FormData {
  agencyName: string;
  agencyAddress: string;
  agencyCity: string;
  agencyState: string;
  agencyZip: string;
  agencyTaxId: string;
  agencyType: string;
}

interface FormErrors {
  agencyName?: string;
  agencyAddress?: string;
  agencyCity?: string;
  agencyState?: string;
  agencyZip?: string;
  agencyTaxId?: string;
  agencyType?: string;
}

type RepCodeStatus = "idle" | "checking" | "valid" | "invalid" | "cleared";

export default function AgencyProfileModal({
  planName,
  billingInterval,
  onComplete,
  onClose,
}: AgencyProfileModalProps) {
  const [form, setForm] = useState<FormData>({
    agencyName: "",
    agencyAddress: "",
    agencyCity: "",
    agencyState: "NC",
    agencyZip: "",
    agencyTaxId: "",
    agencyType: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // Rep code state
  const [repCodeInput, setRepCodeInput] = useState("");
  const [repCodeStatus, setRepCodeStatus] = useState<RepCodeStatus>("idle");
  const [repCodeMessage, setRepCodeMessage] = useState("");
  const [validRepCode, setValidRepCode] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateProfile = trpc.settings.updateProfile.useMutation();
  const validateRepCode = trpc.rep.validateCode.useQuery(
    { code: repCodeInput.trim() },
    {
      enabled: false, // manual trigger only
    }
  );
  const utils = trpc.useUtils();

  // Debounced rep code validation
  useEffect(() => {
    const trimmed = repCodeInput.trim();
    if (!trimmed) {
      setRepCodeStatus("idle");
      setRepCodeMessage("");
      setValidRepCode(undefined);
      return;
    }

    setRepCodeStatus("checking");
    setRepCodeMessage("");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await utils.rep.validateCode.fetch({ code: trimmed });
        if (result.valid) {
          setRepCodeStatus("valid");
          setRepCodeMessage(`Rep code accepted — ${result.repName}`);
          setValidRepCode(trimmed.toUpperCase());
        } else {
          setRepCodeStatus("invalid");
          setRepCodeMessage(result.message);
          setValidRepCode(undefined);
        }
      } catch {
        setRepCodeStatus("invalid");
        setRepCodeMessage("Unable to validate code. You can continue without one.");
        setValidRepCode(undefined);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [repCodeInput]);

  const updateField = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  function formatEin(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }

  function validate(): boolean {
    const e: FormErrors = {};
    if (!form.agencyName.trim()) e.agencyName = "Agency name is required.";
    if (!form.agencyAddress.trim()) e.agencyAddress = "Street address is required.";
    if (!form.agencyCity.trim()) e.agencyCity = "City is required.";
    if (!form.agencyState) e.agencyState = "State is required.";
    if (!form.agencyZip.trim()) e.agencyZip = "ZIP code is required.";
    else if (!/^\d{5}(-\d{4})?$/.test(form.agencyZip.trim())) e.agencyZip = "Enter a valid ZIP code.";
    if (!form.agencyTaxId.trim()) e.agencyTaxId = "Tax ID / EIN is required.";
    else if (!/^\d{2}-\d{7}$/.test(form.agencyTaxId.trim())) e.agencyTaxId = "Enter a valid EIN (XX-XXXXXXX).";
    if (!form.agencyType) e.agencyType = "Agency type is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        agencyName: form.agencyName.trim(),
        agencyAddress: form.agencyAddress.trim(),
        agencyCity: form.agencyCity.trim(),
        agencyState: form.agencyState,
        agencyZip: form.agencyZip.trim(),
        agencyTaxId: form.agencyTaxId.trim(),
        agencyType: form.agencyType,
      });
      // Pass the validated rep code (or undefined for direct) to the parent
      onComplete(validRepCode);
    } catch {
      setSaving(false);
    }
  }

  const planLabel = planName.charAt(0).toUpperCase() + planName.slice(1);
  const intervalLabel = billingInterval === "annual" ? "Annual" : "Monthly";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(26,26,26,0.72)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(4px)",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: C.parchment,
          borderRadius: 8,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
          fontFamily: C.sans,
        }}
      >
        {/* Header */}
        <div style={{
          padding: "28px 32px 20px",
          borderBottom: `1px solid ${C.rule}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Building2 size={18} color={C.forest} />
              <span style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.amber }}>
                Before You Subscribe
              </span>
            </div>
            <h2 style={{ fontFamily: C.serif, fontSize: "1.6rem", fontWeight: 700, color: C.ink, margin: 0, letterSpacing: "-0.02em" }}>
              Agency Information
            </h2>
            <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, margin: "6px 0 0", lineHeight: 1.5 }}>
              Required for billing and compliance records. Subscribing to <strong style={{ color: C.inkMid }}>{planLabel} — {intervalLabel}</strong>.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: C.inkLight, marginTop: -4 }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "24px 32px 32px" }}>
          {/* Agency Name */}
          <FieldGroup label="Agency / Practice Name" required error={errors.agencyName}>
            <input
              type="text"
              value={form.agencyName}
              onChange={e => updateField("agencyName", e.target.value)}
              placeholder="e.g. Bright Path ABA Services"
              style={inputStyle(!!errors.agencyName)}
              autoFocus
            />
          </FieldGroup>

          {/* Agency Type */}
          <FieldGroup label="Agency Type" required error={errors.agencyType}>
            <select
              value={form.agencyType}
              onChange={e => updateField("agencyType", e.target.value)}
              style={inputStyle(!!errors.agencyType)}
            >
              <option value="">Select agency type…</option>
              {AGENCY_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </FieldGroup>

          {/* Street Address */}
          <FieldGroup label="Street Address" required error={errors.agencyAddress} icon={<MapPin size={14} color={C.inkLight} />}>
            <input
              type="text"
              value={form.agencyAddress}
              onChange={e => updateField("agencyAddress", e.target.value)}
              placeholder="123 Main Street, Suite 100"
              style={inputStyle(!!errors.agencyAddress)}
            />
          </FieldGroup>

          {/* City / State / ZIP row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px", gap: 12 }}>
            <FieldGroup label="City" required error={errors.agencyCity}>
              <input
                type="text"
                value={form.agencyCity}
                onChange={e => updateField("agencyCity", e.target.value)}
                placeholder="Raleigh"
                style={inputStyle(!!errors.agencyCity)}
              />
            </FieldGroup>
            <FieldGroup label="State" required error={errors.agencyState}>
              <select
                value={form.agencyState}
                onChange={e => updateField("agencyState", e.target.value)}
                style={inputStyle(!!errors.agencyState)}
              >
                {NC_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FieldGroup>
            <FieldGroup label="ZIP" required error={errors.agencyZip}>
              <input
                type="text"
                value={form.agencyZip}
                onChange={e => updateField("agencyZip", e.target.value)}
                placeholder="27601"
                maxLength={10}
                style={inputStyle(!!errors.agencyZip)}
              />
            </FieldGroup>
          </div>

          {/* Tax ID / EIN */}
          <FieldGroup
            label="Tax ID / EIN"
            required
            error={errors.agencyTaxId}
            hint="Format: XX-XXXXXXX"
            icon={<FileText size={14} color={C.inkLight} />}
          >
            <input
              type="text"
              value={form.agencyTaxId}
              onChange={e => updateField("agencyTaxId", formatEin(e.target.value))}
              placeholder="12-3456789"
              maxLength={10}
              style={inputStyle(!!errors.agencyTaxId)}
            />
          </FieldGroup>

          {/* ── Rep Code (optional) ─────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "flex", alignItems: "center", gap: 5,
              fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
              color: C.inkMid, marginBottom: 6, letterSpacing: "0.01em",
            }}>
              <Tag size={14} color={C.inkLight} />
              Rep Code
              <span style={{ fontWeight: 400, color: C.inkLight, marginLeft: 4 }}>— Optional</span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={repCodeInput}
                onChange={e => setRepCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter code if provided by your representative"
                maxLength={32}
                style={{
                  ...inputStyle(repCodeStatus === "invalid"),
                  paddingRight: repCodeStatus !== "idle" ? 36 : 12,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              />
              {/* Status icon */}
              {repCodeStatus === "checking" && (
                <Loader2 size={15} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: C.inkLight, animation: "spin 1s linear infinite" }} />
              )}
              {repCodeStatus === "valid" && (
                <CheckCircle size={15} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#2A7A4A" }} />
              )}
              {repCodeStatus === "invalid" && (
                <AlertCircle size={15} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "#B84040" }} />
              )}
            </div>
            {/* Status message */}
            {repCodeStatus === "valid" && repCodeMessage && (
              <p style={{ fontFamily: C.sans, fontSize: "0.73rem", color: "#2A7A4A", marginTop: 4 }}>
                {repCodeMessage}
              </p>
            )}
            {repCodeStatus === "invalid" && repCodeMessage && (
              <p style={{ fontFamily: C.sans, fontSize: "0.73rem", color: "#B84040", marginTop: 4 }}>
                {repCodeMessage}
              </p>
            )}
            {repCodeStatus === "idle" && (
              <p style={{ fontFamily: C.sans, fontSize: "0.73rem", color: C.inkLight, marginTop: 4 }}>
                Leave blank to continue without a rep code.
              </p>
            )}
          </div>

          {/* Submit */}
          <div style={{ marginTop: 28, display: "flex", gap: 12, alignItems: "center" }}>
            <button
              type="submit"
              disabled={saving || repCodeStatus === "checking"}
              style={{
                flex: 1,
                background: (saving || repCodeStatus === "checking") ? C.forestMid : C.forest,
                color: "#F0EBE3",
                border: "none",
                borderRadius: 4,
                padding: "14px 24px",
                fontFamily: C.sans,
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: (saving || repCodeStatus === "checking") ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "0.02em",
                transition: "background 160ms ease-out",
              }}
            >
              {saving ? (
                <>
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                  Saving…
                </>
              ) : (
                <>
                  Continue to Payment
                  <ChevronRight size={16} />
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: `1px solid ${C.rule}`,
                borderRadius: 4,
                padding: "14px 20px",
                fontFamily: C.sans,
                fontSize: "0.9rem",
                color: C.inkMid,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>

          <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkLight, marginTop: 14, lineHeight: 1.5 }}>
            Your information is used solely for billing and compliance documentation. We do not share it with third parties.
          </p>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function FieldGroup({
  label,
  required,
  error,
  hint,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "flex", alignItems: "center", gap: 5,
        fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
        color: C.inkMid, marginBottom: 6, letterSpacing: "0.01em",
      }}>
        {icon}
        {label}
        {required && <span style={{ color: C.amber }}>*</span>}
        {hint && <span style={{ fontWeight: 400, color: C.inkLight, marginLeft: 4 }}>— {hint}</span>}
      </label>
      {children}
      {error && (
        <p style={{ fontFamily: C.sans, fontSize: "0.73rem", color: "#B84040", marginTop: 4 }}>
          {error}
        </p>
      )}
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    fontFamily: C.sans,
    fontSize: "0.88rem",
    color: "#1A1A1A",
    background: "#FDFAF6",
    border: `1px solid ${hasError ? "#B84040" : "#E2D9CE"}`,
    borderRadius: 4,
    outline: "none",
    transition: "border-color 150ms",
  };
}
