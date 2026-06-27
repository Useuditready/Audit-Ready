/**
 * PilotNudgeBanner
 * ─────────────────
 * Shown inside the dashboard when the user is on an active_pilot and has
 * ≤ 4 days remaining (i.e. day 10+ of a 14-day pilot).
 *
 * Design: forest-green banner, dismissible per session, with a clear
 * "Subscribe Now" CTA that links to the pricing/checkout page.
 */
import { trpc } from "@/lib/trpc";
import { X, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "pilot_nudge_dismissed";

export function PilotNudgeBanner() {
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  });

  const { data: status } = trpc.account.status.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Calculate days remaining
  const daysRemaining = (() => {
    if (!status?.pilotExpiresAt) return null;
    const now = Date.now();
    const expires = new Date(status.pilotExpiresAt).getTime();
    const diff = expires - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  })();

  // Only show for active_pilot users with ≤ 4 days remaining
  const shouldShow =
    !dismissed &&
    status?.accountStatus === "active_pilot" &&
    daysRemaining !== null &&
    daysRemaining <= 4;

  const handleDismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
  };

  if (!shouldShow) return null;

  const urgency = daysRemaining === 0 ? "expires today" :
    daysRemaining === 1 ? "1 day left" :
    `${daysRemaining} days left`;

  const isUrgent = daysRemaining !== null && daysRemaining <= 1;

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: isUrgent ? "#7A1C1C" : "#1D3D2F",
        borderBottom: `1px solid ${isUrgent ? "rgba(255,100,100,0.2)" : "rgba(123,175,110,0.25)"}`,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: "0.85rem",
        color: "#F4F0E8",
        position: "relative",
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {/* Icon */}
      <Clock
        size={15}
        style={{ flexShrink: 0, color: isUrgent ? "#FCA5A5" : "#7BAF6E", marginTop: 1 }}
      />

      {/* Message */}
      <span style={{ flex: 1, lineHeight: 1.45 }}>
        <strong style={{ fontWeight: 700, color: isUrgent ? "#FCA5A5" : "#A8D99C" }}>
          Free pilot {urgency}.
        </strong>{" "}
        Subscribe now to keep your credential dashboard, reminders, and verification access — no data lost.
      </span>

      {/* CTA */}
      <button
        onClick={() => navigate("/pricing")}
        style={{
          flexShrink: 0,
          background: isUrgent ? "#C0392B" : "#3A4A2E",
          color: "#F4F0E8",
          border: `1px solid ${isUrgent ? "#E05252" : "#7BAF6E"}`,
          borderRadius: 4,
          padding: "6px 16px",
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          fontSize: "0.8rem",
          fontWeight: 700,
          cursor: "pointer",
          whiteSpace: "nowrap",
          transition: "background 140ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = isUrgent ? "#A93226" : "#4A5E3A")}
        onMouseLeave={e => (e.currentTarget.style.background = isUrgent ? "#C0392B" : "#3A4A2E")}
      >
        Subscribe Now
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(244,240,232,0.45)",
          padding: 4,
          display: "flex",
          alignItems: "center",
          transition: "color 120ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "#F4F0E8")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(244,240,232,0.45)")}
      >
        <X size={14} />
      </button>
    </div>
  );
}
