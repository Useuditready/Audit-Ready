import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { X, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";

// ── Design tokens (match Dashboard palette) ──────────────────────────────────
const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  sage:      "#3D6B52",
  amber:     "#C4862A",
  amberPale: "#FEF3CD",
  parchment: "#F7F3ED",
  cream:     "#FDFAF6",
  linen:     "#EFE9E0",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  rule:      "#E2D9CE",
  sans:      "'DM Sans', system-ui, sans-serif",
  serif:     "'Cormorant Garamond', Georgia, serif",
};

// ── Tour steps ────────────────────────────────────────────────────────────────
interface TourStep {
  id: string;
  title: string;
  body: string;
  /** CSS selector to highlight. If null, shows a centered modal. */
  target: string | null;
  /** Placement of the tooltip relative to the target */
  placement: "top" | "bottom" | "left" | "right" | "center";
  /** Optional action to perform before showing this step */
  action?: () => void;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to AuditReady!",
    body: "This quick tour will walk you through the key features so you can get your agency audit-ready in minutes. You can exit at any time.",
    target: null,
    placement: "center",
  },
  {
    id: "dashboard",
    title: "Compliance Overview",
    body: "Your dashboard shows a real-time snapshot of your agency's compliance status — total staff, credentials current, expiring soon, and expired credentials at a glance.",
    target: "[data-tour='stats-grid']",
    placement: "bottom",
  },
  {
    id: "staff",
    title: "Staff Directory",
    body: "Add each staff member here. AuditReady tracks credentials at the individual level, so every person on your team has their own credential profile.",
    target: "[data-tour='nav-staff']",
    placement: "right",
  },
  {
    id: "credentials",
    title: "Credential Tracking",
    body: "For each staff member, add their licenses, certifications, CPR cards, background checks, and training records. Upload a photo and our AI will extract the expiration date automatically.",
    target: "[data-tour='nav-credentials']",
    placement: "right",
  },
  {
    id: "pending-review",
    title: "Pending Review Queue",
    body: "When a credential is uploaded, it enters the review queue. You can verify it against the state board, mark it verified, or flag it for follow-up — creating a clear audit trail.",
    target: "[data-tour='nav-pending']",
    placement: "right",
  },
  {
    id: "expiring",
    title: "Expiration Alerts",
    body: "AuditReady sends automatic email reminders at 90, 60, and 30 days before any credential expires — so you're never caught off guard during an audit.",
    target: "[data-tour='expiring-section']",
    placement: "top",
  },
  {
    id: "ai-assistant",
    title: "AI Compliance Assistant",
    body: "Have a compliance question? Ask the AI Compliance Assistant about license requirements, CARF standards, or credential renewal timelines. It's available on every page.",
    target: "[data-tour='ask-ai-btn']",
    placement: "top",
  },
  {
    id: "done",
    title: "You're all set!",
    body: "Start by adding your first staff member, then attach their credentials. If you need help, use the AI Compliance Assistant or visit our Credential Checklist Guide in the navigation.",
    target: null,
    placement: "center",
  },
];

// ── Highlight box helper ──────────────────────────────────────────────────────
interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getElementRect(selector: string): HighlightRect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  };
}

// ── Tooltip positioning ───────────────────────────────────────────────────────
function getTooltipStyle(
  rect: HighlightRect | null,
  placement: TourStep["placement"],
  tooltipWidth: number,
  tooltipHeight: number
): React.CSSProperties {
  if (!rect || placement === "center") {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 10001,
    };
  }

  const GAP = 16;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;

  if (placement === "bottom") {
    top = rect.top + rect.height + GAP;
    left = rect.left + rect.width / 2 - tooltipWidth / 2;
  } else if (placement === "top") {
    top = rect.top - tooltipHeight - GAP;
    left = rect.left + rect.width / 2 - tooltipWidth / 2;
  } else if (placement === "right") {
    top = rect.top + rect.height / 2 - tooltipHeight / 2;
    left = rect.left + rect.width + GAP;
  } else if (placement === "left") {
    top = rect.top + rect.height / 2 - tooltipHeight / 2;
    left = rect.left - tooltipWidth - GAP;
  }

  // Clamp to viewport
  left = Math.max(12, Math.min(left, vw - tooltipWidth - 12));
  top = Math.max(12, Math.min(top, vh + window.scrollY - tooltipHeight - 12));

  return {
    position: "absolute",
    top,
    left,
    zIndex: 10001,
  };
}

// ── Main component ────────────────────────────────────────────────────────────
interface OnboardingTourProps {
  /** Called when the tour is dismissed or completed */
  onDone: () => void;
}

export default function OnboardingTour({ onDone }: OnboardingTourProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipSize, setTooltipSize] = useState({ width: 340, height: 200 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const completeTourMutation = trpc.auth.completeTour.useMutation();
  const utils = trpc.useUtils();

  const step = TOUR_STEPS[stepIdx];

  // Measure tooltip size after render
  useEffect(() => {
    if (tooltipRef.current) {
      const { offsetWidth, offsetHeight } = tooltipRef.current;
      setTooltipSize({ width: offsetWidth || 340, height: offsetHeight || 200 });
    }
  }, [stepIdx]);

  // Update highlight rect when step changes
  useEffect(() => {
    if (!step.target) {
      setHighlightRect(null);
      return;
    }

    // Small delay to allow DOM to settle
    const timer = setTimeout(() => {
      const rect = getElementRect(step.target!);
      setHighlightRect(rect);
    }, 80);

    return () => clearTimeout(timer);
  }, [step]);

  // Scroll target into view
  useEffect(() => {
    if (!step.target) return;
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step]);

  const handleDone = useCallback(async () => {
    completeTourMutation.mutate(undefined, {
      onSuccess: () => {
        utils.auth.me.invalidate();
      },
    });
    onDone();
  }, [completeTourMutation, utils, onDone]);

  const handleNext = () => {
    if (stepIdx < TOUR_STEPS.length - 1) {
      setStepIdx(s => s + 1);
    } else {
      handleDone();
    }
  };

  const handlePrev = () => {
    if (stepIdx > 0) setStepIdx(s => s - 1);
  };

  const isLast = stepIdx === TOUR_STEPS.length - 1;
  const isFirst = stepIdx === 0;

  const tooltipStyle = getTooltipStyle(
    highlightRect,
    step.placement,
    tooltipSize.width,
    tooltipSize.height
  );

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          pointerEvents: "none",
        }}
      >
        {/* Dark overlay with cutout */}
        <svg
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              {highlightRect && (
                <rect
                  x={highlightRect.left - 6}
                  y={highlightRect.top - 6}
                  width={highlightRect.width + 12}
                  height={highlightRect.height + 12}
                  rx="4"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(28,25,23,0.72)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Highlight border ring */}
        {highlightRect && (
          <div
            style={{
              position: "absolute",
              top: highlightRect.top - 6,
              left: highlightRect.left - 6,
              width: highlightRect.width + 12,
              height: highlightRect.height + 12,
              borderRadius: 4,
              border: `2px solid ${C.amber}`,
              boxShadow: `0 0 0 4px rgba(196,134,42,0.18)`,
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* ── Tooltip ── */}
      <div
        ref={tooltipRef}
        style={{
          ...tooltipStyle,
          width: 340,
          maxWidth: "calc(100vw - 24px)",
          background: C.cream,
          border: `1px solid ${C.rule}`,
          borderTop: `3px solid ${C.amber}`,
          borderRadius: 4,
          padding: "22px 22px 18px",
          fontFamily: C.sans,
          boxShadow: "0 8px 32px rgba(28,25,23,0.22), 0 2px 8px rgba(28,25,23,0.12)",
          pointerEvents: "auto",
        }}
      >
        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 5 }}>
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === stepIdx ? 18 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: i === stepIdx ? C.amber : (i < stepIdx ? C.sage : C.rule),
                  transition: "width 200ms ease, background 200ms ease",
                }}
              />
            ))}
          </div>
          <button
            onClick={handleDone}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: C.inkFaint,
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
            title="Skip tour"
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <h3 style={{
          fontFamily: C.serif,
          fontSize: "1.15rem",
          fontWeight: 700,
          color: C.inkDark,
          margin: "0 0 8px",
          lineHeight: 1.3,
        }}>
          {step.title}
        </h3>
        <p style={{
          fontSize: "0.84rem",
          color: C.inkMid,
          lineHeight: 1.6,
          margin: "0 0 18px",
        }}>
          {step.body}
        </p>

        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={handlePrev}
            disabled={isFirst}
            style={{
              background: "none",
              border: `1px solid ${isFirst ? C.rule : C.inkFaint}`,
              borderRadius: 3,
              padding: "6px 14px",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: isFirst ? C.inkFaint : C.inkMid,
              cursor: isFirst ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily: C.sans,
              opacity: isFirst ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={13} /> Back
          </button>

          <span style={{ fontSize: "0.7rem", color: C.inkFaint }}>
            {stepIdx + 1} / {TOUR_STEPS.length}
          </span>

          <button
            onClick={handleNext}
            style={{
              background: isLast ? C.sage : C.forest,
              border: "none",
              borderRadius: 3,
              padding: "6px 16px",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#F0EBE3",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontFamily: C.sans,
              transition: "background 150ms ease",
            }}
          >
            {isLast ? (
              <><CheckCircle2 size={13} /> Get started</>
            ) : (
              <>Next <ChevronRight size={13} /></>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
