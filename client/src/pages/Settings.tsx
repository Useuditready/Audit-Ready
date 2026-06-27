import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  User,
  Bell,
  Shield,
  Save,
  Loader2,
  CheckCircle,
  Building2,
  Phone,
  Mail,
  MapPin,
  Hash,
  ChevronRight,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  forest:     "#1D3D2F",
  forestMid:  "#2A5240",
  sage:       "#3D6B52",
  sageLight:  "#5A8C6E",
  amber:      "#C4862A",
  amberLight: "#E8A94A",
  parchment:  "#F7F3ED",
  cream:      "#FDFAF6",
  linen:      "#EFE9E0",
  linenDark:  "#E5DDD2",
  inkDark:    "#1C1917",
  inkMid:     "#5A5048",
  inkLight:   "#7A6E64",
  inkFaint:   "#A89880",
  rule:       "#E2D9CE",
  ruleDark:   "#C4B8A8",
  serif:      "'DM Serif Display', Georgia, serif",
  sans:       "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:       "'JetBrains Mono', 'Courier New', monospace",
};

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

const AGENCY_TYPES = [
  "ABA / Autism Agency",
  "Mental Health Clinic",
  "Psychology Practice",
  "Home Care Agency",
  "Behavioral Health Group",
  "Outpatient Therapy Practice",
  "School-Based Services",
  "Other",
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

type Section = "profile" | "agency" | "billing" | "notifications" | "account";

// ── Shared input style helper ─────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: `1px solid ${C.rule}`,
  borderRadius: 5,
  fontFamily: C.sans,
  fontSize: "0.88rem",
  color: C.inkDark,
  background: "#fff",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontFamily: C.sans,
  fontSize: "0.78rem",
  fontWeight: 600,
  color: C.inkMid,
  marginBottom: 6,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

function FieldGroup({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>
        <Icon size={13} /> {label}
      </label>
      {children}
    </div>
  );
}

// ── Additional notification preferences card ─────────────────
function AdditionalNotifPrefs() {
  const { data, refetch } = trpc.notifications.getPreferences.useQuery();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [billingNotifications, setBillingNotifications] = useState(true);
  const [repCommissionAlerts, setRepCommissionAlerts] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setEmailEnabled(data.emailEnabled !== false);
      setBillingNotifications(data.billingNotifications !== false);
      setRepCommissionAlerts(data.repCommissionAlerts !== false);
      setDirty(false);
    }
  }, [data]);

  const update = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => { refetch(); setDirty(false); },
  });

  const toggleStyle = (on: boolean): React.CSSProperties => ({
    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
    background: on ? C.sage : C.linenDark, position: "relative", flexShrink: 0,
  });
  const knobStyle = (on: boolean): React.CSSProperties => ({
    position: "absolute", top: 3, left: on ? 22 : 3,
    width: 18, height: 18, borderRadius: "50%", background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    transition: "left 160ms cubic-bezier(0.23,1,0.32,1)",
  });

  const rows = [
    { key: "emailEnabled", label: "All email notifications", desc: "Master toggle — turn off to stop all notification emails", value: emailEnabled, set: (v: boolean) => { setEmailEnabled(v); setDirty(true); } },
    { key: "billingNotifications", label: "Billing & subscription emails", desc: "Payment confirmations, renewal reminders, and failed payment alerts", value: billingNotifications, set: (v: boolean) => { setBillingNotifications(v); setDirty(true); } },
    { key: "repCommissionAlerts", label: "Commission alerts", desc: "Notify when a new commission is earned from a rep-attributed signup", value: repCommissionAlerts, set: (v: boolean) => { setRepCommissionAlerts(v); setDirty(true); } },
  ];

  return (
    <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, padding: "28px 28px 24px", marginTop: 20 }}>
      <div style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 18 }}>
        Additional preferences
      </div>
      {rows.map(({ key, label, desc, value, set }) => (
        <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.rule}` }}>
          <div>
            <div style={{ fontFamily: C.sans, fontSize: "0.88rem", fontWeight: 600, color: C.inkDark }}>{label}</div>
            <div style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight, marginTop: 2 }}>{desc}</div>
          </div>
          <button onClick={() => set(!value)} style={toggleStyle(value)}>
            <span style={knobStyle(value)} />
          </button>
        </div>
      ))}
      <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
        <button
          disabled={!dirty || update.isPending}
          onClick={() => update.mutate({ emailEnabled, billingNotifications, repCommissionAlerts })}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 22px", borderRadius: 5, border: "none", cursor: dirty ? "pointer" : "not-allowed",
            background: dirty ? C.forest : C.linenDark,
            color: dirty ? "#F0EBE3" : C.inkFaint,
            fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
          }}
        >
          {update.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save preferences
        </button>
        {dirty && (
          <button
            onClick={() => { if (data) { setEmailEnabled(data.emailEnabled !== false); setBillingNotifications(data.billingNotifications !== false); setRepCommissionAlerts(data.repCommissionAlerts !== false); } setDirty(false); }}
            style={{ padding: "10px 18px", borderRadius: 5, border: `1px solid ${C.rule}`, cursor: "pointer", background: "transparent", color: C.inkLight, fontFamily: C.sans, fontSize: "0.85rem" }}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function AiUsageRow() {
  const { data: usage, isLoading } = trpc.ai.getUsage.useQuery(undefined, { staleTime: 60_000 });
  if (isLoading || !usage) return null;
  const pct = Math.min((usage.used / usage.limit) * 100, 100);
  const barColor = pct >= 100 ? "#B84040" : pct >= 80 ? "#C4862A" : "#3D6B52";
  return (
    <div style={{ marginBottom: 16, padding: "14px 0", borderBottom: "1px solid #E2D9CE" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.85rem", color: "#5A5048" }}>AI Compliance Assistant</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "#5A5048", fontWeight: 600 }}>
          {usage.used} / {usage.limit} questions
          {usage.resetDate && pct < 100 && (
            <span style={{ fontWeight: 400, color: "#A89880", marginLeft: 6 }}>
              · resets {new Date(usage.resetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </span>
      </div>
      <div style={{ height: 4, background: "#E2D9CE", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: 2, transition: "width 400ms ease-out" }} />
      </div>
      {pct >= 100 && (
        <p style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: "0.75rem", color: "#B84040", margin: "6px 0 0" }}>
          Limit reached. <a href="/pricing" style={{ color: "#C4862A", fontWeight: 600 }}>Upgrade your plan</a> to increase your monthly limit.
        </p>
      )}
    </div>
  );
}

export default function Settings() {
  const { user: authUser, loading: authLoading } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("profile");

  const { data: profile, isLoading, refetch } = trpc.settings.getProfile.useQuery(undefined, {
    enabled: !!authUser,
  });

  // ── Profile form state ─────────────────────────────────────
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);

  // ── Agency form state ──────────────────────────────────────
  const [agencyName, setAgencyName] = useState("");
  const [agencyType, setAgencyType] = useState("");
  const [agencyAddress, setAgencyAddress] = useState("");
  const [agencyCity, setAgencyCity] = useState("");
  const [agencyState, setAgencyState] = useState("");
  const [agencyZip, setAgencyZip] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [agencyTaxId, setAgencyTaxId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [agencyDirty, setAgencyDirty] = useState(false);

  // ── Billing contact form state ─────────────────────────────
  const [billingContactName, setBillingContactName] = useState("");
  const [billingContactEmail, setBillingContactEmail] = useState("");
  const [billingDirty, setBillingDirty] = useState(false);

  // ── Danger Zone / Account deletion state ─────────────────────
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionConfirmText, setDeletionConfirmText] = useState("");
  const [showDeletionForm, setShowDeletionForm] = useState(false);
  const [deletionSubmitted, setDeletionSubmitted] = useState(false);

  const { data: accountStatus, refetch: refetchAccountStatus } = trpc.account.status.useQuery(undefined, {
    enabled: !!authUser,
    staleTime: 60_000,
  });

  const requestDeletion = trpc.account.requestDeletion.useMutation({
    onSuccess: (result) => {
      setDeletionSubmitted(true);
      setShowDeletionForm(false);
      setDeletionConfirmText("");
      refetchAccountStatus();
      if (result.alreadyRequested) {
        toast.info("A deletion request was already on file for this account.");
      } else {
        toast.success("Deletion request submitted. We will process it within 30 days.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? "");
      setPhone(profile.phone ?? "");
      setAgencyName(profile.agencyName ?? "");
      setAgencyType(profile.agencyType ?? "");
      setAgencyAddress(profile.agencyAddress ?? "");
      setAgencyCity(profile.agencyCity ?? "");
      setAgencyState(profile.agencyState ?? "");
      setAgencyZip(profile.agencyZip ?? "");
      setAgencyPhone(profile.phone ?? "");
      setAgencyTaxId(profile.agencyTaxId ?? "");
      setContactEmail((profile as any).contactEmail ?? "");
      setBillingContactName((profile as any).billingContactName ?? "");
      setBillingContactEmail((profile as any).billingContactEmail ?? "");
      setProfileDirty(false);
      setAgencyDirty(false);
      setBillingDirty(false);
    }
  }, [profile]);

  const updateProfile = trpc.settings.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile saved");
      setProfileDirty(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Notification preferences state ────────────────────────
  const [remind90, setRemind90] = useState(true);
  const [remind60, setRemind60] = useState(true);
  const [remind30, setRemind30] = useState(true);
  const [notifDirty, setNotifDirty] = useState(false);

  useEffect(() => {
    if (profile?.notificationPreferences) {
      const p = profile.notificationPreferences as { remind90: boolean; remind60: boolean; remind30: boolean };
      setRemind90(p.remind90 !== false);
      setRemind60(p.remind60 !== false);
      setRemind30(p.remind30 !== false);
      setNotifDirty(false);
    }
  }, [profile]);

  const updateNotifPrefs = trpc.settings.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      toast.success("Notification preferences saved");
      setNotifDirty(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const formatEin = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 9);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  };

  if (authLoading || isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} color={C.sage} className="animate-spin" />
      </div>
    );
  }

  const navItems: { id: Section; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "agency", label: "Agency Info", icon: Building2 },
    { id: "billing", label: "Billing Contact", icon: CreditCard },
    { id: "notifications", label: "Email Notifications", icon: Bell },
    { id: "account", label: "Account & Data", icon: Shield },
  ];

  const SaveBar = ({
    dirty, pending, onSave, onCancel,
  }: { dirty: boolean; pending: boolean; onSave: () => void; onCancel: () => void }) => (
    <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
      <button
        disabled={!dirty || pending}
        onClick={onSave}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "10px 22px", borderRadius: 5, border: "none", cursor: dirty ? "pointer" : "not-allowed",
          background: dirty ? C.forest : C.linenDark,
          color: dirty ? "#F0EBE3" : C.inkFaint,
          fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
        }}
      >
        {pending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save changes
      </button>
      {dirty && (
        <button
          onClick={onCancel}
          style={{ padding: "10px 18px", borderRadius: 5, border: `1px solid ${C.rule}`, cursor: "pointer", background: "transparent", color: C.inkLight, fontFamily: C.sans, fontSize: "0.85rem" }}
        >
          Cancel
        </button>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <PilotStatusBanner />
      <EmailVerificationBanner />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 32px 80px", display: "flex", gap: 32 }}>
        {/* Sidebar nav */}
        <aside style={{ width: 210, flexShrink: 0 }}>
          <div style={{ fontFamily: C.sans, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 10 }}>Settings</div>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                background: activeSection === id ? C.linen : "transparent",
                color: activeSection === id ? C.inkDark : C.inkLight,
                fontFamily: C.sans, fontSize: "0.85rem", fontWeight: activeSection === id ? 600 : 400,
                marginBottom: 2, textAlign: "left",
              }}
            >
              <Icon size={15} />
              {label}
              {activeSection === id && <ChevronRight size={13} style={{ marginLeft: "auto" }} />}
            </button>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* ── Profile section ─────────────────────────────── */}
          {activeSection === "profile" && (
            <div>
              <h1 style={{ fontFamily: C.serif, fontSize: "1.8rem", fontWeight: 700, color: C.inkDark, margin: "0 0 4px" }}>Profile</h1>
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, margin: "0 0 32px" }}>
                Update your name and phone number. Your email address is managed by your sign-in provider and cannot be changed here.
              </p>

              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, padding: "28px 28px 24px" }}>
                {/* Email (read-only) */}
                <FieldGroup label="Email address" icon={Mail}>
                  <div style={{ padding: "10px 14px", background: C.linen, border: `1px solid ${C.rule}`, borderRadius: 5, fontFamily: C.sans, fontSize: "0.88rem", color: C.inkLight }}>
                    {profile?.email ?? authUser?.email ?? "—"}
                    <span style={{ marginLeft: 10, fontSize: "0.72rem", color: C.inkFaint, fontStyle: "italic" }}>Managed by sign-in provider</span>
                  </div>
                </FieldGroup>

                <FieldGroup label="Full name" icon={User}>
                  <input
                    value={name}
                    onChange={(e) => { setName(e.target.value); setProfileDirty(true); }}
                    placeholder="Your full name"
                    style={inputStyle}
                  />
                </FieldGroup>

                <FieldGroup label="Phone number" icon={Phone}>
                  <input
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setProfileDirty(true); }}
                    placeholder="(555) 000-0000"
                    style={inputStyle}
                  />
                </FieldGroup>

                <SaveBar
                  dirty={profileDirty}
                  pending={updateProfile.isPending}
                  onSave={() => updateProfile.mutate({ name: name || undefined, phone: phone || null })}
                  onCancel={() => { setName(profile?.name ?? ""); setPhone(profile?.phone ?? ""); setProfileDirty(false); }}
                />
              </div>
            </div>
          )}

          {/* ── Agency Info section ──────────────────────────── */}
          {activeSection === "agency" && (
            <div>
              <h1 style={{ fontFamily: C.serif, fontSize: "1.8rem", fontWeight: 700, color: C.inkDark, margin: "0 0 4px" }}>Agency Information</h1>
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, margin: "0 0 32px" }}>
                Your agency's legal name, address, Tax ID / EIN, and contact email. This information may appear on audit exports and reports.
              </p>

              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, padding: "28px 28px 24px" }}>
                <div style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 20 }}>
                  Agency details
                </div>

                <FieldGroup label="Agency / practice name" icon={Building2}>
                  <input
                    value={agencyName}
                    onChange={(e) => { setAgencyName(e.target.value); setAgencyDirty(true); }}
                    placeholder="e.g. Bright Path ABA"
                    style={inputStyle}
                  />
                </FieldGroup>

                <FieldGroup label="Agency type" icon={Building2}>
                  <select
                    value={agencyType}
                    onChange={(e) => { setAgencyType(e.target.value); setAgencyDirty(true); }}
                    style={{ ...inputStyle, appearance: "none" }}
                  >
                    <option value="">Select agency type…</option>
                    {AGENCY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </FieldGroup>

                <FieldGroup label="Tax ID / EIN" icon={Hash}>
                  <input
                    value={agencyTaxId}
                    onChange={(e) => { setAgencyTaxId(formatEin(e.target.value)); setAgencyDirty(true); }}
                    placeholder="XX-XXXXXXX"
                    maxLength={10}
                    style={inputStyle}
                  />
                </FieldGroup>

                <FieldGroup label="Agency contact email" icon={Mail}>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => { setContactEmail(e.target.value); setAgencyDirty(true); }}
                    placeholder="admin@yourpractice.com"
                    style={inputStyle}
                  />
                </FieldGroup>

                <FieldGroup label="Agency phone" icon={Phone}>
                  <input
                    value={agencyPhone}
                    onChange={(e) => { setAgencyPhone(e.target.value); setAgencyDirty(true); }}
                    placeholder="(555) 000-0000"
                    style={inputStyle}
                  />
                </FieldGroup>

                <div style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, margin: "28px 0 16px" }}>
                  Agency address
                </div>

                <FieldGroup label="Street address" icon={MapPin}>
                  <input
                    value={agencyAddress}
                    onChange={(e) => { setAgencyAddress(e.target.value); setAgencyDirty(true); }}
                    placeholder="123 Main Street, Suite 200"
                    style={inputStyle}
                  />
                </FieldGroup>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 14, marginBottom: 20 }}>
                  <div>
                    <label style={labelStyle}><MapPin size={13} /> City</label>
                    <input
                      value={agencyCity}
                      onChange={(e) => { setAgencyCity(e.target.value); setAgencyDirty(true); }}
                      placeholder="Raleigh"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}><MapPin size={13} /> State</label>
                    <select
                      value={agencyState}
                      onChange={(e) => { setAgencyState(e.target.value); setAgencyDirty(true); }}
                      style={{ ...inputStyle, appearance: "none" }}
                    >
                      <option value="">State…</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}><MapPin size={13} /> ZIP</label>
                    <input
                      value={agencyZip}
                      onChange={(e) => { setAgencyZip(e.target.value.replace(/\D/g, "").slice(0, 10)); setAgencyDirty(true); }}
                      placeholder="27601"
                      maxLength={10}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <SaveBar
                  dirty={agencyDirty}
                  pending={updateProfile.isPending}
                  onSave={() => updateProfile.mutate({
                    agencyName: agencyName || null,
                    agencyType: agencyType || null,
                    agencyAddress: agencyAddress || null,
                    agencyCity: agencyCity || null,
                    agencyState: agencyState || null,
                    agencyZip: agencyZip || null,
                    agencyTaxId: agencyTaxId || null,
                    contactEmail: contactEmail || null,
                    phone: agencyPhone || null,
                  })}
                  onCancel={() => {
                    setAgencyName(profile?.agencyName ?? "");
                    setAgencyType(profile?.agencyType ?? "");
                    setAgencyAddress(profile?.agencyAddress ?? "");
                    setAgencyCity(profile?.agencyCity ?? "");
                    setAgencyState(profile?.agencyState ?? "");
                    setAgencyZip(profile?.agencyZip ?? "");
                    setAgencyTaxId(profile?.agencyTaxId ?? "");
                    setContactEmail((profile as any)?.contactEmail ?? "");
                    setAgencyPhone(profile?.phone ?? "");
                    setAgencyDirty(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Billing Contact section ──────────────────────── */}
          {activeSection === "billing" && (
            <div>
              <h1 style={{ fontFamily: C.serif, fontSize: "1.8rem", fontWeight: 700, color: C.inkDark, margin: "0 0 4px" }}>Billing Contact</h1>
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, margin: "0 0 32px" }}>
                The person who should receive billing-related emails, invoices, and payment receipts. This can be different from the account admin.
              </p>

              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, padding: "28px 28px 24px" }}>
                <FieldGroup label="Billing contact name" icon={User}>
                  <input
                    value={billingContactName}
                    onChange={(e) => { setBillingContactName(e.target.value); setBillingDirty(true); }}
                    placeholder="Full name of billing contact"
                    style={inputStyle}
                  />
                </FieldGroup>

                <FieldGroup label="Billing contact email" icon={Mail}>
                  <input
                    type="email"
                    value={billingContactEmail}
                    onChange={(e) => { setBillingContactEmail(e.target.value); setBillingDirty(true); }}
                    placeholder="billing@yourpractice.com"
                    style={inputStyle}
                  />
                </FieldGroup>

                <div style={{ padding: "14px 16px", background: "#F0F7F3", border: `1px solid #C8DDD2`, borderRadius: 5, marginBottom: 8 }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.inkMid, margin: 0, lineHeight: 1.55 }}>
                    To update your payment method, cancel your subscription, or download past invoices, visit the{" "}
                    <a href="/billing" style={{ color: C.sage, fontWeight: 600 }}>Billing page</a>.
                  </p>
                </div>

                <SaveBar
                  dirty={billingDirty}
                  pending={updateProfile.isPending}
                  onSave={() => updateProfile.mutate({
                    billingContactName: billingContactName || null,
                    billingContactEmail: billingContactEmail || null,
                  })}
                  onCancel={() => {
                    setBillingContactName((profile as any)?.billingContactName ?? "");
                    setBillingContactEmail((profile as any)?.billingContactEmail ?? "");
                    setBillingDirty(false);
                  }}
                />
              </div>
            </div>
          )}

          {/* ── Notifications section ────────────────────────── */}
          {activeSection === "notifications" && (
            <div>
              <h1 style={{ fontFamily: C.serif, fontSize: "1.8rem", fontWeight: 700, color: C.inkDark, margin: "0 0 4px" }}>Email Notifications</h1>
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, margin: "0 0 32px" }}>
                Choose which credential expiration reminders you receive. Reminders are sent to <strong>{profile?.email ?? authUser?.email}</strong>.
              </p>

              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, padding: "28px 28px 24px" }}>
                <div style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 18 }}>
                  Credential expiration reminders
                </div>

                {[
                  { key: "remind90", label: "90 days before expiration", desc: "Early warning — gives staff maximum time to renew", value: remind90, set: (v: boolean) => { setRemind90(v); setNotifDirty(true); } },
                  { key: "remind60", label: "60 days before expiration", desc: "Standard advance notice for most renewals", value: remind60, set: (v: boolean) => { setRemind60(v); setNotifDirty(true); } },
                  { key: "remind30", label: "30 days before expiration", desc: "Urgent reminder — renewal should be in progress", value: remind30, set: (v: boolean) => { setRemind30(v); setNotifDirty(true); } },
                ].map(({ key, label, desc, value, set }) => (
                  <div
                    key={key}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 0", borderBottom: `1px solid ${C.rule}`,
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: C.sans, fontSize: "0.88rem", fontWeight: 600, color: C.inkDark }}>{label}</div>
                      <div style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight, marginTop: 2 }}>{desc}</div>
                    </div>
                    <button
                      onClick={() => set(!value)}
                      style={{
                        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                        background: value ? C.sage : C.linenDark,
                        position: "relative", flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 3, left: value ? 22 : 3,
                        width: 18, height: 18, borderRadius: "50%", background: "#fff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        transition: "left 160ms cubic-bezier(0.23,1,0.32,1)",
                      }} />
                    </button>
                  </div>
                ))}

                <div style={{ marginTop: 24, display: "flex", gap: 10 }}>
                  <button
                    disabled={!notifDirty || updateNotifPrefs.isPending}
                    onClick={() => updateNotifPrefs.mutate({ remind90, remind60, remind30 })}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "10px 22px", borderRadius: 5, border: "none", cursor: notifDirty ? "pointer" : "not-allowed",
                      background: notifDirty ? C.forest : C.linenDark,
                      color: notifDirty ? "#F0EBE3" : C.inkFaint,
                      fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                    }}
                  >
                    {updateNotifPrefs.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Save preferences
                  </button>
                  {notifDirty && (
                    <button
                      onClick={() => {
                        const p = profile?.notificationPreferences as any;
                        setRemind90(p?.remind90 !== false);
                        setRemind60(p?.remind60 !== false);
                        setRemind30(p?.remind30 !== false);
                        setNotifDirty(false);
                      }}
                      style={{ padding: "10px 18px", borderRadius: 5, border: `1px solid ${C.rule}`, cursor: "pointer", background: "transparent", color: C.inkLight, fontFamily: C.sans, fontSize: "0.85rem" }}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint, marginTop: 16, lineHeight: 1.5 }}>
                  Reminders are sent daily at 09:00 UTC. To opt out of all emails, turn off all toggles above. For help, contact{" "}
                  <a href="mailto:support@auditready.com" style={{ color: C.sage }}>support@auditready.com</a>.
                </p>
              </div>

              {/* ── Additional notification preferences ─────── */}
              <AdditionalNotifPrefs />
            </div>
          )}

          {/* ── Account & Data section ───────────────────────── */}
          {activeSection === "account" && (
            <div>
              <h1 style={{ fontFamily: C.serif, fontSize: "1.8rem", fontWeight: 700, color: C.inkDark, margin: "0 0 4px" }}>Account & Data</h1>
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkLight, margin: "0 0 32px" }}>
                Information about your account, data handling, and how to request changes.
              </p>

              {/* Account info */}
              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, padding: "24px 28px", marginBottom: 20 }}>
                <div style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 16 }}>Account details</div>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: "10px 0", fontFamily: C.sans, fontSize: "0.85rem" }}>
                  <span style={{ color: C.inkLight }}>Plan</span>
                  <span style={{ color: C.inkDark, fontWeight: 600, textTransform: "capitalize" }}>
                    {profile?.plan ?? "Starter"}
                    {" "}
                    <a href="/billing" style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.sage, fontWeight: 500, marginLeft: 8 }}>Manage →</a>
                  </span>
                  <span style={{ color: C.inkLight }}>Role</span>
                  <span style={{ color: C.inkDark, fontWeight: 600, textTransform: "capitalize" }}>{profile?.role ?? "User"}</span>
                  <span style={{ color: C.inkLight }}>Member since</span>
                  <span style={{ color: C.inkDark }}>{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}</span>
                </div>
              </div>

              {/* Data & privacy */}
              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 8, padding: "24px 28px", marginBottom: 20 }}>
                <div style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 16 }}>Data & privacy</div>
                <div style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, lineHeight: 1.65 }}>
                  <p style={{ margin: "0 0 10px" }}>
                    AuditReady stores only administrative credential tracking data — staff names, roles, license numbers, expiration dates, and document locations. No patient records, no clinical notes, no PHI.
                    Your data is retained for the duration of your active subscription. Before closing your account, you may export your credential tracking data and reports using the CSV export feature.
                  </p>
                  <p style={{ margin: 0 }}>
                    AuditReady may retain limited billing, security, backup, and operational records as required for legal, tax, fraud-prevention, or system integrity purposes. Audit log entries are retained for 7 years for compliance purposes.
                    See our{" "}
                    <a href="/privacy" style={{ color: C.sage }}>Privacy Policy</a> for full details.
                  </p>
                </div>
              </div>

              {/* Danger zone */}
              <div style={{ background: "#FFF8F8", border: "1px solid #E8C8C8", borderRadius: 8, padding: "24px 28px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <AlertTriangle size={15} color="#B84040" />
                  <div style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#B84040" }}>Danger zone</div>
                </div>

                {/* Subscription cancellation note */}
                <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, lineHeight: 1.65, margin: "0 0 20px" }}>
                  To cancel your subscription, use the <strong>Manage Billing</strong> button on the{" "}
                  <a href="/billing" style={{ color: C.sage }}>Billing page</a>.
                  Your access remains active through the end of the current billing period.
                  See our <a href="/refunds" style={{ color: C.sage }}>Refund Policy</a> for billing terms.
                </p>

                {/* Divider */}
                <div style={{ borderTop: "1px solid #E8C8C8", margin: "0 0 20px" }} />

                {/* Account deletion request */}
                <div style={{ fontFamily: C.sans, fontSize: "0.88rem", fontWeight: 600, color: "#B84040", marginBottom: 8 }}>Request account deletion</div>

                {/* Already-requested state */}
                {(accountStatus?.deletionRequestedAt || deletionSubmitted) ? (
                  <div style={{ background: "#FEF3CD", border: "1px solid #E8C8A0", borderRadius: 6, padding: "14px 18px", fontFamily: C.sans, fontSize: "0.85rem", color: "#7A5C10", lineHeight: 1.6 }}>
                    <strong>Deletion request received.</strong>{" "}
                    {accountStatus?.deletionRequestedAt
                      ? `Submitted on ${new Date(accountStatus.deletionRequestedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
                      : ""}
                    {" "}We will process your request and permanently delete your account data within 30 days. You will receive a confirmation email when deletion is complete.
                  </div>
                ) : !showDeletionForm ? (
                  <>
                    <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, lineHeight: 1.65, margin: "0 0 14px" }}>
                      Submit a formal request to permanently delete your AuditReady account and all associated data. This action cannot be undone.
                      Per GDPR/CCPA requirements, your data will be deleted within 30 days of your request.
                    </p>
                    <div style={{ fontFamily: C.sans, fontSize: "0.78rem", color: C.inkFaint, marginBottom: 16, lineHeight: 1.55 }}>
                      Note: Audit log entries may be retained for up to 7 years for legal compliance purposes.
                      Billing records may also be retained as required by tax law.
                    </div>
                    <button
                      onClick={() => setShowDeletionForm(true)}
                      style={{
                        padding: "9px 20px", borderRadius: 5, border: "1px solid #E8C8C8", cursor: "pointer",
                        background: "transparent", color: "#B84040",
                        fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                      }}
                    >
                      Request account deletion
                    </button>
                  </>
                ) : (
                  /* Deletion confirmation form */
                  <div style={{ background: "#fff", border: "1px solid #E8C8C8", borderRadius: 6, padding: "20px 20px 16px" }}>
                    {/* Export-before-delete prompt */}
                    <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 5, padding: "12px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "1rem" }}>&#128190;</span>
                      <div style={{ fontFamily: C.sans, fontSize: "0.82rem", color: "#0369A1", lineHeight: 1.55 }}>
                        <strong>Want to download your data first?</strong>{" "}
                        <a href="/credentials" style={{ color: "#0369A1", fontWeight: 600 }}>Export credentials CSV &rarr;</a>
                        {" "}and{" "}
                        <a href="/staff" style={{ color: "#0369A1", fontWeight: 600 }}>Export staff CSV &rarr;</a>
                      </div>
                    </div>
                    <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, lineHeight: 1.65, margin: "0 0 16px" }}>
                      <strong>This will permanently delete your account.</strong> All staff records, credentials, documents, and settings will be removed within 30 days.
                      This action cannot be undone.
                    </p>

                    {/* Optional reason */}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, color: C.inkMid, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Reason for deletion <span style={{ fontWeight: 400, color: C.inkFaint }}>(optional)</span>
                      </label>
                      <textarea
                        value={deletionReason}
                        onChange={(e) => setDeletionReason(e.target.value.slice(0, 500))}
                        placeholder="Help us understand why you're leaving..."
                        rows={3}
                        style={{
                          width: "100%", padding: "10px 12px", borderRadius: 5, border: `1px solid ${C.rule}`,
                          fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark, resize: "vertical",
                          boxSizing: "border-box", lineHeight: 1.5,
                        }}
                      />
                      <div style={{ fontFamily: C.mono, fontSize: "0.72rem", color: C.inkFaint, textAlign: "right", marginTop: 3 }}>
                        {deletionReason.length}/500
                      </div>
                    </div>

                    {/* Confirmation input */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600, color: "#B84040", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Type <span style={{ fontFamily: C.mono, background: "#FFF0F0", padding: "1px 5px", borderRadius: 3 }}>DELETE</span> to confirm
                      </label>
                      <input
                        type="text"
                        value={deletionConfirmText}
                        onChange={(e) => setDeletionConfirmText(e.target.value)}
                        placeholder="DELETE"
                        style={{
                          ...inputStyle,
                          border: deletionConfirmText === "DELETE" ? "1px solid #B84040" : `1px solid ${C.rule}`,
                          maxWidth: 240,
                        }}
                      />
                    </div>

                    {/* GDPR/CCPA note */}
                    <div style={{ background: "#F7F3ED", border: `1px solid ${C.rule}`, borderRadius: 5, padding: "10px 14px", fontFamily: C.sans, fontSize: "0.78rem", color: C.inkLight, lineHeight: 1.55, marginBottom: 20 }}>
                      <strong>Your rights under GDPR/CCPA:</strong> Your data will be deleted within 30 days of this request.
                      You will receive a confirmation email when deletion is complete.
                      Certain records (billing, audit logs) may be retained as required by law.
                      See our <a href="/privacy" style={{ color: C.sage }}>Privacy Policy</a> for details.
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        disabled={deletionConfirmText !== "DELETE" || requestDeletion.isPending}
                        onClick={() => requestDeletion.mutate({ reason: deletionReason || undefined })}
                        style={{
                          display: "flex", alignItems: "center", gap: 7,
                          padding: "10px 22px", borderRadius: 5, border: "none",
                          cursor: deletionConfirmText === "DELETE" ? "pointer" : "not-allowed",
                          background: deletionConfirmText === "DELETE" ? "#B84040" : "#E8C8C8",
                          color: deletionConfirmText === "DELETE" ? "#fff" : "#A89880",
                          fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                        }}
                      >
                        {requestDeletion.isPending ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                        Permanently delete my account
                      </button>
                      <button
                        onClick={() => { setShowDeletionForm(false); setDeletionReason(""); setDeletionConfirmText(""); }}
                        style={{
                          padding: "10px 18px", borderRadius: 5, border: `1px solid ${C.rule}`,
                          cursor: "pointer", background: "transparent", color: C.inkLight,
                          fontFamily: C.sans, fontSize: "0.85rem",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.rule}`, padding: "24px 32px", background: C.cream }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint }}>
            © {new Date().getFullYear()} AuditReady. All rights reserved.
          </span>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"], ["Refund Policy", "/refunds"]].map(([label, href]) => (
              <a key={href} href={href} style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint, textDecoration: "none" }}>{label}</a>
            ))}
          </div>
        </div>
      </footer>
    </DashboardLayout>
  );
}
