/**
 * PilotStatusBanner — shows pilot countdown, read-only warning, or locked upgrade prompt.
 * Displayed at the top of all authenticated dashboard pages.
 */

import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, Clock, Lock, ArrowRight, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const C = {
  forest:    "#1D3D2F",
  amber:     "#C4862A",
  amberLight:"#E8A94A",
  amberPale: "#FEF3CD",
  red:       "#B84040",
  redPale:   "#FBEAEA",
  sage:      "#3D6B52",
  sagePale:  "#EBF3EE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  rule:      "#E2D9CE",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
  serif:     "'DM Serif Display', Georgia, serif",
};

function daysUntil(date: Date | null | undefined): number {
  if (!date) return 999;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function PilotStatusBanner() {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [, navigate] = useLocation();

  const { data: accountStatus } = trpc.account.status.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  if (!accountStatus || dismissed) return null;

  const { accountStatus: status, pilotExpiresAt, gracePeriodEndsAt, cancelledAt } = accountStatus;

  // Subscribed users — no banner needed
  if (status === "subscribed") return null;

  // Pending users — no banner (they haven't been activated yet)
  if (status === "pending") return null;

  // Active pilot — show countdown
  if (status === "active_pilot") {
    const daysLeft = daysUntil(pilotExpiresAt);
    if (daysLeft > 10) return null; // Only show banner when 10 days or fewer remain

    const isUrgent = daysLeft <= 3;
    const bgColor = isUrgent ? C.redPale : C.amberPale;
    const borderColor = isUrgent ? C.red : C.amber;
    const textColor = isUrgent ? C.red : C.amber;
    const Icon = isUrgent ? AlertTriangle : Clock;

    return (
      <div style={{
        background: bgColor,
        borderBottom: `1px solid ${borderColor}`,
        padding: "10px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontFamily: C.sans,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon size={14} color={textColor} strokeWidth={2} />
          <span style={{ fontSize: "0.82rem", color: C.inkDark, fontWeight: 500 }}>
            <strong style={{ color: textColor }}>
              {daysLeft <= 0 ? "Your pilot ends today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free pilot`}
            </strong>
            {" — "}
            <span style={{ color: C.inkMid }}>
              Activate your plan to keep uninterrupted access to all your staff and credential data.
            </span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => navigate("/pricing")}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 14px",
              background: textColor,
              color: "#fff",
              border: "none",
              borderRadius: 3,
              fontSize: "0.75rem",
              fontWeight: 600,
              fontFamily: C.sans,
              cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            Activate your plan <ArrowRight size={11} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.inkLight, padding: 4 }}
            aria-label="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  // Read-only — could be pilot grace period OR cancelled subscription
  if (status === "read_only") {
    // If cancelledAt is set, this is a cancelled subscription (not a pilot expiry)
    if (cancelledAt) {
      return (
        <div style={{
          background: "#FFF3CD",
          borderBottom: `2px solid ${C.amber}`,
          padding: "12px 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontFamily: C.sans,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={15} color={C.amber} strokeWidth={2} />
            <div>
              <span style={{ fontSize: "0.85rem", color: C.inkDark, fontWeight: 600 }}>
                Your subscription has ended — your account is in read-only mode.
              </span>
              <span style={{ fontSize: "0.82rem", color: C.inkMid, marginLeft: 6 }}>
                All your data is preserved for 90 days. Resubscribe anytime to restore full access.
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate("/pricing")}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "7px 16px",
              background: C.amber,
              color: "#fff",
              border: "none",
              borderRadius: 3,
              fontSize: "0.78rem",
              fontWeight: 700,
              fontFamily: C.sans,
              cursor: "pointer",
              flexShrink: 0,
              letterSpacing: "0.02em",
            }}
          >
            Resubscribe <ArrowRight size={11} />
          </button>
        </div>
      );
    }

    // Pilot grace period
    const graceLeft = daysUntil(gracePeriodEndsAt);

    return (
      <div style={{
        background: "#FFF3CD",
        borderBottom: `2px solid ${C.amber}`,
        padding: "12px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontFamily: C.sans,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={15} color={C.amber} strokeWidth={2} />
          <div>
            <span style={{ fontSize: "0.85rem", color: C.inkDark, fontWeight: 600 }}>
              Your pilot has ended — your account is in read-only mode.
            </span>
            <span style={{ fontSize: "0.82rem", color: C.inkMid, marginLeft: 6 }}>
              {graceLeft > 0
                ? `You have ${graceLeft} day${graceLeft === 1 ? "" : "s"} before your data is locked. Activate your plan to restore full access.`
                : "Activate your plan today to restore full access before your data is locked."}
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "7px 16px",
            background: C.amber,
            color: "#fff",
            border: "none",
            borderRadius: 3,
            fontSize: "0.78rem",
            fontWeight: 700,
            fontFamily: C.sans,
            cursor: "pointer",
            flexShrink: 0,
            letterSpacing: "0.02em",
          }}
        >
          Activate your plan <ArrowRight size={11} />
        </button>
      </div>
    );
  }

  // Locked — full lockout banner
  if (status === "locked") {
    return (
      <div style={{
        background: C.redPale,
        borderBottom: `2px solid ${C.red}`,
        padding: "12px 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        fontFamily: C.sans,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Lock size={15} color={C.red} strokeWidth={2} />
          <div>
            <span style={{ fontSize: "0.85rem", color: C.red, fontWeight: 700 }}>
              Account locked.
            </span>
            {" "}
            <span style={{ fontSize: "0.82rem", color: C.inkDark }}>
              Your pilot period has ended. Your staff and credential data is preserved and waiting for you.
              Activate a plan to restore full access.
            </span>
          </div>
        </div>
        <button
          onClick={() => navigate("/pricing")}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "8px 18px",
            background: C.red,
            color: "#fff",
            border: "none",
            borderRadius: 3,
            fontSize: "0.78rem",
            fontWeight: 700,
            fontFamily: C.sans,
            cursor: "pointer",
            flexShrink: 0,
            letterSpacing: "0.02em",
            whiteSpace: "nowrap",
          }}
        >
          Restore access <ArrowRight size={11} />
        </button>
      </div>
    );
  }

  return null;
}
