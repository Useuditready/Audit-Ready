/**
 * EmailVerificationBanner
 * Shown on all authenticated pages when the admin has not yet verified their email.
 * Provides a "Resend email" button and dismisses automatically once verified.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const utils = trpc.useUtils();

  const resendMutation = trpc.auth.resendVerificationEmail.useMutation({
    onSuccess: () => {
      setSent(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  // Don't show if user is not loaded, or if email is already verified
  if (!user) return null;
  if ((user as any).emailVerifiedAt) return null;
  // If user has no email, nothing to verify
  if (!user.email) return null;

  return (
    <div
      role="alert"
      style={{
        background: "#FEF3CD",
        borderBottom: "1px solid #E8C84A",
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: "0.85rem",
        color: "#5A4A00",
        zIndex: 100,
        position: "relative",
      }}
    >
      {/* Warning icon */}
      <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>

      <span style={{ flex: 1, minWidth: 200 }}>
        <strong>Please verify your email address.</strong>{" "}
        We sent a verification link to <strong>{user.email}</strong>.
        Check your inbox (and spam folder) and click the link to activate your account.
      </span>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
        {sent ? (
          <span style={{ color: "#3A6B2E", fontWeight: 600, fontSize: "0.82rem" }}>
            ✓ Verification email resent
          </span>
        ) : (
          <button
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            style={{
              background: "#1A1A1A",
              color: "#F4F0E8",
              border: "none",
              borderRadius: 3,
              padding: "6px 14px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: resendMutation.isPending ? "not-allowed" : "pointer",
              opacity: resendMutation.isPending ? 0.7 : 1,
              letterSpacing: "0.03em",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}
          >
            {resendMutation.isPending ? "Sending…" : "Resend Email"}
          </button>
        )}
        {error && (
          <span style={{ color: "#C0392B", fontSize: "0.8rem" }}>{error}</span>
        )}
      </div>
    </div>
  );
}
