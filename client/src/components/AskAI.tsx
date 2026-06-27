/**
 * AI Compliance Assistant — AuditReady
 * Strictly limited to credential tracking topics.
 * No PHI, no clinical data, no legal/compliance advice.
 */
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { MessageCircle, X, Send, Sparkles, Loader2, AlertCircle, BarChart2 } from "lucide-react";

const C = {
  forest: "#1D3D2F",
  forestMid: "#2A5240",
  sage: "#3D6B52",
  amber: "#C4862A",
  amberPale: "#FEF3CD",
  parchment: "#F7F3ED",
  cream: "#FDFAF6",
  linen: "#EFE9E0",
  inkDark: "#1C1917",
  inkMid: "#5A5048",
  inkLight: "#7A6E64",
  inkFaint: "#A89880",
  rule: "#E2D9CE",
  red: "#B84040",
  redPale: "#FEF2F2",
  sans: "'Plus Jakarta Sans', system-ui, sans-serif",
  serif: "'DM Serif Display', Georgia, serif",
};

type Message = {
  role: "user" | "assistant";
  content: string;
  isQuotaError?: boolean;
};

const SUGGESTED_PROMPTS = [
  "What credentials does a BCBA need in NC?",
  "How often does an RBT need to renew?",
  "What does CARF require for staff credential files?",
  "What background checks are required for ABA staff?",
];

const DISCLAIMER = "AI Compliance Assistant answers questions about staff credential tracking only. It does not provide legal, clinical, billing, or compliance advice. Always verify requirements with your licensing board.";

interface AskAIProps {
  /** Optional context from the current page to ground AI answers */
  context?: {
    totalStaff?: number;
    totalCredentials?: number;
    expiringSoon?: number;
    expired?: number;
  };
  /** When true, the chat opens automatically and seeds a guided onboarding welcome message */
  onboardingMode?: boolean;
  /** Called when the user has engaged with the onboarding (first message sent or chat closed) */
  onOnboardingEngaged?: () => void;
}

const ONBOARDING_WELCOME = `👋 Welcome to AuditReady! I'm your AI Compliance Assistant — I'm here to help you get set up and stay audit-ready.

Here's how to get started in 3 steps:

**Step 1 — Add your staff**
Head to the **Staff** section in the left sidebar and add your team members. You can add them one by one or import a CSV file.

**Step 2 — Add credentials for each staff member**
For each staff member, add their licenses, certifications, CPR cards, and background checks. You can upload documents or link to Google Drive / SharePoint.

**Step 3 — Let AuditReady do the rest**
Once credentials are entered, you'll get automatic email alerts at 90, 60, and 30 days before anything expires — no more manual tracking.

Feel free to ask me anything about credential requirements, CARF standards, or how to use the platform. What would you like to do first?`;

export default function AskAI({ context, onboardingMode, onOnboardingEngaged }: AskAIProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [onboardingEngaged, setOnboardingEngaged] = useState(false);
  const onboardingInitialized = useRef(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  // Local usage state updated optimistically after each successful response
  const [localUsed, setLocalUsed] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const askMutation = trpc.ai.ask.useMutation();
  const { data: usageData } = trpc.ai.getUsage.useQuery(undefined, {
    enabled: open,
    staleTime: 30_000,
  });

  const used = localUsed ?? usageData?.used ?? 0;
  const limit = usageData?.limit ?? 25;
  const resetDate = usageData?.resetDate;
  const isAtLimit = used >= limit;

  // Auto-open and seed welcome message in onboarding mode
  useEffect(() => {
    if (onboardingMode && !onboardingInitialized.current) {
      onboardingInitialized.current = true;
      // Small delay so the dashboard has time to render first
      setTimeout(() => {
        setOpen(true);
        setMessages([{ role: "assistant", content: ONBOARDING_WELCOME }]);
      }, 1200);
    }
  }, [onboardingMode]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleEngaged = () => {
    if (onboardingMode && !onboardingEngaged) {
      setOnboardingEngaged(true);
      onOnboardingEngaged?.();
    }
  };

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading || isAtLimit) return;
    handleEngaged();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const result = await askMutation.mutateAsync({ question: q, context });
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer }]);
      // Optimistically update local usage count
      if (result.usage) {
        setLocalUsed(result.usage.used);
      }
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (msg.startsWith("QUOTA_EXCEEDED:")) {
        const resetMsg = msg.replace("QUOTA_EXCEEDED:", "");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `You've used your AI question limit for this period. ${resetMsg} To increase your limit, upgrade your plan.`,
            isQuotaError: true,
          },
        ]);
        setLocalUsed(limit); // Mark as at limit
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I couldn't process that request. Please try again." },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const usagePct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const usageColor = usagePct >= 100 ? C.red : usagePct >= 80 ? C.amber : C.sage;

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        data-tour="ask-ai-btn"
        onClick={() => {
          if (open) handleEngaged(); // closing counts as engaged
          setOpen((v) => !v);
        }}
        aria-label="AI Compliance Assistant"
        style={{
          position: "fixed",
          bottom: 28,
          right: 28,
          zIndex: 900,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: C.forest,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 20px rgba(29,61,47,0.35)",
          transition: "transform 160ms cubic-bezier(0.23,1,0.32,1), box-shadow 160ms",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.07)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(29,61,47,0.45)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(29,61,47,0.35)";
        }}
      >
        {open ? (
          <X size={20} color="#F0EBE3" />
        ) : (
          <Sparkles size={20} color="#F0EBE3" />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 92,
            right: 28,
            zIndex: 901,
            width: 360,
            maxWidth: "calc(100vw - 40px)",
            background: C.parchment,
            border: `1px solid ${C.rule}`,
            borderRadius: 8,
            boxShadow: "0 16px 48px rgba(28,25,23,0.18)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            animation: "askAIIn 200ms cubic-bezier(0.23,1,0.32,1)",
          }}
        >
          <style>{`
            @keyframes askAIIn {
              from { opacity: 0; transform: scale(0.95) translateY(8px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            background: C.forest,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} color={C.amber} />
              <span style={{ fontFamily: C.sans, fontSize: "0.92rem", fontWeight: 700, color: "#F0EBE3", letterSpacing: "-0.01em", WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" } as React.CSSProperties}>
                AI Compliance Assistant
              </span>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <X size={16} color="rgba(240,235,227,0.6)" />
            </button>
          </div>

          {/* Usage bar */}
          <div style={{
            padding: "8px 14px 6px",
            background: C.linen,
            borderBottom: `1px solid ${C.rule}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <BarChart2 size={12} color={C.inkFaint} />
                <span style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkMid, letterSpacing: "0.01em", WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>
                  {used} / {limit} questions used
                  {resetDate && !isAtLimit && (
                    <span style={{ color: C.inkFaint, marginLeft: 4 }}>
                      · resets {new Date(resetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </span>
              </div>
              {isAtLimit && (
                <a href="/pricing" style={{ fontFamily: C.sans, fontSize: "0.7rem", color: C.amber, textDecoration: "none", fontWeight: 700 }}>
                  Upgrade →
                </a>
              )}
            </div>
            {/* Progress bar */}
            <div style={{ height: 3, background: C.rule, borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${usagePct}%`,
                background: usageColor,
                borderRadius: 2,
                transition: "width 400ms ease-out",
              }} />
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            padding: "7px 14px",
            background: C.linen,
            borderBottom: `1px solid ${C.rule}`,
            display: "flex",
            gap: 6,
            alignItems: "flex-start",
          }}>
            <AlertCircle size={12} color={C.inkFaint} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontFamily: C.sans, fontSize: "0.72rem", color: C.inkMid, margin: 0, lineHeight: 1.55, WebkitFontSmoothing: "antialiased" } as React.CSSProperties}>
              {DISCLAIMER}
            </p>
          </div>

          {/* Limit-reached banner */}
          {isAtLimit && (
            <div style={{
              padding: "10px 14px",
              background: C.redPale,
              borderBottom: `1px solid #FECACA`,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}>
              <AlertCircle size={14} color={C.red} style={{ flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 600, color: C.red, margin: "0 0 2px" }}>
                  Question limit reached
                </p>
                <p style={{ fontFamily: C.sans, fontSize: "0.7rem", color: "#7F1D1D", margin: 0, lineHeight: 1.5 }}>
                  You've used your {limit} AI questions for this period.
                  {resetDate
                    ? ` Your limit resets on ${new Date(resetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
                    : " Your trial AI question limit has been reached."}
                  {" "}To increase your limit, <a href="/pricing" style={{ color: C.amber, fontWeight: 600 }}>upgrade your plan</a>.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "14px 14px 8px",
            maxHeight: 280,
            minHeight: 100,
          }}>
            {messages.length === 0 && !isAtLimit && (
              <div>
                <p style={{ fontFamily: C.sans, fontSize: "0.8rem", color: C.inkLight, marginBottom: 12 }}>
                  Ask me about staff credentials, license requirements, or CARF/Joint Commission standards.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setInput(p); setTimeout(() => inputRef.current?.focus(), 50); }}
                      style={{
                        textAlign: "left",
                        padding: "7px 10px",
                        background: C.cream,
                        border: `1px solid ${C.rule}`,
                        borderRadius: 4,
                        fontFamily: C.sans,
                        fontSize: "0.75rem",
                        color: C.inkMid,
                        cursor: "pointer",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 12,
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div style={{
                  maxWidth: "85%",
                  padding: "9px 12px",
                  borderRadius: msg.role === "user" ? "10px 10px 2px 10px" : "10px 10px 10px 2px",
                  background: msg.isQuotaError ? C.redPale : msg.role === "user" ? C.forest : C.cream,
                  border: msg.role === "assistant" ? `1px solid ${msg.isQuotaError ? "#FECACA" : C.rule}` : "none",
                  fontFamily: C.sans,
                  fontSize: "0.8rem",
                  color: msg.isQuotaError ? C.red : msg.role === "user" ? "#F0EBE3" : C.inkDark,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
                <div style={{
                  padding: "9px 14px",
                  background: C.cream,
                  border: `1px solid ${C.rule}`,
                  borderRadius: "10px 10px 10px 2px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}>
                  <Loader2 size={13} color={C.inkFaint} className="animate-spin" />
                  <span style={{ fontFamily: C.sans, fontSize: "0.75rem", color: C.inkFaint }}>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 12px",
            borderTop: `1px solid ${C.rule}`,
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            opacity: isAtLimit ? 0.5 : 1,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAtLimit ? "Question limit reached" : "Ask about credentials, licenses, CARF..."}
              disabled={isAtLimit}
              rows={1}
              style={{
                flex: 1,
                padding: "8px 10px",
                border: `1px solid ${C.rule}`,
                borderRadius: 4,
                fontFamily: C.sans,
                fontSize: "0.8rem",
                color: C.inkDark,
                background: isAtLimit ? C.linen : C.cream,
                resize: "none",
                outline: "none",
                lineHeight: 1.4,
                maxHeight: 80,
                overflowY: "auto",
                cursor: isAtLimit ? "not-allowed" : "text",
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || isAtLimit}
              style={{
                width: 34,
                height: 34,
                borderRadius: 4,
                background: input.trim() && !loading && !isAtLimit ? C.forest : C.linen,
                border: "none",
                cursor: input.trim() && !loading && !isAtLimit ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 160ms",
              }}
            >
              <Send size={14} color={input.trim() && !loading && !isAtLimit ? "#F0EBE3" : C.inkFaint} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
