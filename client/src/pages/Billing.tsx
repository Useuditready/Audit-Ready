/**
 * AuditReady — Billing & Subscription Page (/billing)
 * Shows current plan, subscription status, next billing date,
 * and provides access to the Stripe Customer Portal for self-service management.
 *
 * Design: matches the Settings page aesthetic — parchment background,
 * forest-green accents, DM Serif Display headlines, Plus Jakarta Sans body.
 */

import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { PilotStatusBanner } from "@/components/PilotStatusBanner";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import AgencyProfileModal from "@/components/AgencyProfileModal";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
  ArrowRight,
  Calendar,
  RefreshCw,
  Shield,
  Star,
  Zap,
  XCircle,
  RotateCcw,
  X,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────
const C = {
  forest:     "#1D3D2F",
  forestMid:  "#2A5240",
  sage:       "#3D6B52",
  sageLight:  "#5A8C6E",
  amber:      "#C4862A",
  amberLight: "#E8A94A",
  amberPale:  "#FEF3CD",
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
  red:        "#B84040",
  redPale:    "#FFF0F0",
  greenPale:  "#F0FAF4",
  green:      "#3A8C5C",
  serif:      "'DM Serif Display', Georgia, serif",
  sans:       "'Plus Jakarta Sans', system-ui, sans-serif",
  mono:       "'JetBrains Mono', 'Courier New', monospace",
};

const LOGO_URL = "/manus-storage/auditready-logo-clean_dc6a097d.png";

// ── Plan metadata ─────────────────────────────────────────────
const PLAN_META: Record<string, {
  label: string;
  price: string;
  icon: React.ElementType;
  color: string;
  features: string[];
}> = {
  starter: {
    label: "Starter",
    price: "$129/mo",
    icon: Shield,
    color: C.sage,
    features: [
      "Up to 10 staff members",
      "Core credential tracking",
      "Expiration reminders (90/60/30 days)",
      "AI-assisted document extraction",
      "Audit-ready CSV export",
      "Email support",
    ],
  },
  growth: {
    label: "Growth",
    price: "$249/mo",
    icon: Zap,
    color: C.amber,
    features: [
      "Up to 50 staff members",
      "Everything in Starter",
      "NC board license verification support",
      "AI audit narrative assistant",
      "Multi-state license tracking",
      "Priority email support",
    ],
  },
  enterprise: {
    label: "Enterprise",
    price: "$449/mo",
    icon: Star,
    color: C.forest,
    features: [
      "Unlimited staff members",
      "Everything in Growth",
      "Custom credential types",
      "Multi-location support",
      "Priority support",
    ],
  },
};

// ── Status badge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; bg: string; color: string; icon: React.ElementType }> = {
    subscribed:   { label: "Active",       bg: C.greenPale, color: "#166534", icon: CheckCircle },
    active_pilot: { label: "Free Pilot",   bg: C.amberPale, color: "#92400E", icon: Clock },
    read_only:    { label: "Grace Period", bg: "#FFF7ED",   color: "#9A3412", icon: AlertTriangle },
    locked:       { label: "Locked",       bg: C.redPale,   color: C.red,     icon: AlertTriangle },
    pending:      { label: "Pending",      bg: C.linen,     color: C.inkMid,  icon: Clock },
  };
  const c = cfg[status] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 12px", borderRadius: 20,
      background: c.bg, color: c.color,
      fontFamily: C.sans, fontSize: "0.78rem", fontWeight: 600,
    }}>
      <Icon size={13} />
      {c.label}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function Billing() {
  const { user, isAuthenticated } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [paymentUpdateLoading, setPaymentUpdateLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [pendingPlan, setPendingPlan] = useState<{ plan: "starter" | "growth" | "enterprise"; interval: "monthly" | "annual" } | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  const { data: subStatus, isLoading: subLoading, refetch } = trpc.billing.getSubscriptionStatus.useQuery(
    undefined,
    { enabled: isAuthenticated, refetchOnWindowFocus: false }
  );

  const createPortalMutation = trpc.billing.createPortalSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err) => {
      toast.error(err.message || "Failed to open billing portal. Please try again.");
      setPortalLoading(false);
    },
  });

  const createPaymentUpdateMutation = trpc.billing.createPaymentMethodUpdateSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err) => {
      toast.error(err.message || "Failed to open payment update portal. Please try again.");
      setPaymentUpdateLoading(false);
    },
  });

  const handleManageSubscription = () => {
    setPortalLoading(true);
    createPortalMutation.mutate({ origin: window.location.origin });
  };

  const handleUpdatePaymentMethod = () => {
    setPaymentUpdateLoading(true);
    createPaymentUpdateMutation.mutate({ origin: window.location.origin });
  };

  const createCheckoutMutation = trpc.billing.createCheckoutSession.useMutation({
    onSuccess: ({ url }) => {
      window.location.href = url;
    },
    onError: (err) => {
      toast.error(err.message || "Failed to start checkout. Please try again.");
      setCheckoutLoading(false);
    },
  });

  const handleUpgrade = (currentPlan: string) => {
    // Determine the next plan tier
    const nextPlan = currentPlan === "starter" ? "growth" : currentPlan === "growth" ? "enterprise" : "enterprise";
    setPendingPlan({ plan: nextPlan as "starter" | "growth" | "enterprise", interval: "monthly" });
    setAgencyModalOpen(true);
  };

  const handleActivatePlan = () => {
    // For pilot/locked/read_only users — subscribe to their current plan
    const currentPlan = (subStatus?.plan ?? "starter") as "starter" | "growth" | "enterprise";
    setPendingPlan({ plan: currentPlan, interval: "monthly" });
    setAgencyModalOpen(true);
  };

  const cancelMutation = trpc.billing.cancelSubscription.useMutation({
    onSuccess: () => {
      toast.success("Cancellation scheduled. You'll retain access until the end of your billing period.");
      setCancelLoading(false);
      setCancelConfirmOpen(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to schedule cancellation. Please try again.");
      setCancelLoading(false);
    },
  });

  const reactivateMutation = trpc.billing.reactivateSubscription.useMutation({
    onSuccess: () => {
      toast.success("Cancellation reversed. Your subscription will continue as normal.");
      setReactivateLoading(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reactivate. Please try again.");
      setReactivateLoading(false);
    },
  });

  const handleCancelSubscription = () => {
    setCancelLoading(true);
    cancelMutation.mutate();
  };

  const handleReactivate = () => {
    setReactivateLoading(true);
    reactivateMutation.mutate();
  };

  const handleAgencyProfileComplete = (repCode?: string) => {
    setAgencyModalOpen(false);
    if (pendingPlan) {
      setCheckoutLoading(true);
      createCheckoutMutation.mutate({
        plan: pendingPlan.plan,
        interval: pendingPlan.interval,
        origin: window.location.origin,
        repCode,
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} color={C.sage} className="animate-spin" />
      </div>
    );
  }

  const plan = subStatus?.plan ?? "starter";
  const planMeta = PLAN_META[plan] ?? PLAN_META.starter;
  const PlanIcon = planMeta.icon;
  const isSubscribed = subStatus?.accountStatus === "subscribed";
  const isPilot = subStatus?.accountStatus === "active_pilot";
  const isLocked = subStatus?.accountStatus === "locked";
  const isReadOnly = subStatus?.accountStatus === "read_only";
  const isPastDue = subStatus?.stripeStatus === "past_due" || subStatus?.stripeStatus === "unpaid";

  const nextBillingDate = subStatus?.currentPeriodEnd
    ? new Date(subStatus.currentPeriodEnd).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : null;

  return (
    <DashboardLayout>
      <PilotStatusBanner />
      <EmailVerificationBanner />

      {/* ── Page content ───────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "48px 32px 80px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontFamily: C.serif, fontSize: "2rem", fontWeight: 700, color: C.inkDark, letterSpacing: "-0.02em", margin: "0 0 6px" }}>
            Billing & Subscription
          </h1>
          <p style={{ fontFamily: C.sans, fontSize: "0.88rem", color: C.inkLight, margin: 0 }}>
            Manage your plan, view invoices, and update payment information.
          </p>
        </div>

        {subLoading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
            <Loader2 size={28} color={C.sage} className="animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Payment Failed Alert ──────────────────────── */}
            {isPastDue && (
              <div style={{
                background: C.redPale,
                border: `1px solid #E8C8C8`,
                borderLeft: `4px solid ${C.red}`,
                borderRadius: 10,
                padding: "20px 24px",
                marginBottom: 20,
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
              }}>
                <AlertTriangle size={20} color={C.red} style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: C.sans, fontSize: "0.9rem", fontWeight: 700, color: C.red, marginBottom: 6 }}>
                    Payment failed — action required
                  </div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, margin: "0 0 14px", lineHeight: 1.6 }}>
                    We were unable to charge your card. Stripe will retry automatically, but your access may be suspended if the payment isn't resolved. Please update your payment method to avoid any interruption.
                  </p>
                  <button
                    onClick={handleUpdatePaymentMethod}
                    disabled={paymentUpdateLoading}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "9px 20px", borderRadius: 6, border: "none",
                      cursor: paymentUpdateLoading ? "not-allowed" : "pointer",
                      background: C.red, color: "#fff",
                      fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                      opacity: paymentUpdateLoading ? 0.7 : 1,
                    }}
                  >
                    {paymentUpdateLoading
                      ? <><Loader2 size={14} className="animate-spin" /> Opening…</>
                      : <><CreditCard size={14} /> Update Payment Method</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* ── Current Plan Card ─────────────────────────── */}
            <div style={{
              background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 10,
              padding: "28px 32px", marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 10,
                    background: `${planMeta.color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <PlanIcon size={22} color={planMeta.color} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: C.serif, fontSize: "1.3rem", fontWeight: 700, color: C.inkDark }}>
                        {planMeta.label} Plan
                      </span>
                      <StatusBadge status={subStatus?.accountStatus ?? "pending"} />
                    </div>
                    <div style={{ fontFamily: C.mono, fontSize: "0.88rem", color: C.inkMid }}>
                      {planMeta.price}
                      {subStatus?.interval === "year" ? " (annual)" : ""}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {isSubscribed && (
                    <button
                      onClick={handleManageSubscription}
                      disabled={portalLoading}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 20px", borderRadius: 6, border: "none", cursor: portalLoading ? "not-allowed" : "pointer",
                        background: C.forest, color: "#F0EBE3",
                        fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                        opacity: portalLoading ? 0.7 : 1,
                        transition: "opacity 160ms ease",
                      }}
                    >
                      {portalLoading
                        ? <><Loader2 size={14} className="animate-spin" /> Opening portal…</>
                        : <><ExternalLink size={14} /> Manage Billing</>
                      }
                    </button>
                  )}
                  {(isPilot || isReadOnly || isLocked) && (
                    <button
                      onClick={handleActivatePlan}
                      disabled={checkoutLoading}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 20px", borderRadius: 6, border: "none",
                        cursor: checkoutLoading ? "not-allowed" : "pointer",
                        background: C.amber, color: "#fff",
                        fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                        opacity: checkoutLoading ? 0.7 : 1,
                        transition: "opacity 160ms ease",
                      }}
                    >
                      {checkoutLoading
                        ? <><Loader2 size={14} className="animate-spin" /> Redirecting…</>
                        : <><ArrowRight size={14} /> Activate Plan</>}
                    </button>
                  )}
                  {isSubscribed && plan !== "enterprise" && (
                    <button
                      onClick={() => handleUpgrade(plan)}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "10px 20px", borderRadius: 6, cursor: "pointer",
                        border: `1px solid ${C.rule}`, background: "transparent", color: C.inkMid,
                        fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 500,
                      }}
                    >
                      Upgrade Plan
                    </button>
                  )}
                  <button
                    onClick={() => refetch()}
                    title="Refresh subscription status"
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 40, height: 40, borderRadius: 6, cursor: "pointer",
                      border: `1px solid ${C.rule}`, background: "transparent", color: C.inkLight,
                    }}
                  >
                    <RefreshCw size={15} />
                  </button>
                </div>
              </div>

              {/* Billing details row */}
              {isSubscribed && (
                <div style={{
                  display: "flex", gap: 32, flexWrap: "wrap",
                  marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.rule}`,
                }}>
                  {nextBillingDate && (
                    <div>
                      <div style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 4 }}>
                        Next billing date
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: C.mono, fontSize: "0.88rem", color: C.inkDark }}>
                        <Calendar size={14} color={C.inkLight} />
                        {nextBillingDate}
                      </div>
                    </div>
                  )}
                  {subStatus?.cancelAtPeriodEnd && (
                    <div>
                      <div style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.red, marginBottom: 4 }}>
                        Cancellation scheduled
                      </div>
                      <div style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid }}>
                        Your subscription will end on {nextBillingDate ?? "the next billing date"}.
                      </div>
                    </div>
                  )}
                  {subStatus?.interval && (
                    <div>
                      <div style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 4 }}>
                        Billing interval
                      </div>
                      <div style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkDark, textTransform: "capitalize" }}>
                        {subStatus.interval === "month" ? "Monthly" : "Annual"}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pilot / locked state messaging */}
              {(isPilot || isReadOnly || isLocked) && (
                <div style={{
                  marginTop: 20, padding: "14px 18px", borderRadius: 6,
                  background: isLocked ? C.redPale : C.amberPale,
                  border: `1px solid ${isLocked ? "#E8C8C8" : "#F5D98A"}`,
                }}>
                  <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: isLocked ? C.red : "#92400E", margin: 0, lineHeight: 1.55 }}>
                    {isLocked
                      ? "Your account is locked. Subscribe to restore full access to your credential data."
                      : isReadOnly
                        ? "Your pilot period has ended. Your data is in read-only mode. Subscribe to continue editing."
                        : "You're on a free pilot. Subscribe to unlock full access and keep your data after the pilot ends."}
                  </p>
                </div>
              )}
            </div>

            {/* ── Plan Features ─────────────────────────────── */}
            <div style={{
              background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 10,
              padding: "24px 32px", marginBottom: 20,
            }}>
              <div style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 16 }}>
                What's included in {planMeta.label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px 24px" }}>
                {planMeta.features.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <CheckCircle size={15} color={C.sage} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

              {/* ── Manage Subscription (Stripe Portal) ────────── */}
            {isSubscribed && (
              <div style={{
                background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 10,
                padding: "24px 32px", marginBottom: 20,
              }}>
                <div style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 12 }}>
                  Self-service billing
                </div>
                <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, margin: "0 0 16px", lineHeight: 1.6 }}>
                  Update your payment method, download invoices, change your billing interval, or cancel your subscription.
                </p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <button
                    onClick={handleUpdatePaymentMethod}
                    disabled={paymentUpdateLoading}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "10px 22px", borderRadius: 6, border: `1px solid ${C.rule}`,
                      cursor: paymentUpdateLoading ? "not-allowed" : "pointer",
                      background: C.cream, color: C.inkDark,
                      fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                      opacity: paymentUpdateLoading ? 0.7 : 1,
                    }}
                  >
                    {paymentUpdateLoading
                      ? <><Loader2 size={14} className="animate-spin" /> Opening…</>
                      : <><CreditCard size={14} /> Update Payment Method</>
                    }
                  </button>
                  <button
                    onClick={handleManageSubscription}
                    disabled={portalLoading}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "10px 22px", borderRadius: 6, border: "none", cursor: portalLoading ? "not-allowed" : "pointer",
                      background: C.forest, color: "#F0EBE3",
                      fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                      opacity: portalLoading ? 0.7 : 1,
                    }}
                  >
                    {portalLoading
                      ? <><Loader2 size={14} className="animate-spin" /> Opening portal…</>
                      : <><ExternalLink size={14} /> Manage Billing</>
                    }
                  </button>
                </div>
                <p style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint, marginTop: 10, marginBottom: 0 }}>
                  You'll be redirected to Stripe's secure billing portal and returned here when done.
                </p>

                {/* Cancel / Reactivate */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.rule}` }}>
                  <div style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 10 }}>
                    Cancel subscription
                  </div>
                  {subStatus?.cancelAtPeriodEnd ? (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, margin: "0 0 10px", lineHeight: 1.6 }}>
                          Your subscription is scheduled to cancel on <strong>{nextBillingDate ?? "the next billing date"}</strong>. You'll retain full access until then.
                        </p>
                      </div>
                      <button
                        onClick={handleReactivate}
                        disabled={reactivateLoading}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 8,
                          padding: "9px 18px", borderRadius: 6, border: `1px solid ${C.sage}`,
                          cursor: reactivateLoading ? "not-allowed" : "pointer",
                          background: "transparent", color: C.sage,
                          fontFamily: C.sans, fontSize: "0.83rem", fontWeight: 600,
                          opacity: reactivateLoading ? 0.7 : 1, flexShrink: 0,
                        }}
                      >
                        {reactivateLoading
                          ? <><Loader2 size={13} className="animate-spin" /> Reactivating…</>
                          : <><RotateCcw size={13} /> Keep my subscription</>}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, margin: "0 0 12px", lineHeight: 1.6 }}>
                        You can cancel at any time. Your access continues until the end of your current billing period — no immediate interruption.
                      </p>
                      <button
                        onClick={() => setCancelConfirmOpen(true)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 8,
                          padding: "9px 18px", borderRadius: 6, border: `1px solid #E8C8C8`,
                          cursor: "pointer", background: "transparent", color: C.red,
                          fontFamily: C.sans, fontSize: "0.83rem", fontWeight: 600,
                        }}
                      >
                        <XCircle size={14} /> Cancel subscription
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Cancel Confirmation Dialog ─────────────────── */}
            {cancelConfirmOpen && (
              <div style={{
                position: "fixed", inset: 0, background: "rgba(28,25,23,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                zIndex: 1000, padding: 24,
              }}>
                <div style={{
                  background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 10,
                  padding: "32px 36px", maxWidth: 460, width: "100%", position: "relative",
                }}>
                  <button
                    onClick={() => setCancelConfirmOpen(false)}
                    style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.inkLight, padding: 4 }}
                  >
                    <X size={16} />
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.redPale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <XCircle size={20} color={C.red} />
                    </div>
                    <h3 style={{ fontFamily: C.serif, fontSize: "1.2rem", fontWeight: 700, color: C.inkDark, margin: 0 }}>
                      Cancel your subscription?
                    </h3>
                  </div>
                  <p style={{ fontFamily: C.sans, fontSize: "0.88rem", color: C.inkMid, margin: "0 0 12px", lineHeight: 1.65 }}>
                    Your subscription will be scheduled to end on <strong>{nextBillingDate ?? "your next billing date"}</strong>. You'll keep full access to all your staff and credential data until then.
                  </p>
                  <div style={{
                    background: C.amberPale, border: `1px solid #F5D98A`, borderRadius: 6,
                    padding: "12px 16px", marginBottom: 20,
                  }}>
                    <p style={{ fontFamily: C.sans, fontSize: "0.8rem", color: "#92400E", margin: 0, lineHeight: 1.6 }}>
                      <strong>Important:</strong> After cancellation, your account will enter read-only mode. Your data is preserved for 90 days. You can resubscribe at any time to restore full access.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => setCancelConfirmOpen(false)}
                      style={{
                        padding: "9px 20px", borderRadius: 6, border: `1px solid ${C.rule}`,
                        background: "transparent", color: C.inkMid,
                        fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 500, cursor: "pointer",
                      }}
                    >
                      Keep my subscription
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "9px 20px", borderRadius: 6, border: "none",
                        cursor: cancelLoading ? "not-allowed" : "pointer",
                        background: C.red, color: "#fff",
                        fontFamily: C.sans, fontSize: "0.85rem", fontWeight: 600,
                        opacity: cancelLoading ? 0.7 : 1,
                      }}
                    >
                      {cancelLoading
                        ? <><Loader2 size={13} className="animate-spin" /> Cancelling…</>
                        : "Yes, cancel subscription"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Billing Help ──────────────────────────────── */}
            <div style={{
              background: C.cream, border: `1px solid ${C.rule}`, borderRadius: 10,
              padding: "24px 32px",
            }}>
              <div style={{ fontFamily: C.sans, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: C.inkFaint, marginBottom: 12 }}>
                Billing questions
              </div>
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, margin: "0 0 10px", lineHeight: 1.6 }}>
                For billing questions, invoice requests, or account changes, contact us at{" "}
                <a href="mailto:support@useauditready.com" style={{ color: C.sage, textDecoration: "none" }}>
                  support@useauditready.com
                </a>.
              </p>
              <p style={{ fontFamily: C.sans, fontSize: "0.85rem", color: C.inkMid, margin: 0, lineHeight: 1.6 }}>
                See our{" "}
                <a href="/refunds" style={{ color: C.sage, textDecoration: "none" }}>Refund Policy</a>{" "}
                for details on cancellations and refunds.
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.rule}`, padding: "24px 32px", background: C.cream }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
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

      {/* ── Stripe Checkout Modal ─────────────────────────────── */}
      {agencyModalOpen && pendingPlan && (
        <AgencyProfileModal
          planName={pendingPlan.plan}
          billingInterval={pendingPlan.interval}
          onComplete={handleAgencyProfileComplete}
          onClose={() => { setAgencyModalOpen(false); setPendingPlan(null); setCheckoutLoading(false); }}
        />
      )}
    </DashboardLayout>
  );
}
