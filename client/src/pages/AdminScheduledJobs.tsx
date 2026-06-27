/**
 * AdminScheduledJobs — System Cron Job Management
 * Allows the admin to register all three system-level scheduled jobs
 * against the deployed (production) site in one click, and monitor
 * their status (last run, next run, enabled/disabled).
 *
 * IMPORTANT: This only works on the deployed site, not the dev sandbox.
 * After publishing, visit this page and click "Register All Jobs".
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import {
  ArrowLeft, RefreshCw, Clock, CheckCircle, XCircle,
  AlertTriangle, Play, Calendar, Zap,
} from "lucide-react";

const C = {
  forest:    "#1D3D2F",
  forestMid: "#2A5240",
  sage:      "#3D6B52",
  amber:     "#C4862A",
  amberPale: "#FEF3CD",
  parchment: "#F7F3ED",
  linen:     "#EFE9E0",
  rule:      "#E2D9CE",
  inkDark:   "#1C1917",
  inkMid:    "#5A5048",
  inkLight:  "#7A6E64",
  inkFaint:  "#A89880",
  red:       "#B84040",
  green:     "#2E7D32",
  sans:      "'Plus Jakarta Sans', system-ui, sans-serif",
  serif:     "'DM Serif Display', Georgia, serif",
  mono:      "'JetBrains Mono', 'Courier New', monospace",
};

const JOB_LABELS: Record<string, { label: string; description: string; schedule: string }> = {
  "auditready-pilot-lifecycle": {
    label: "Pilot Lifecycle",
    description: "Day-11/13 warning emails, day-14 read-only flip, day-17 account lock",
    schedule: "Daily at 9:00 AM UTC",
  },
  "auditready-credential-reminders": {
    label: "Credential Reminders",
    description: "Expiration reminder emails at 90, 60, and 30 days before expiry",
    schedule: "Daily at 9:30 AM UTC",
  },
  "auditready-retention-cleanup": {
    label: "Retention Cleanup",
    description: "Notifies admins of inactive staff whose 2-year retention period has passed",
    schedule: "Daily at 10:00 AM UTC",
  },
  "auditready-privacy-policy-review": {
    label: "Privacy Policy Review",
    description: "Quarterly owner reminder to review and update the Privacy Policy and AI sub-processor list",
    schedule: "Quarterly (1st of Mar, Jun, Sep, Dec at 9:00 AM UTC)",
  },
  "auditready-deletion-deadline-alert": {
    label: "Deletion Deadline Alert",
    description: "Daily check for GDPR/CCPA deletion requests 28+ days old — sends owner notification before the 30-day deadline",
    schedule: "Daily at 8:00 AM UTC",
  },
};

function formatDate(d: string | null | undefined) {
  if (!d) return "Never";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

export default function AdminScheduledJobs() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [registerResult, setRegisterResult] = useState<null | {
    results: Array<{ name: string; status: string; taskUid?: string; nextExecutionAt?: string | null; error?: string }>;
  }>(null);
  const [runJobResult, setRunJobResult] = useState<null | { ok: boolean; jobName: string; result?: Record<string, unknown>; error?: string }>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [daysAgo, setDaysAgo] = useState(11);
  const [backdateResult, setBackdateResult] = useState<null | { success: boolean; pilotActivatedAt?: string; error?: string }>(null);

  const {
    data: statusData,
    isLoading: statusLoading,
    refetch,
    isFetching,
  } = trpc.system.getScheduledJobsStatus.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
    refetchOnWindowFocus: false,
  });

  const registerMutation = trpc.system.registerScheduledJobs.useMutation({
    onSuccess: (data) => {
      setRegisterResult(data);
      refetch();
    },
  });

  const runJobMutation = trpc.devTools.runJob.useMutation({
    onSuccess: (data) => {
      setRunJobResult(data as any);
      setRunningJob(null);
      refetch();
    },
    onError: (err) => {
      setRunJobResult({ ok: false, jobName: runningJob ?? "", error: err.message });
      setRunningJob(null);
    },
  });

  const { data: agenciesData } = trpc.devTools.listAgencies.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const backdateMutation = trpc.devTools.backdatePilot.useMutation({
    onSuccess: (data) => setBackdateResult({ success: true, pilotActivatedAt: data.pilotActivatedAt }),
    onError: (err) => setBackdateResult({ success: false, error: err.message }),
  });

  // ── Auth guard ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.parchment, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: C.sans, color: C.inkLight }}>Loading…</div>
      </div>
    );
  }
  if (!isAuthenticated || user?.role !== "admin") {
    navigate("/dashboard");
    return null;
  }

  const allRegistered = statusData?.allRegistered ?? false;
  const registeredCount = statusData?.registeredCount ?? 0;
  const expectedCount = statusData?.expectedCount ?? 3;

  return (
    <DashboardLayout>
      {/* Header */}


      <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>

        {/* Status banner */}
        <div style={{
          background: allRegistered ? "#E8F5E9" : C.amberPale,
          border: `1px solid ${allRegistered ? "#A5D6A7" : "#F0C040"}`,
          borderRadius: 6, padding: "16px 20px", marginBottom: 32,
          display: "flex", alignItems: "flex-start", gap: 14,
        }}>
          {allRegistered
            ? <CheckCircle size={20} color={C.green} style={{ flexShrink: 0, marginTop: 1 }} />
            : <AlertTriangle size={20} color={C.amber} style={{ flexShrink: 0, marginTop: 1 }} />
          }
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", color: allRegistered ? C.green : "#7A5C00", marginBottom: 4 }}>
              {allRegistered
                ? `All ${expectedCount} scheduled jobs are registered and running`
                : `${registeredCount} of ${expectedCount} jobs registered`
              }
            </div>
            {!allRegistered && (
              <div style={{ fontSize: "0.82rem", color: "#7A5C00", lineHeight: 1.5 }}>
                {registeredCount === 0
                  ? "No jobs are registered yet. Click \"Register All Jobs\" below after publishing the site."
                  : "Some jobs are missing. Click \"Register All Jobs\" to register the remaining ones."
                }
                <br />
                <strong>Note:</strong> Cron jobs only work on the deployed (published) site, not the dev preview.
              </div>
            )}
          </div>
        </div>

        {/* Register button */}
        {!allRegistered && (
          <div style={{ marginBottom: 32 }}>
            <button
              onClick={() => registerMutation.mutate()}
              disabled={registerMutation.isPending}
              style={{
                background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 4,
                padding: "12px 28px", fontFamily: C.sans, fontSize: "0.88rem", fontWeight: 700,
                cursor: registerMutation.isPending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", gap: 8, opacity: registerMutation.isPending ? 0.7 : 1,
                transition: "opacity 150ms",
              }}
            >
              <Zap size={15} />
              {registerMutation.isPending ? "Registering…" : "Register All Jobs"}
            </button>
            <p style={{ marginTop: 8, fontSize: "0.78rem", color: C.inkFaint }}>
              Safe to run multiple times — existing jobs will report an error (already registered), new ones will be created.
            </p>
          </div>
        )}

        {/* Registration result */}
        {registerResult && (
          <div style={{ background: "white", border: `1px solid ${C.rule}`, borderRadius: 6, padding: 20, marginBottom: 32 }}>
            <div style={{ fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 700, color: C.inkDark, marginBottom: 12 }}>
              Registration Result
            </div>
            {registerResult.results.map((r) => (
              <div key={r.name} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.linen}` }}>
                {r.status === "registered"
                  ? <CheckCircle size={15} color={C.green} style={{ marginTop: 1, flexShrink: 0 }} />
                  : <XCircle size={15} color={C.red} style={{ marginTop: 1, flexShrink: 0 }} />
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.82rem", color: C.inkDark }}>
                    {JOB_LABELS[r.name]?.label ?? r.name}
                    {r.status === "registered" && (
                      <span style={{ marginLeft: 8, fontFamily: C.mono, fontSize: "0.7rem", color: C.inkFaint }}>
                        {r.taskUid}
                      </span>
                    )}
                  </div>
                  {r.status === "error" && (
                    <div style={{ fontSize: "0.78rem", color: C.red, marginTop: 2 }}>{r.error}</div>
                  )}
                  {r.nextExecutionAt && (
                    <div style={{ fontSize: "0.78rem", color: C.inkLight, marginTop: 2 }}>
                      Next run: {formatDate(r.nextExecutionAt)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Job cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {statusLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.inkFaint, fontFamily: C.sans, fontSize: "0.85rem" }}>
              Loading job status…
            </div>
          ) : (
            <>
              {/* Registered jobs */}
              {(statusData?.jobs ?? []).map((job) => {
                const meta = JOB_LABELS[job.name];
                return (
                  <div key={job.name} style={{ background: "white", border: `1px solid ${C.rule}`, borderRadius: 6, padding: 20 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.92rem", color: C.inkDark }}>
                            {meta?.label ?? job.name}
                          </span>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            background: job.isEnabled ? "#E8F5E9" : "#FEF3CD",
                            color: job.isEnabled ? C.green : "#7A5C00",
                            fontFamily: C.sans, fontSize: "0.68rem", fontWeight: 700,
                            letterSpacing: "0.07em", textTransform: "uppercase",
                            padding: "3px 9px", borderRadius: 3,
                          }}>
                            {job.isEnabled ? <><CheckCircle size={10} /> Active</> : <><XCircle size={10} /> Paused</>}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: C.inkLight, marginBottom: 10 }}>
                          {meta?.description}
                        </div>
                        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: C.inkMid }}>
                            <Calendar size={12} color={C.inkFaint} />
                            <span style={{ color: C.inkFaint }}>Schedule:</span>
                            <span style={{ fontFamily: C.mono, fontSize: "0.72rem" }}>{meta?.schedule}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: C.inkMid }}>
                            <Clock size={12} color={C.inkFaint} />
                            <span style={{ color: C.inkFaint }}>Last run:</span>
                            <span>{formatDate(job.lastExecutedAt)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.78rem", color: C.inkMid }}>
                            <Play size={12} color={C.inkFaint} />
                            <span style={{ color: C.inkFaint }}>Next run:</span>
                            <span>{formatDate(job.nextExecutionAt)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                        <div style={{ fontFamily: C.mono, fontSize: "0.68rem", color: C.inkFaint }}>
                          {job.taskUid.slice(0, 12)}…
                        </div>
                        <button
                          onClick={() => {
                            setRunningJob(job.name);
                            setRunJobResult(null);
                            runJobMutation.mutate({ jobName: job.name as any });
                          }}
                          disabled={runJobMutation.isPending}
                          style={{
                            background: C.forest, color: "#F0EBE3", border: "none", borderRadius: 3,
                            padding: "6px 14px", fontFamily: C.sans, fontSize: "0.75rem", fontWeight: 700,
                            cursor: runJobMutation.isPending ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: 6,
                            opacity: runJobMutation.isPending && runningJob === job.name ? 0.6 : 1,
                          }}
                        >
                          <Play size={11} />
                          {runJobMutation.isPending && runningJob === job.name ? "Running…" : "Run Now"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Unregistered jobs (expected but not found) */}
              {!allRegistered && (() => {
                const registeredNames = new Set((statusData?.jobs ?? []).map((j) => j.name));
                const missing = Object.entries(JOB_LABELS).filter(([name]) => !registeredNames.has(name));
                return missing.map(([name, meta]) => (
                  <div key={name} style={{ background: "white", border: `1px dashed ${C.rule}`, borderRadius: 6, padding: 20, opacity: 0.65 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <XCircle size={16} color={C.red} style={{ marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: C.inkDark, marginBottom: 4 }}>
                          {meta.label}
                          <span style={{ marginLeft: 10, fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" as const, background: "#FEECEC", color: C.red, padding: "3px 9px", borderRadius: 3 }}>
                            Not Registered
                          </span>
                        </div>
                        <div style={{ fontSize: "0.82rem", color: C.inkLight }}>{meta.description}</div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </>
          )}
        </div>

        {/* Error from status fetch */}
        {statusData?.error && (
          <div style={{ marginTop: 24, background: "#FEECEC", border: `1px solid #F5A0A0`, borderRadius: 6, padding: 16, fontSize: "0.82rem", color: C.red }}>
            <strong>Status fetch error:</strong> {statusData.error}
          </div>
        )}

        {/* Run Now result */}
        {runJobResult && (
          <div style={{
            marginTop: 24, background: runJobResult.ok ? "#E8F5E9" : "#FEECEC",
            border: `1px solid ${runJobResult.ok ? "#A5D6A7" : "#F5A0A0"}`,
            borderRadius: 6, padding: 16,
          }}>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", color: runJobResult.ok ? C.green : C.red, marginBottom: 6 }}>
              {runJobResult.ok ? `✓ ${JOB_LABELS[runJobResult.jobName]?.label ?? runJobResult.jobName} ran successfully` : `✗ Job failed: ${runJobResult.error}`}
            </div>
            {runJobResult.ok && runJobResult.result && (
              <pre style={{ margin: 0, fontFamily: C.mono, fontSize: "0.72rem", color: C.inkMid, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {JSON.stringify(runJobResult.result, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Pilot Lifecycle Test Tool */}
        <div style={{ marginTop: 40, background: "white", border: `1px solid ${C.rule}`, borderRadius: 6, padding: 24 }}>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", color: C.inkDark, marginBottom: 4 }}>Pilot Lifecycle Test Tool</div>
          <div style={{ fontSize: "0.82rem", color: C.inkLight, marginBottom: 20 }}>
            Backdate an agency's pilot start date to simulate being N days in, then run the Pilot Lifecycle job to verify emails fire correctly.
            <strong style={{ color: C.red }}> Admin-only. Do not use on real production accounts.</strong>
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.inkMid, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Agency</div>
              <select
                value={selectedAgencyId ?? ""}
                onChange={(e) => setSelectedAgencyId(e.target.value ? Number(e.target.value) : null)}
                style={{ fontFamily: C.sans, fontSize: "0.82rem", padding: "8px 12px", border: `1px solid ${C.rule}`, borderRadius: 4, background: "white", color: C.inkDark, minWidth: 220 }}
              >
                <option value="">Select agency…</option>
                {(agenciesData ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.agencyName ?? a.name ?? a.email} (ID {a.id}) — {a.accountStatus}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: C.inkMid, marginBottom: 6, textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Days Ago</div>
              <input
                type="number" min={1} max={30} value={daysAgo}
                onChange={(e) => setDaysAgo(Number(e.target.value))}
                style={{ fontFamily: C.mono, fontSize: "0.88rem", padding: "8px 12px", border: `1px solid ${C.rule}`, borderRadius: 4, width: 80, color: C.inkDark }}
              />
            </div>
            <button
              onClick={() => {
                if (!selectedAgencyId) return;
                setBackdateResult(null);
                backdateMutation.mutate({ userId: selectedAgencyId, daysAgo });
              }}
              disabled={!selectedAgencyId || backdateMutation.isPending}
              style={{
                background: C.amber, color: "white", border: "none", borderRadius: 4,
                padding: "9px 20px", fontFamily: C.sans, fontSize: "0.82rem", fontWeight: 700,
                cursor: !selectedAgencyId || backdateMutation.isPending ? "not-allowed" : "pointer",
                opacity: !selectedAgencyId || backdateMutation.isPending ? 0.6 : 1,
              }}
            >
              {backdateMutation.isPending ? "Backdating…" : "Backdate Pilot"}
            </button>
          </div>
          {backdateResult && (
            <div style={{
              background: backdateResult.success ? "#E8F5E9" : "#FEECEC",
              border: `1px solid ${backdateResult.success ? "#A5D6A7" : "#F5A0A0"}`,
              borderRadius: 4, padding: "10px 14px", fontSize: "0.82rem",
              color: backdateResult.success ? C.green : C.red, marginBottom: 12,
            }}>
              {backdateResult.success
                ? `✓ pilotActivatedAt set to ${new Date(backdateResult.pilotActivatedAt!).toLocaleString()} — now click Run Now on Pilot Lifecycle above to trigger emails.`
                : `✗ ${backdateResult.error}`
              }
            </div>
          )}
          <div style={{ fontSize: "0.78rem", color: C.inkFaint, lineHeight: 1.6 }}>
            <strong>How to test:</strong> Select an agency → set Days Ago to 11 → click Backdate Pilot → click Run Now on the Pilot Lifecycle job above → check your inbox for the day-11 warning email.
          </div>
        </div>

        {/* Explanation */}
        <div style={{ marginTop: 40, background: C.linen, border: `1px solid ${C.rule}`, borderRadius: 6, padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: "0.82rem", color: C.inkDark, marginBottom: 8 }}>How this works</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.82rem", color: C.inkMid, lineHeight: 1.8 }}>
            <li>Cron jobs are registered with the Manus scheduler and call back to <code style={{ fontFamily: C.mono, fontSize: "0.78rem", background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 2 }}>/api/scheduled/*</code> on this site daily.</li>
            <li>Jobs only work on the <strong>deployed (published) site</strong> — not the dev sandbox preview.</li>
            <li>After each new deployment (publish), click <strong>Register All Jobs</strong> to ensure they point to the latest version.</li>
            <li>If a job already exists, registration will report an error for that job — that's expected and safe.</li>
          </ul>
        </div>
      </div>
        </DashboardLayout>
  );
}
