/**
 * FirstLoginSetupModal
 *
 * Shown once to brand-new users who have no agencyName set.
 * Collects agency name and agency type — the minimum required to
 * personalise the dashboard and reminder emails.
 *
 * - Cannot be dismissed without completing setup (no X button, backdrop click disabled)
 * - On save, invalidates auth.me so the dashboard re-renders with the agency name
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Building2 } from "lucide-react";

// ── Design tokens (match the rest of the app) ─────────────────
const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  amber:     "#C4862A",
  amberPale: "#FEF3CD",
  parchment: "#F7F3ED",
  cream:     "#FDFAF6",
  linen:     "#EFE9E0",
  ink:       "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  rule:      "#E2D9CE",
  sans:      "'DM Sans', system-ui, sans-serif",
  serif:     "'Cormorant Garamond', Georgia, serif",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
};

const AGENCY_TYPES = [
  "ABA / Autism Services",
  "Mental Health Clinic",
  "Psychology Practice",
  "Behavioral Health",
  "Home Health Agency",
  "Other",
];

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "10px 12px",
  fontFamily: C.sans,
  fontSize: "0.875rem",
  color: C.ink,
  background: C.cream,
  border: `1px solid ${hasError ? "#B84040" : C.rule}`,
  borderRadius: 3,
  outline: "none",
  boxSizing: "border-box",
});

const selectStyle = (hasError: boolean): React.CSSProperties => ({
  ...inputStyle(hasError),
  appearance: "none",
  WebkitAppearance: "none",
  cursor: "pointer",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237A6E64' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 12px center",
  paddingRight: 32,
});

interface Props {
  onComplete: () => void;
}

export function FirstLoginSetupModal({ onComplete }: Props) {
  const [agencyName, setAgencyName] = useState("");
  const [agencyType, setAgencyType] = useState("");
  const [errors, setErrors] = useState<{ agencyName?: string; agencyType?: string }>({});
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();
  const updateProfile = trpc.settings.updateProfile.useMutation();

  const validate = () => {
    const e: typeof errors = {};
    if (!agencyName.trim()) e.agencyName = "Agency name is required.";
    if (!agencyType) e.agencyType = "Please select an agency type.";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        agencyName: agencyName.trim(),
        agencyType,
      });
      // Refresh the user object so the dashboard shows the agency name immediately
      await utils.auth.me.invalidate();
      onComplete();
    } catch (err) {
      console.error("[FirstLoginSetup] Failed to save:", err);
      setSaving(false);
    }
  };

  return (
    // Backdrop — click is intentionally disabled (user must complete setup)
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(28,25,23,0.55)",

        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "24px",
      }}
      // No onClick handler — backdrop click is disabled on purpose
    >
      <div
        style={{
          background: C.cream,
          border: `1px solid ${C.rule}`,
          borderRadius: 4,
          width: "100%",
          maxWidth: 440,
          padding: "36px 32px 32px",
          boxShadow: "0 8px 40px rgba(28,25,23,0.18)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: C.amberPale,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Building2 size={18} color={C.amber} />
            </div>
            <span style={{
              fontFamily: C.mono, fontSize: "0.6rem", fontWeight: 700,
              letterSpacing: "0.12em", textTransform: "uppercase", color: C.amber,
            }}>
              Welcome to AuditReady
            </span>
          </div>
          <h2 style={{
            fontFamily: C.serif, fontSize: "1.45rem", fontWeight: 700,
            color: C.ink, letterSpacing: "-0.02em", lineHeight: 1.25, margin: 0,
          }}>
            Tell us about your agency
          </h2>
          <p style={{
            fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid,
            lineHeight: 1.6, marginTop: 8,
          }}>
            This takes 30 seconds and personalises your dashboard and reminder emails.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Agency Name */}
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", fontFamily: C.sans, fontSize: "0.78rem",
              fontWeight: 600, color: C.inkMid, marginBottom: 6, letterSpacing: "0.01em",
            }}>
              Agency / Practice Name <span style={{ color: "#B84040" }}>*</span>
            </label>
            <input
              type="text"
              value={agencyName}
              onChange={e => { setAgencyName(e.target.value); setErrors(prev => ({ ...prev, agencyName: undefined })); }}
              placeholder="e.g. Sunrise ABA Services"
              style={inputStyle(!!errors.agencyName)}
              autoFocus
              disabled={saving}
            />
            {errors.agencyName && (
              <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: "#B84040", marginTop: 4 }}>
                {errors.agencyName}
              </p>
            )}
          </div>

          {/* Agency Type */}
          <div style={{ marginBottom: 28 }}>
            <label style={{
              display: "block", fontFamily: C.sans, fontSize: "0.78rem",
              fontWeight: 600, color: C.inkMid, marginBottom: 6, letterSpacing: "0.01em",
            }}>
              Agency Type <span style={{ color: "#B84040" }}>*</span>
            </label>
            <select
              value={agencyType}
              onChange={e => { setAgencyType(e.target.value); setErrors(prev => ({ ...prev, agencyType: undefined })); }}
              style={selectStyle(!!errors.agencyType)}
              disabled={saving}
            >
              <option value="">Select agency type…</option>
              {AGENCY_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {errors.agencyType && (
              <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: "#B84040", marginTop: 4 }}>
                {errors.agencyType}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: saving ? C.forestMid : C.forest,
              color: "#F0EBE3",
              border: "none",
              borderRadius: 3,
              fontFamily: C.sans,
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "background 160ms",
            }}
            onMouseEnter={e => { if (!saving) e.currentTarget.style.background = C.forestMid; }}
            onMouseLeave={e => { if (!saving) e.currentTarget.style.background = C.forest; }}
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Saving…
              </>
            ) : (
              "Set Up My Dashboard →"
            )}
          </button>

          <p style={{
            fontFamily: C.mono, fontSize: "0.6rem", color: C.inkFaint,
            letterSpacing: "0.04em", textAlign: "center", marginTop: 14,
          }}>
            You can update these details anytime in Settings.
          </p>
        </form>
      </div>
    </div>
  );
}
