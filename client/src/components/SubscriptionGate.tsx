/**
 * SubscriptionGate — wraps any protected page.
 *
 * Behaviour:
 *  - While auth / account status is loading → show a spinner
 *  - If unauthenticated → redirect to login (handled by useAuth)
 *  - If accountStatus is "pending" → redirect to /pricing
 *  - If accountStatus is "read_only" → show GracePeriodScreen (view-only notice)
 *  - If accountStatus is "locked" → show LockedScreen (pilot ended, subscribe CTA)
 *  - If accountStatus is "active_pilot" or "subscribed" → render children normally
 *
 * Screens are intentionally calm and professional — no scary lock icons,
 * no aggressive banners. Clear message, clear action.
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Loader2, Eye, Lock, ArrowRight, ShieldCheck } from "lucide-react";
import { getLoginUrl, getSignUpUrl } from "@/const";
import AgencyProfileModal from "@/components/AgencyProfileModal";
import { toast } from "sonner";

// ── Design tokens (matches the rest of the app) ───────────────
const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  parchment: "#F7F3ED",
  cream:     "#FDFAF6",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  amber:     "#C4862A",
  amberPale: "#FEF3CD",
  red:       "#B84040",
  serif:     "'DM Serif Display', Georgia, serif",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
};

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

/**
 * Statuses that allow full access to the app.
 * "read_only" (grace period) is included — users can still view but not edit.
 */
const ACTIVE_STATUSES = new Set(["active_pilot", "read_only", "subscribed"]);

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export function SubscriptionGate({ children }: SubscriptionGateProps) {
  // Do NOT redirect — render a sign-in screen instead so visitors never see a blank page
  const { user, loading: authLoading } = useAuth({ redirectOnUnauthenticated: false });
  const [, navigate] = useLocation();

  const { data: accountStatus, isLoading: statusLoading } = trpc.account.status.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Redirect "pending" users to pricing — they haven't started a pilot yet
  useEffect(() => {
    if (!accountStatus) return;
    if (accountStatus.accountStatus === "pending") {
      navigate("/pricing");
    }
  }, [accountStatus, navigate]);

  // Show spinner while auth is loading
  if (authLoading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.parchment,
      }}>
        <Loader2 size={28} color={C.forest} className="animate-spin" />
      </div>
    );
  }

  // Not authenticated — show a clean sign-in required screen (never blank)
  if (!user) {
    return <SignInRequiredScreen />;
  }

  // Auth resolved but account status still loading
  if (statusLoading || !accountStatus) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: C.parchment,
      }}>
        <Loader2 size={28} color={C.forest} className="animate-spin" />
      </div>
    );
  }

  const status = accountStatus.accountStatus;
  const cancelledAt = (accountStatus as any).cancelledAt ?? null;

  // Read-only — could be pilot grace period OR cancelled subscription
  if (status === "read_only") {
    return <GracePeriodScreen gracePeriodEndsAt={accountStatus.gracePeriodEndsAt} cancelledAt={cancelledAt} navigate={navigate}>{children}</GracePeriodScreen>;
  }

  // Locked (pilot ended, grace period over) — full locked screen
  // Allow /billing and /pricing through so users can subscribe without being blocked
  if (status === "locked") {
    const path = typeof location === "string" ? location : (location as any).pathname ?? "";
    if (path === "/billing" || path === "/pricing" || path.startsWith("/billing/")) {
      return <>{children}</>;
    }
    return <LockedScreen />;
  }

  // Any other inactive status (e.g. unknown) → generic inactive screen
  if (!ACTIVE_STATUSES.has(status)) {
    return <InactiveSubscriptionScreen />;
  }

  // All good — render the protected page
  return <>{children}</>;
}

// ── Sign-In Required Screen ─────────────────────────────────
// Shown to logged-out visitors on any protected route.
// Never blank — always renders immediately.
function SignInRequiredScreen() {
  const returnPath = typeof window !== "undefined" ? window.location.pathname : "/dashboard";

  const handleSignIn = () => {
    // Build login URL with return path encoded in state so OAuth callback
    // can redirect back to the page the user was trying to reach.
    const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
    const appId = import.meta.env.VITE_APP_ID;
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(JSON.stringify({ redirectUri, returnPath }));
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    window.location.href = url.toString();
  };

  const handleSignUp = () => {
    window.location.href = getSignUpUrl();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: C.parchment,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      fontFamily: C.sans,
    }}>
      {/* Logo */}
      <img
        src={LOGO_URL}
        alt="AuditReady"
        style={{ height: 32, marginBottom: 40, opacity: 0.85 }}
      />
      {/* Card */}
      <div style={{
        maxWidth: 440,
        width: "100%",
        background: C.cream,
        border: `1px solid ${C.rule}`,
        borderRadius: 4,
        padding: "36px 32px",
        textAlign: "center",
      }}>
        {/* Icon */}
        <div style={{
          width: 44,
          height: 44,
          background: C.linen,
          border: `1px solid ${C.rule}`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <ShieldCheck size={20} color={C.forest} />
        </div>
        <h1 style={{
          fontFamily: C.serif,
          fontSize: "1.45rem",
          fontWeight: 600,
          color: C.inkDark,
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
          marginBottom: 10,
        }}>
          Sign in to access ABA Compliance tools
        </h1>
        <p style={{
          fontFamily: C.sans,
          fontSize: "0.88rem",
          color: C.inkMid,
          lineHeight: 1.65,
          marginBottom: 28,
        }}>
          BACB certifications, RBT supervision ratios, OIG exclusion checks, and onboarding checklists are available to AuditReady subscribers.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={handleSignIn}
            style={{
              width: "100%",
              padding: "11px 20px",
              background: C.forest,
              color: "#F0EBE3",
              border: "none",
              borderRadius: 3,
              fontFamily: C.sans,
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "background 160ms",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.forestMid)}
            onMouseLeave={e => (e.currentTarget.style.background = C.forest)}
          >
            Sign In
            <ArrowRight size={14} />
          </button>
          <button
            onClick={handleSignUp}
            style={{
              width: "100%",
              padding: "10px 20px",
              background: "transparent",
              color: C.inkMid,
              border: `1px solid ${C.rule}`,
              borderRadius: 3,
              fontFamily: C.sans,
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "border-color 160ms, color 160ms",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = C.inkLight;
              e.currentTarget.style.color = C.inkDark;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.rule;
              e.currentTarget.style.color = C.inkMid;
            }}
          >
            Start Free 14-Day Trial
          </button>
        </div>
      </div>
      <p style={{
        fontFamily: C.mono,
        fontSize: "0.62rem",
        color: C.inkFaint,
        letterSpacing: "0.04em",
        marginTop: 28,
      }}>
        Questions? Contact{" "}
        <a
          href="mailto:support@useauditready.com"
          style={{ color: C.inkLight, textDecoration: "underline" }}
        >
          support@useauditready.com
        </a>
      </p>
    </div>
  );
}

// ── Grace Period Screen (read_only) ───────────────────────────
// Pilot has ended but user is in the 3-day grace window.
// They can still VIEW but not edit. Show a top banner + render children.
function GracePeriodScreen({
  gracePeriodEndsAt,
  cancelledAt,
  navigate,
  children,
}: {
  gracePeriodEndsAt: Date | null;
  cancelledAt: Date | null;
  navigate: (path: string) => void;
  children: React.ReactNode;
}) {
  // Cancelled subscription — show distinct copy
  if (cancelledAt) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <div
          role="alert"
          style={{
            background: "#7A4A1A",
            borderBottom: "1px solid rgba(196,134,42,0.3)",
            padding: "10px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: C.sans,
            fontSize: "0.85rem",
            color: "#F4F0E8",
            flexShrink: 0,
            zIndex: 20,
          }}
        >
          <Eye size={15} style={{ flexShrink: 0, color: "#F6C96A" }} />
          <span style={{ flex: 1, lineHeight: 1.45 }}>
            <strong style={{ color: "#F6C96A" }}>Your subscription has ended.</strong>{" "}
            Your data is preserved for 90 days. You can view everything, but editing is paused until you resubscribe.
          </span>
          <button
            onClick={() => navigate("/pricing")}
            style={{
              flexShrink: 0,
              background: C.amber,
              color: "#1C1917",
              border: "none",
              borderRadius: 4,
              padding: "6px 16px",
              fontFamily: C.sans,
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background 140ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#D4922E")}
            onMouseLeave={e => (e.currentTarget.style.background = C.amber)}
          >
            Resubscribe
          </button>
        </div>
        <div style={{ flex: 1, pointerEvents: "none", opacity: 0.7, overflow: "hidden" }}>
          {children}
        </div>
      </div>
    );
  }

  // Pilot grace period
  const daysLeft = gracePeriodEndsAt
    ? Math.max(0, Math.ceil((new Date(gracePeriodEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const urgencyText = daysLeft === 0
    ? "Grace period ends today."
    : daysLeft === 1
    ? "1 day left in your grace period."
    : `${daysLeft} days left in your grace period.`;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Grace period banner */}
      <div
        role="alert"
        style={{
          background: "#7A4A1A",
          borderBottom: "1px solid rgba(196,134,42,0.3)",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: C.sans,
          fontSize: "0.85rem",
          color: "#F4F0E8",
          flexShrink: 0,
          zIndex: 20,
        }}
      >
        <Eye size={15} style={{ flexShrink: 0, color: "#F6C96A" }} />
        <span style={{ flex: 1, lineHeight: 1.45 }}>
          <strong style={{ color: "#F6C96A" }}>Your pilot has ended. {urgencyText}</strong>{" "}
          You can still view your data, but editing is paused until you subscribe.
        </span>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            flexShrink: 0,
            background: C.amber,
            color: "#1C1917",
            border: "none",
            borderRadius: 4,
            padding: "6px 16px",
            fontFamily: C.sans,
            fontSize: "0.8rem",
            fontWeight: 700,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "background 140ms",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "#D4922E")}
          onMouseLeave={e => (e.currentTarget.style.background = C.amber)}
        >
          Subscribe Now
        </button>
      </div>

      {/* Render the page content (read-only) */}
      <div style={{ flex: 1, pointerEvents: "none", opacity: 0.7, overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
}

// ── Locked Screen ─────────────────────────────────────────────
// Pilot ended AND grace period over. Full-page lock with subscribe CTA.
function LockedScreen() {
  const [, navigate] = useLocation();
  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const createCheckoutMutation = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (err) => {
      toast.error(err.message || "Failed to start checkout. Please try again.");
      setCheckoutLoading(false);
    },
  });

  const handleAgencyProfileComplete = (repCode?: string) => {
    setAgencyModalOpen(false);
    setCheckoutLoading(true);
    createCheckoutMutation.mutate({
      plan: "starter",
      interval: "monthly",
      origin: window.location.origin,
      repCode,
    });
  };

  return (
    <>
    {agencyModalOpen && (
      <AgencyProfileModal
        planName="Starter"
        billingInterval="monthly"
        onClose={() => setAgencyModalOpen(false)}
        onComplete={handleAgencyProfileComplete}
      />
    )}
    <div style={{
      minHeight: "100vh",
      background: C.parchment,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      fontFamily: C.sans,
    }}>
      {/* Logo */}
      <img
        src={LOGO_URL}
        alt="AuditReady"
        style={{ height: 32, marginBottom: 40, opacity: 0.85 }}
      />

      {/* Card */}
      <div style={{
        maxWidth: 460,
        width: "100%",
        background: C.cream,
        border: `1px solid ${C.rule}`,
        borderRadius: 4,
        padding: "40px 36px",
        textAlign: "center",
      }}>
        {/* Lock icon */}
        <div style={{
          width: 44,
          height: 44,
          background: C.amberPale,
          border: `1px solid rgba(196,134,42,0.25)`,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <Lock size={20} color={C.amber} />
        </div>

        <h1 style={{
          fontFamily: C.serif,
          fontSize: "1.5rem",
          fontWeight: 600,
          color: C.inkDark,
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
          marginBottom: 12,
        }}>
          Your free pilot has ended.
        </h1>

        <p style={{
          fontFamily: C.sans,
          fontSize: "0.9rem",
          color: C.inkMid,
          lineHeight: 1.65,
          marginBottom: 8,
        }}>
          All your staff and credential data is safely preserved — nothing has been deleted.
          Subscribe to restore full access in seconds.
        </p>

        {/* Data preservation note */}
        <div style={{
          background: C.linen,
          border: `1px solid ${C.rule}`,
          borderRadius: 3,
          padding: "10px 14px",
          marginBottom: 28,
          textAlign: "left",
        }}>
          <p style={{
            fontFamily: C.mono,
            fontSize: "0.7rem",
            color: C.inkLight,
            letterSpacing: "0.03em",
            margin: 0,
            lineHeight: 1.6,
          }}>
            ✓ Staff records preserved &nbsp;·&nbsp; ✓ Credentials preserved &nbsp;·&nbsp; ✓ Audit history preserved
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => setAgencyModalOpen(true)}
            disabled={checkoutLoading}
            style={{
              width: "100%",
              padding: "12px 20px",
              background: checkoutLoading ? C.forestMid : C.forest,
              color: "#F0EBE3",
              border: "none",
              borderRadius: 3,
              fontFamily: C.sans,
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: checkoutLoading ? "not-allowed" : "pointer",
              letterSpacing: "0.01em",
              transition: "background 160ms",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
            onMouseEnter={e => { if (!checkoutLoading) e.currentTarget.style.background = C.forestMid; }}
            onMouseLeave={e => { if (!checkoutLoading) e.currentTarget.style.background = C.forest; }}
          >
            {checkoutLoading ? (
              <><Loader2 size={14} className="animate-spin" /> Redirecting to checkout…</>
            ) : (
              <>Subscribe Now &nbsp;<ArrowRight size={13} /></>
            )}
          </button>

          <button
            onClick={() => navigate("/pricing")}
            style={{
              width: "100%",
              padding: "10px 20px",
              background: "transparent",
              color: C.inkMid,
              border: `1px solid ${C.rule}`,
              borderRadius: 3,
              fontFamily: C.sans,
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "border-color 160ms, color 160ms",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = C.inkLight;
              e.currentTarget.style.color = C.inkDark;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.rule;
              e.currentTarget.style.color = C.inkMid;
            }}
          >
            View Plans
          </button>
        </div>
      </div>

      {/* Support note */}
      <p style={{
        fontFamily: C.mono,
        fontSize: "0.62rem",
        color: C.inkFaint,
        letterSpacing: "0.04em",
        marginTop: 28,
        textAlign: "center",
      }}>
        Questions? Contact{" "}
        <a
          href="mailto:support@useauditready.com"
          style={{ color: C.inkLight, textDecoration: "underline" }}
        >
          support@useauditready.com
        </a>
      </p>
    </div>
    </>  
  );
}

// ── Generic Inactive Screen ───────────────────────────────────
// Fallback for any other non-active status.
function InactiveSubscriptionScreen() {
  const [, navigate] = useLocation();

  return (
    <div style={{
      minHeight: "100vh",
      background: C.parchment,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      fontFamily: C.sans,
    }}>
      {/* Logo */}
      <img
        src={LOGO_URL}
        alt="AuditReady"
        style={{ height: 32, marginBottom: 40, opacity: 0.85 }}
      />

      {/* Card */}
      <div style={{
        maxWidth: 440,
        width: "100%",
        background: C.cream,
        border: `1px solid ${C.rule}`,
        borderRadius: 4,
        padding: "36px 32px",
        textAlign: "center",
      }}>
        <div style={{
          width: 32,
          height: 2,
          background: C.amber,
          borderRadius: 1,
          margin: "0 auto 20px",
        }} />

        <h1 style={{
          fontFamily: C.serif,
          fontSize: "1.45rem",
          fontWeight: 600,
          color: C.inkDark,
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
          marginBottom: 12,
        }}>
          Your subscription is inactive.
        </h1>

        <p style={{
          fontFamily: C.sans,
          fontSize: "0.9rem",
          color: C.inkMid,
          lineHeight: 1.65,
          marginBottom: 28,
        }}>
          Reactivate your plan to continue. Your staff and credential data is preserved and waiting for you.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => navigate("/pricing")}
            style={{
              width: "100%",
              padding: "11px 20px",
              background: C.forest,
              color: "#F0EBE3",
              border: "none",
              borderRadius: 3,
              fontFamily: C.sans,
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "background 160ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = C.forestMid)}
            onMouseLeave={e => (e.currentTarget.style.background = C.forest)}
          >
            View Plans &amp; Reactivate
          </button>

          <button
            onClick={() => navigate("/billing")}
            style={{
              width: "100%",
              padding: "10px 20px",
              background: "transparent",
              color: C.inkMid,
              border: `1px solid ${C.rule}`,
              borderRadius: 3,
              fontFamily: C.sans,
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: "0.01em",
              transition: "border-color 160ms, color 160ms",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = C.inkLight;
              e.currentTarget.style.color = C.inkDark;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = C.rule;
              e.currentTarget.style.color = C.inkMid;
            }}
          >
            Manage Billing
          </button>
        </div>
      </div>

      <p style={{
        fontFamily: C.mono,
        fontSize: "0.62rem",
        color: C.inkFaint,
        letterSpacing: "0.04em",
        marginTop: 28,
      }}>
        Questions? Contact{" "}
        <a
          href="mailto:support@useauditready.com"
          style={{ color: C.inkLight, textDecoration: "underline" }}
        >
          support@useauditready.com
        </a>
      </p>
    </div>
  );
}
