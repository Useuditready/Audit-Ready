/**
 * /verify-email — Email verification landing page.
 * Handles the link from the verification email.
 * The actual token check happens server-side at /api/verify-email,
 * which then redirects here with ?status=success|expired|invalid|error
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

const C = {
  paper: "#F4F0E8",
  ink: "#1A1A1A",
  inkMid: "#5A5048",
  inkLight: "#7A6E64",
  rule: "#D6CFBF",
  forest: "#3A4A2E",
  red: "#C0392B",
  linen: "#EBE5D8",
};

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "expired" | "invalid" | "error" | "already_verified">("loading");
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState("");

  const resendMutation = trpc.auth.resendVerificationEmail.useMutation({
    onSuccess: () => setResendSent(true),
    onError: (err) => setResendError(err.message),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("status");
    if (s === "success" || s === "expired" || s === "invalid" || s === "error") {
      setStatus(s);
    } else if (!s) {
      // No status param — user navigated here directly
      if (!loading && user?.emailVerifiedAt) {
        setStatus("already_verified");
      } else if (!loading && !user) {
        // Not logged in — redirect to home
        setLocation("/");
      } else {
        setStatus("loading");
      }
    }
  }, [loading, user, setLocation]);

  // If user just verified successfully, reload auth state
  useEffect(() => {
    if (status === "success") {
      // Invalidate the auth cache so the banner disappears
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 3000);
    }
  }, [status]);

  return (
    <div style={{
      minHeight: "100vh",
      background: C.paper,
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <a href="/" style={{ display: "inline-block" }}>
          <img src={LOGO_URL} alt="AuditReady" style={{ height: 36, width: "auto", objectFit: "contain" }} />
        </a>
      </div>

      {/* Card */}
      <div style={{
        background: "#FDFAF6",
        border: `1px solid ${C.rule}`,
        borderRadius: 4,
        padding: "48px 40px",
        maxWidth: 480,
        width: "100%",
        textAlign: "center",
      }}>
        {status === "loading" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: C.ink, marginBottom: 12 }}>
              Verifying your email…
            </h1>
            <p style={{ fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.65 }}>
              Please wait while we confirm your email address.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: C.forest, marginBottom: 12 }}>
              Email Verified
            </h1>
            <p style={{ fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.65, marginBottom: 24 }}>
              Your email address has been verified. You're being redirected to your dashboard now.
            </p>
            <a href="/dashboard" style={{
              display: "inline-block",
              background: C.ink,
              color: "#F4F0E8",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              padding: "12px 28px",
              borderRadius: 3,
              letterSpacing: "0.04em",
            }}>
              Go to Dashboard →
            </a>
          </>
        )}

        {status === "already_verified" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: C.forest, marginBottom: 12 }}>
              Already Verified
            </h1>
            <p style={{ fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.65, marginBottom: 24 }}>
              Your email address is already verified. You're all set.
            </p>
            <a href="/dashboard" style={{
              display: "inline-block",
              background: C.ink,
              color: "#F4F0E8",
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              padding: "12px 28px",
              borderRadius: 3,
            }}>
              Go to Dashboard →
            </a>
          </>
        )}

        {status === "expired" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏰</div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: C.ink, marginBottom: 12 }}>
              Link Expired
            </h1>
            <p style={{ fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.65, marginBottom: 24 }}>
              This verification link has expired (links are valid for 24 hours). Please request a new one.
            </p>
            {!resendSent ? (
              <button
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                style={{
                  background: C.ink,
                  color: "#F4F0E8",
                  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "none",
                  padding: "12px 28px",
                  borderRadius: 3,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {resendMutation.isPending ? "Sending…" : "Resend Verification Email"}
              </button>
            ) : (
              <p style={{ fontSize: "0.9rem", color: C.forest, fontWeight: 600 }}>
                ✓ New verification email sent. Check your inbox.
              </p>
            )}
            {resendError && (
              <p style={{ fontSize: "0.85rem", color: C.red, marginTop: 12 }}>{resendError}</p>
            )}
          </>
        )}

        {(status === "invalid" || status === "error") && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>✕</div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: "1.6rem", fontWeight: 700, color: C.red, marginBottom: 12 }}>
              Verification Failed
            </h1>
            <p style={{ fontSize: "0.9rem", color: C.inkMid, lineHeight: 1.65, marginBottom: 24 }}>
              This verification link is invalid or has already been used. If you need help, please contact us.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {!resendSent ? (
                <button
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  style={{
                    background: C.ink,
                    color: "#F4F0E8",
                    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    border: "none",
                    padding: "12px 28px",
                    borderRadius: 3,
                    cursor: "pointer",
                  }}
                >
                  {resendMutation.isPending ? "Sending…" : "Resend Verification Email"}
                </button>
              ) : (
                <p style={{ fontSize: "0.9rem", color: C.forest, fontWeight: 600 }}>
                  ✓ New verification email sent. Check your inbox.
                </p>
              )}
              <a href="mailto:support@useauditready.com" style={{
                display: "inline-block",
                border: `1px solid ${C.rule}`,
                color: C.inkMid,
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: "0.85rem",
                textDecoration: "none",
                padding: "12px 28px",
                borderRadius: 3,
              }}>
                Contact Support
              </a>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <p style={{ marginTop: 32, fontSize: "0.78rem", color: C.inkLight, textAlign: "center" }}>
        AuditReady · A Vibemo Group company · Questions?{" "}
        <a href="mailto:support@useauditready.com" style={{ color: C.inkLight }}>support@useauditready.com</a>
      </p>
    </div>
  );
}
