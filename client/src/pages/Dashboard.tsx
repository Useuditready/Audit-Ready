/**
 * AuditReady Dashboard — Connected to real database via tRPC
 * Aesthetic: "Operational SaaS" — DM Serif Display headlines,
 * Plus Jakarta Sans body, parchment/linen backgrounds, forest-green sidebar,
 * amber gold accents, ruled dividers, JetBrains Mono for numbers.
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import { FirstLoginSetupModal } from "@/components/FirstLoginSetupModal";
import {
  LayoutDashboard, FileCheck, Users, Search, Settings,
  Bell, Download, ChevronRight, AlertTriangle, Clock,
  CheckCircle, XCircle, LogOut, Menu, X, Shield,
  TrendingUp, Calendar, Activity, Plus, Loader2, CreditCard, FileText, Upload,
  Award, BarChart3, ClipboardList,
} from "lucide-react";

// ── Palette & Tokens ───────────────────────────────────────────────────────────
const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  sage:      "#3D6B52",
  sageLight: "#5A8C6E",
  amber:     "#C4862A",
  amberLight:"#E8A94A",
  red:       "#B84040",
  parchment: "#F7F3ED",
  cream:     "#FDFAF6",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
  serif:     "'DM Serif Display', Georgia, serif",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
};

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ agencyName, onClose }: { agencyName?: string; onClose?: () => void }) {
  const { logout } = useAuth();
  const nav = [
    { icon: LayoutDashboard, label: "Dashboard",   href: "/dashboard",      active: true,  tourId: "nav-dashboard"  },
    { icon: Users,           label: "Staff",       href: "/staff",          active: false, tourId: "nav-staff"      },
    { icon: FileCheck,       label: "Credentials", href: "/credentials",    active: false, tourId: "nav-credentials" },
    { icon: CreditCard,      label: "Credentialing",  href: "/credentialing",  active: false, tourId: undefined },
    { icon: Clock,           label: "Pending Review", href: "/pending-review", active: false, tourId: "nav-pending"    },
    { icon: FileText,         label: "Reports",        href: "/reports",        active: false, tourId: undefined },
    { icon: Award,            label: "BACB Certifications", href: "/bacb-certifications", active: false, tourId: undefined },
    { icon: BarChart3,        label: "Supervision Ratios",  href: "/supervision-ratios",  active: false, tourId: undefined },
    { icon: Shield,            label: "OIG Exclusion Checks", href: "/oig-exclusion-checks", active: false, tourId: undefined },
    { icon: ClipboardList,    label: "New-Hire Checklist",   href: "/onboarding-checklist", active: false, tourId: undefined },
    { icon: Settings,         label: "Settings",       href: "/settings",       active: false, tourId: undefined },
  ];

  return (
    <aside style={{
      width: "100%", height: "100%", display: "flex", flexDirection: "column",
      background: C.forest, position: "relative", overflow: "hidden",
      fontFamily: C.sans,
    }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.12)", pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
        {/* Logo */}
        <div style={{ padding: "28px 20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/dashboard" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
            <img src={LOGO_URL} alt="AuditReady" style={{ height: 28, filter: "brightness(0) invert(1)" }} />
          </a>
          {onClose && (
            <button onClick={onClose} style={{ color: "rgba(240,235,227,0.5)", background: "none", border: "none", cursor: "pointer" }}>
              <X size={17} />
            </button>
          )}
        </div>

        {/* Rule */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "0 20px 16px" }} />

        {/* Agency */}
        <div style={{ padding: "0 20px 20px" }}>
          <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(240,235,227,0.35)", marginBottom: 4 }}>
            Agency
          </p>
          <p style={{ fontSize: "0.85rem", fontWeight: 500, color: "#F0EBE3", lineHeight: 1.3 }}>
            {agencyName || "Your Agency"}
          </p>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "0 10px" }}>
          <p style={{ fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(240,235,227,0.25)", padding: "4px 10px 8px" }}>
            Navigation
          </p>
          {nav.map(({ icon: Icon, label, href, active, tourId }) => (
            <Link key={href} href={href}
              {...(tourId ? { 'data-tour': tourId } : {})}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "9px 10px",
                marginBottom: 1,
                borderRadius: 3,
                borderLeft: active ? `2px solid ${C.amber}` : "2px solid transparent",
                paddingLeft: active ? 8 : 10,
                background: active ? "rgba(196,134,42,0.15)" : "transparent",
                color: active ? "#F0EBE3" : "rgba(240,235,227,0.45)",
                fontSize: "0.82rem",
                fontWeight: active ? 600 : 400,
                textDecoration: "none",
                transition: "background 120ms, color 120ms",
                cursor: "pointer",
              }}>
                <Icon size={14} strokeWidth={active ? 2 : 1.5} />
                {label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 10px 20px" }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 10 }} />
          <button
            onClick={() => logout()}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", width: "100%",
              background: "none", border: "none", cursor: "pointer",
              color: "rgba(240,235,227,0.35)", fontSize: "0.8rem",
              fontFamily: C.sans,
            }}
          >
            <LogOut size={13} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function levelColor(days: number) {
  if (days <= 30) return C.red;
  if (days <= 60) return C.amber;
  return C.sage;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysUntil(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Admin Quick Links (with Contact Inbox badge + Deletion Requests badge) ───────
function AdminQuickLinks() {
  const { data: newCount = 0 } = trpc.contact.countNew.useQuery(undefined, {
    refetchInterval: 60_000, // refresh every minute
  });
  const { data: deletionRequests } = trpc.devTools.listDeletionRequests.useQuery(undefined, {
    refetchInterval: 120_000, // refresh every 2 minutes
  });
  // "Pending" = deletion requested but admin hasn't added notes yet (not yet processed)
  const pendingDeletions = deletionRequests?.filter(r => !r.deletionAdminNotes) ?? [];
  const deletionCount = pendingDeletions.length;
  const hasUrgentDeletion = pendingDeletions.some(r => {
    const days = r.deletionRequestedAt ? Math.floor((Date.now() - new Date(r.deletionRequestedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    return days >= 25;
  });
  return (
    <div style={{ borderTop: `1px solid ${C.rule}`, padding: "16px 20px" }}>
      <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 10 }}>Admin</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Link href="/admin/leads" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 3, border: `1px solid ${C.rule}`, background: C.parchment, textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, color: C.inkDark }}>
          Pilot Requests &amp; Leads
        </Link>
        <Link href="/admin/sales" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 3, border: `1px solid ${C.rule}`, background: C.parchment, textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, color: C.inkDark }}>
          Sales &amp; Attribution Report
        </Link>
        <Link href="/admin/notifications" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 3, border: `1px solid ${C.rule}`, background: C.parchment, textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, color: C.inkDark }}>
          Notification Audit Log
        </Link>
        <Link href="/admin/audit-log" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 3, border: `1px solid ${C.rule}`, background: C.parchment, textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, color: C.inkDark }}>
          Activity Audit Log
        </Link>
        <Link href="/admin/contact" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 3, border: `1px solid ${C.rule}`, background: C.parchment, textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, color: C.inkDark }}>
          <span>Contact Inbox</span>
          {newCount > 0 && (
            <span style={{ background: C.amber, color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.04em" }}>
              {newCount}
            </span>
          )}
        </Link>
        <Link href="/admin/scheduled-jobs" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 3, border: `1px solid ${C.rule}`, background: C.parchment, textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, color: C.inkDark }}>
          Scheduled Jobs
        </Link>
        <Link href="/admin/deletions" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: 3, border: `1px solid ${deletionCount > 0 ? (hasUrgentDeletion ? "#FECACA" : C.rule) : C.rule}`, background: deletionCount > 0 ? (hasUrgentDeletion ? "#FFF8F8" : C.parchment) : C.parchment, textDecoration: "none", fontSize: "0.78rem", fontWeight: 600, color: C.inkDark }}>
          <span>Deletion Requests</span>
          {deletionCount > 0 && (
            <span style={{ background: hasUrgentDeletion ? "#B84040" : "#EF4444", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.04em", minWidth: 20, textAlign: "center" as const }}>
              {deletionCount > 99 ? '99+' : deletionCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, loading: authLoading, refresh: refreshAuth } = useAuth({ redirectOnUnauthenticated: true });
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ── Subscription status enforcement ─────────────────────────────────────────
  // Redirect locked accounts to /pricing so they can subscribe
  const { data: accountStatus } = trpc.account.status.useQuery(undefined, { enabled: !!user });
  useEffect(() => {
    if (!accountStatus) return;
    if (accountStatus.accountStatus === "locked") {
      navigate("/pricing");
    }
  }, [accountStatus, navigate]);

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, { enabled: !!user });
  const { data: credStats } = trpc.credentialing.dashboardStats.useQuery(undefined, { enabled: !!user });
  const { data: pendingReview } = trpc.credentials.pending.useQuery(undefined, { enabled: !!user });
  const { data: expiring, isLoading: expiringLoading } = trpc.dashboard.expiring.useQuery({ days: 90 }, { enabled: !!user });
  const { data: staffList } = trpc.staff.list.useQuery(undefined, { enabled: !!user });
  const { data: allCredentials } = trpc.credentials.listAll.useQuery(undefined, { enabled: !!user });
  const { data: importLogsList } = trpc.importLogs.list.useQuery(undefined, { enabled: !!user });
  const { data: lastVerifiedMap } = trpc.verification.lastVerifiedPerStaff.useQuery(undefined, { enabled: !!user, refetchOnWindowFocus: false });
  const [localDismissed, setLocalDismissed] = useState(false);
  // Show first-login setup modal when agencyName is not set yet
  const needsSetup = !authLoading && !!user && !(user as any).agencyName;
  const [setupComplete, setSetupComplete] = useState(false);
  const showSetupModal = needsSetup && !setupComplete;

  const utils = trpc.useUtils();
  const dismissOnboardingMutation = trpc.auth.dismissOnboarding.useMutation({
    onSuccess: () => {
      setLocalDismissed(true);
      utils.auth.me.invalidate();
    },
  });

  const hasStaff = (staffList ?? []).length > 0;
  const hasCredentials = (allCredentials ?? []).length > 0;
  const onboardingComplete = hasStaff && hasCredentials;
  // Persist via server flag; also allow local dismiss
  const serverDismissed = (user as any)?.onboardingDismissed === true;
  const showOnboarding = !localDismissed && !serverDismissed && !onboardingComplete;

  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.parchment }}>
        <Loader2 size={32} color={C.forest} className="animate-spin" />
      </div>
    );
  }

  const activeStaff = (staffList ?? []).filter((s: any) => s.status !== "inactive" && s.status !== "terminated");
  const neverVerifiedCount = lastVerifiedMap
    ? activeStaff.filter((s: any) => !lastVerifiedMap[s.id]).length
    : null;

  const STATS = [
    { label: "Total Staff",         value: stats?.totalStaff ?? 0,        sub: "Active members",  accent: C.forest  },
    { label: "Credentials Current", value: stats?.current ?? 0,           sub: "Up to date",      accent: C.sage    },
    { label: "Expiring Soon",       value: stats?.expiringSoon ?? 0,      sub: "Needs attention", accent: C.amber   },
    { label: "Expired / Critical",  value: stats?.expired ?? 0,           sub: "Action required", accent: C.red     },
    { label: "Never Verified",      value: neverVerifiedCount ?? 0,       sub: "No check on file", accent: neverVerifiedCount ? C.red : C.sage },
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: C.parchment, fontFamily: C.sans }}>

      {/* First-login agency setup modal */}
      {showSetupModal && (
        <FirstLoginSetupModal
          onComplete={() => {
            setSetupComplete(true);
            refreshAuth();
          }}
        />
      )}

      {/* Desktop Sidebar */}
      <div style={{ width: 240, minWidth: 240, flexShrink: 0, display: "none" }} className="lg-sidebar">
        <Sidebar agencyName={user?.name || undefined} />
      </div>
      <style>{`
        @media (min-width: 1024px) { .lg-sidebar { display: block !important; } }
        .cred-row:hover { background: rgba(196,134,42,0.04); }
      `}</style>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ width: 240, height: "100%" }}>
            <Sidebar agencyName={user?.name || undefined} onClose={() => setSidebarOpen(false)} />
          </div>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.4)" }} onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <PilotStatusBanner />
        <EmailVerificationBanner />

        {/* ── Top Bar ── */}
        <header style={{ background: C.cream, borderBottom: `1px solid ${C.rule}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(true)}
              style={{ display: "block", background: "none", border: "none", cursor: "pointer", color: C.inkLight, padding: 4 }}
              className="lg-hide"
            >
              <Menu size={18} />
            </button>
            <style>{`@media (min-width: 1024px) { .lg-hide { display: none !important; } }`}</style>
            <div>
              <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 2 }}>
                Compliance Overview
              </p>
              <h1 style={{ fontFamily: C.serif, fontSize: "1.6rem", fontWeight: 600, color: C.inkDark, letterSpacing: "-0.02em", lineHeight: 1, margin: 0 }}>
                {user?.name || "Dashboard"}
              </h1>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Notification badges */}
            {(stats?.expiringSoon ?? 0) > 0 && (
              <a href="/credentials" style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 4, background: "rgba(196,134,42,0.12)", border: `1px solid rgba(196,134,42,0.28)`, textDecoration: "none" }}>
                <AlertTriangle size={11} color={C.amber} />
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: C.amber }}>{stats?.expiringSoon} expiring</span>
              </a>
            )}
            {(stats?.expired ?? 0) > 0 && (
              <a href="/credentials" style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 4, background: "rgba(184,64,64,0.10)", border: `1px solid rgba(184,64,64,0.22)`, textDecoration: "none" }}>
                <XCircle size={11} color={C.red} />
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: C.red }}>{stats?.expired} expired</span>
              </a>
            )}
            {(pendingReview ?? []).length > 0 && (
              <a href="/pending-review" style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 4, background: "rgba(29,61,47,0.08)", border: `1px solid rgba(29,61,47,0.18)`, textDecoration: "none" }}>
                <Clock size={11} color={C.forest} />
                <span style={{ fontSize: "0.7rem", fontWeight: 600, color: C.forest }}>{(pendingReview ?? []).length} pending review</span>
              </a>
            )}
            <p style={{ fontSize: "0.72rem", color: C.inkFaint }}>{today}</p>
          </div>
        </header>

        {/* ── Scrollable Body ── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "24px 28px 40px", background: C.parchment }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>

            {/* ── Onboarding Checklist ── */}
            {showOnboarding && (
              <div style={{
                background: C.cream, border: `1px solid ${C.amber}`,
                borderLeft: `3px solid ${C.amber}`, borderRadius: 3,
                padding: "18px 20px", marginBottom: 20,
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20,
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.amber, marginBottom: 6, fontWeight: 700 }}>Getting Started</p>
                  <h3 style={{ fontFamily: C.serif, fontSize: "1.1rem", fontWeight: 700, color: C.inkDark, margin: "0 0 14px" }}>
                    Complete your setup
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { done: hasStaff, label: "Add your first staff member", href: "/staff", cta: "Add Staff" },
                      { done: hasCredentials, label: "Add credentials for a staff member", href: hasStaff ? `/staff/${(staffList ?? [])[0]?.id}` : "/staff", cta: "Add Credentials" },
                    ].map(({ done, label, href, cta }) => (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                          background: done ? C.sage : "transparent",
                          border: `2px solid ${done ? C.sage : C.rule}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {done && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#F0EBE3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                        </div>
                        <span style={{ fontFamily: C.sans, fontSize: "0.82rem", color: done ? C.inkFaint : C.inkDark, textDecoration: done ? "line-through" : "none" }}>
                          {label}
                        </span>
                        {!done && (
                          <a href={href} style={{
                            marginLeft: "auto", fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 600,
                            color: C.forest, textDecoration: "none",
                            padding: "3px 10px", border: `1px solid ${C.forest}`, borderRadius: 3,
                          }}>
                            {cta} →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => dismissOnboardingMutation.mutate()}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.inkFaint, padding: 4, flexShrink: 0 }}
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ── KPI Cards ── */}
            <div data-tour="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 24 }}>
              {STATS.map(s => (
                <div key={s.label} style={{
                  background: C.cream, border: `1px solid ${C.rule}`,
                  borderLeft: `3px solid ${s.accent}`,
                  borderRadius: 3, padding: "18px 20px",
                }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 8 }}>{s.label}</p>
                  <p style={{ fontFamily: C.serif, fontSize: "2.6rem", fontWeight: 700, color: C.inkDark, lineHeight: 1, letterSpacing: "-0.03em" }}>
                    {statsLoading ? "—" : s.value}
                  </p>
                  <p style={{ fontSize: "0.7rem", color: C.inkLight, marginTop: 4 }}>{s.sub}</p>
                </div>
              ))}
            </div>

            {/* ── Credentialing Summary Card ── */}
            {(credStats?.totalProviders ?? 0) > 0 && (
              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderLeft: `3px solid ${C.forest}`, borderRadius: 3, padding: "18px 20px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 4 }}>Payer Credentialing</p>
                    <p style={{ fontFamily: C.serif, fontSize: "1.1rem", fontWeight: 600, color: C.inkDark }}>{credStats?.totalProviders} Provider{(credStats?.totalProviders ?? 0) !== 1 ? "s" : ""} tracked</p>
                  </div>
                  <Link href="/credentialing" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.7rem", color: C.sage, fontWeight: 600, textDecoration: "none" }}>
                    View all <ChevronRight size={12} />
                  </Link>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.78rem", color: C.sage, fontWeight: 600 }}>
                    <span style={{ fontFamily: C.mono, fontSize: "1.1rem", color: C.sage }}>{credStats?.approved ?? 0}</span> Approved
                  </span>
                  <span style={{ fontSize: "0.78rem", color: C.amber, fontWeight: 600 }}>
                    <span style={{ fontFamily: C.mono, fontSize: "1.1rem", color: C.amber }}>{credStats?.inReview ?? 0}</span> In Review
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#D97706", fontWeight: 600 }}>
                    <span style={{ fontFamily: C.mono, fontSize: "1.1rem", color: "#D97706" }}>{credStats?.needsUpdate ?? 0}</span> Needs Update
                  </span>
                  <span style={{ fontSize: "0.78rem", color: C.red, fontWeight: 600 }}>
                    <span style={{ fontFamily: C.mono, fontSize: "1.1rem", color: C.red }}>{credStats?.expired ?? 0}</span> Expired
                  </span>
                </div>
              </div>
            )}
            {/* ── Two-column layout ── */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>

              {/* Expiring soon */}
              <div data-tour="expiring-section" style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 3 }}>
                <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 4 }}>Expiring Soon</p>
                    <h3 style={{ fontFamily: C.serif, fontSize: "1.15rem", fontWeight: 600, color: C.inkDark }}>Next 90 days</h3>
                  </div>
                  <Link href="/credentials" style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.7rem", color: C.sage, fontWeight: 600, textDecoration: "none" }}>
                    View all <ChevronRight size={12} />
                  </Link>
                </div>
                <div style={{ borderTop: `1px solid ${C.rule}` }}>
                  {expiringLoading ? (
                    <div style={{ padding: 40, textAlign: "center" }}>
                      <Loader2 size={20} color={C.forest} className="animate-spin" style={{ margin: "0 auto" }} />
                    </div>
                  ) : (expiring ?? []).length === 0 ? (
                    <div style={{ padding: "32px 20px", textAlign: "center" }}>
                      <CheckCircle size={24} color={C.sage} style={{ margin: "0 auto 8px" }} />
                      <p style={{ fontSize: "0.85rem", color: C.inkMid }}>No credentials expiring in the next 90 days</p>
                      <p style={{ fontSize: "0.75rem", color: C.inkLight, marginTop: 4 }}>All clear — your team is compliant.</p>
                    </div>
                  ) : (
                    (expiring ?? []).slice(0, 8).map((item, i) => {
                      const days = daysUntil(item.expirationDate);
                      return (
                        <div
                          key={item.id}
                          className="cred-row"
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: i < (expiring ?? []).length - 1 ? `1px solid ${C.rule}` : "none", transition: "background 100ms", cursor: "pointer" }}
                          onClick={() => navigate(`/staff/${item.staffId}`)}
                        >
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: levelColor(days), flexShrink: 0, display: "inline-block" }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "0.83rem", fontWeight: 500, color: C.inkDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {item.staffFirstName} {item.staffLastName}
                            </p>
                            <p style={{ fontSize: "0.7rem", color: C.inkLight }}>{item.type}</p>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <p style={{ fontFamily: C.mono, fontSize: "0.82rem", fontWeight: 700, color: levelColor(days) }}>{days}d</p>
                            <p style={{ fontSize: "0.65rem", color: C.inkFaint }}>{formatDate(item.expirationDate)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 3 }}>
                <div style={{ padding: "20px 20px 14px" }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 4 }}>Quick Actions</p>
                  <h3 style={{ fontFamily: C.serif, fontSize: "1.15rem", fontWeight: 600, color: C.inkDark }}>Common tasks</h3>
                </div>
                <div style={{ borderTop: `1px solid ${C.rule}`, padding: "16px 20px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { icon: Users,     label: "Add Staff Member",    sub: "Onboard a new hire",   href: "/staff"       },
                      { icon: FileCheck, label: "View Credentials",    sub: "Manage all documents", href: "/credentials" },
                      { icon: Shield,    label: "Staff Directory",     sub: "View all staff",       href: "/staff"       },
                    ].map(({ icon: Icon, label, sub, href }) => (
                      <Link key={label} href={href} style={{
                          display: "flex", alignItems: "flex-start", gap: 10,
                          padding: "12px 14px", borderRadius: 3,
                          border: `1px solid ${C.rule}`, background: C.parchment,
                          transition: "background 120ms, border-color 120ms",
                          textDecoration: "none",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = C.linen; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = C.parchment; }}
                      >
                          <div style={{ width: 28, height: 28, borderRadius: 3, background: C.linen, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon size={13} style={{ color: C.forest }} strokeWidth={1.5} />
                          </div>
                          <div>
                            <p style={{ fontSize: "0.78rem", fontWeight: 600, color: C.inkDark, lineHeight: 1.3 }}>{label}</p>
                            <p style={{ fontSize: "0.65rem", color: C.inkLight }}>{sub}</p>
                          </div>
                        </Link>
                    ))}
                    {/* Import Credentials — split card with template download */}
                    <div style={{
                      display: "flex", alignItems: "stretch", gap: 0,
                      border: `1px solid ${C.rule}`, borderRadius: 3, overflow: "hidden",
                    }}>
                      <Link href="/credentials/import" style={{
                        flex: 1, display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "12px 14px", background: C.parchment,
                        transition: "background 120ms", textDecoration: "none",
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = C.linen; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = C.parchment; }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: 3, background: C.linen, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Upload size={13} style={{ color: C.forest }} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p style={{ fontSize: "0.78rem", fontWeight: 600, color: C.inkDark, lineHeight: 1.3 }}>Import Credentials</p>
                          <p style={{ fontSize: "0.65rem", color: C.inkLight }}>Bulk CSV upload</p>
                        </div>
                      </Link>
                      <button
                        title="Download CSV template"
                        onClick={() => {
                          const csv = `Staff Name,Credential Type,Category,Issuing Body,License / Cert Number,Issue Date,Expiration Date,Status,Document Link,Notes\nJane Smith,BCBA License,license,BACB,1-23-45678,2020-01-15,2026-01-14,current,https://drive.google.com/...,Renewed Jan 2024\nJohn Doe,CPR Certification,certification,American Red Cross,,2025-03-01,2027-03-01,current,,\n`;
                          const blob = new Blob([csv], { type: "text/csv" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a"); a.href = url; a.download = "credential-import-template.csv"; a.click();
                          URL.revokeObjectURL(url);
                        }}
                        style={{
                          width: 44, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                          background: C.linen, border: "none",
                          borderLeft: `1px solid ${C.rule}`, cursor: "pointer",
                          transition: "background 120ms",
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.rule; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.linen; }}
                      >
                        <Download size={13} style={{ color: C.forest }} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Admin section — only visible to owner/admin */}
                {user?.role === "admin" && (
                  <AdminQuickLinks />
                )}
                {/* Staff summary */}
                <div style={{ borderTop: `1px solid ${C.rule}`, padding: "16px 20px" }}>
                  <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 10 }}>Staff Overview</p>
                  {(staffList ?? []).length === 0 ? (
                    <p style={{ fontSize: "0.8rem", color: C.inkLight }}>No staff added yet. <Link href="/staff" style={{ color: C.sage, textDecoration: "underline" }}>Add your first staff member</Link></p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {(staffList ?? []).slice(0, 5).map((s) => (
                        <div
                          key={s.id}
                          onClick={() => navigate(`/staff/${s.id}`)}
                          style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 3, cursor: "pointer", transition: "background 100ms" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.linen)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.forest, color: "#F0EBE3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 700, flexShrink: 0 }}>
                            {s.firstName[0]}{s.lastName[0]}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: "0.78rem", fontWeight: 500, color: C.inkDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {s.firstName} {s.lastName}
                            </p>
                          </div>
                          <span style={{ fontSize: "0.68rem", color: C.inkFaint }}>{s.role || "—"}</span>
                        </div>
                      ))}
                      {(staffList ?? []).length > 5 && (
                        <Link href="/staff" style={{ fontSize: "0.72rem", color: C.sage, fontWeight: 600, textDecoration: "none", paddingLeft: 8 }}>
                          View all {(staffList ?? []).length} staff →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Last Import widget */}
              {importLogsList && importLogsList.length > 0 && (() => {
                const last = importLogsList[0];
                const isOk = last.failed === 0;
                const isPartial = last.failed > 0 && last.inserted > 0;
                const statusColor = isOk ? C.sage : isPartial ? C.amber : C.red;
                const statusLabel = isOk ? "Success" : isPartial ? "Partial" : "Failed";
                const dateStr = new Date(last.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                return (
                  <div style={{ borderTop: `1px solid ${C.rule}`, padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <p style={{ fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: C.inkFaint }}>Last Import</p>
                      <Link href="/imports" style={{ fontSize: "0.68rem", color: C.sage, fontWeight: 600, textDecoration: "none" }}>History →</Link>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 3, background: C.linen, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <FileText size={13} style={{ color: C.forest }} strokeWidth={1.5} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "0.78rem", fontWeight: 600, color: C.inkDark, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 2 }}>
                          {last.fileName}
                        </p>
                        <p style={{ fontSize: "0.68rem", color: C.inkLight }}>
                          {dateStr} · <span style={{ fontFamily: C.mono, color: statusColor, fontWeight: 600 }}>{last.inserted} inserted</span>
                          {last.failed > 0 && <span style={{ color: C.red }}>, {last.failed} failed</span>}
                        </p>
                      </div>
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                        background: isOk ? "#F0FDF4" : isPartial ? "rgba(196,134,42,0.1)" : "rgba(184,64,64,0.1)",
                        color: statusColor,
                        border: `1px solid ${isOk ? "#BBF7D0" : isPartial ? "rgba(196,134,42,0.3)" : "rgba(184,64,64,0.3)"}`,
                        flexShrink: 0,
                      }}>{statusLabel}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

          {/* Policy footer */}
          <div style={{ marginTop: 32, padding: "12px 24px", borderTop: `1px solid ${C.rule}`, display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, margin: 0, lineHeight: 1.6, maxWidth: 560 }}>
              All changes to staff and credential records are logged with your name and timestamp for compliance purposes.
              By using AuditReady you agree to our{" "}
              <a href="/terms" style={{ color: C.sage }}>Terms of Service</a> and{" "}
              <a href="/privacy" style={{ color: C.sage }}>Privacy Policy</a>.
              AuditReady does not provide legal or compliance advice.
            </p>
            <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
              <a href="/privacy" style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, textDecoration: "none" }}>Privacy</a>
              <a href="/terms" style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, textDecoration: "none" }}>Terms</a>
              <a href="/refunds" style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.inkFaint, textDecoration: "none" }}>Refunds</a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
