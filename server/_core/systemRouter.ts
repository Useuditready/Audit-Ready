import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { createHeartbeatJob, listHeartbeatJobs } from "./heartbeat";
import { runPilotLifecycle } from "../scheduledPilotLifecycle";
import { runCredentialReminders } from "../scheduledReminders";
import { runRetentionCleanup } from "../scheduledRetentionCleanup";
import { runPrivacyPolicyReview } from "../scheduledPrivacyPolicyReview";
import { runDeletionDeadlineAlert } from "../scheduledDeletionDeadlineAlert";
import { runOigBatchCheck } from "../scheduledOigBatchCheck";

/**
 * System-level scheduled jobs that run daily.
 * These are registered once against the deployed (production) URL.
 * Empty userSession = project owner identity, which is correct for
 * system-level jobs not owned by any individual end-user.
 */
const SYSTEM_CRON_JOBS = [
  {
    name: "auditready-pilot-lifecycle",
    cron: "0 0 9 * * *",   // daily 09:00 UTC
    path: "/api/scheduled/pilot-lifecycle",
    description: "Daily pilot lifecycle: day-11/13 warnings, day-14 read_only, day-17 lock",
  },
  {
    name: "auditready-credential-reminders",
    cron: "0 30 9 * * *",  // daily 09:30 UTC
    path: "/api/scheduled/credential-reminders",
    description: "Daily credential expiration email reminders (90/60/30 days)",
  },
  {
    name: "auditready-retention-cleanup",
    cron: "0 0 10 * * *",  // daily 10:00 UTC
    path: "/api/scheduled/retention-cleanup",
    description: "Daily retention cleanup: notify admins of staff eligible for deletion",
  },
  {
    name: "auditready-privacy-policy-review",
    cron: "0 0 9 1 3,6,9,12 *",  // 09:00 UTC on the 1st of Mar, Jun, Sep, Dec
    path: "/api/scheduled/privacy-policy-review",
    description: "Quarterly owner reminder to review and update the Privacy Policy",
  },
  {
    name: "auditready-deletion-deadline-alert",
    cron: "0 0 8 * * *",  // daily 08:00 UTC
    path: "/api/scheduled/deletion-deadline-alert",
    description: "Daily GDPR/CCPA check: notify owner if any deletion request is 28+ days old",
  },
  {
    name: "auditready-oig-batch-check",
    cron: "0 0 6 1 * *",  // 06:00 UTC on the 1st of every month
    path: "/api/scheduled/oig-batch-check",
    description: "Monthly OIG LEIE exclusion screening for all active staff (federal Medicaid requirement)",
  },
] as const;

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * Register all system cron jobs against the deployed site.
   * Uses project-owner identity (empty userSession) so jobs persist
   * independently of any individual user account.
   * Safe to call multiple times — existing jobs with the same name
   * will cause a Forge conflict error which we catch and surface.
   */
  registerScheduledJobs: adminProcedure
    .mutation(async ({ ctx }) => {
      // Use project-owner identity (empty string) for system-level jobs
      const sessionToken = "";
      const results: Array<{
        name: string;
        status: "registered" | "error";
        taskUid?: string;
        nextExecutionAt?: string | null;
        error?: string;
      }> = [];

      for (const job of SYSTEM_CRON_JOBS) {
        try {
          const result = await createHeartbeatJob(
            {
              name: job.name,
              cron: job.cron,
              path: job.path,
              method: "POST",
              description: job.description,
            },
            sessionToken
          );
          results.push({
            name: job.name,
            status: "registered",
            taskUid: result.taskUid,
            nextExecutionAt: result.nextExecutionAt,
          });
        } catch (err: any) {
          results.push({
            name: job.name,
            status: "error",
            error: err?.message ?? String(err),
          });
        }
      }

      return { results };
    }),

  /**
   * List all registered system cron jobs and their current status.
   * Uses project-owner identity to list owner-level jobs.
   */
  getScheduledJobsStatus: adminProcedure
    .query(async () => {
      try {
        const { jobs } = await listHeartbeatJobs("", { pageSize: 50 });
        // Filter to only our system jobs
        const systemJobNames = new Set<string>(SYSTEM_CRON_JOBS.map((j) => j.name));
        const systemJobs = jobs.filter((j) => systemJobNames.has(j.name));
        return {
          jobs: systemJobs.map((j) => ({
            name: j.name,
            isEnabled: j.isEnable,
            cronExpression: j.cronExpression,
            lastExecutedAt: j.lastExecutedAt ?? null,
            nextExecutionAt: j.nextExecutionAt ?? null,
            taskUid: j.taskUid,
          })),
          expectedCount: SYSTEM_CRON_JOBS.length,
          registeredCount: systemJobs.length,
          allRegistered: systemJobs.length === SYSTEM_CRON_JOBS.length,
        };
      } catch (err: any) {
        return {
          jobs: [],
          expectedCount: SYSTEM_CRON_JOBS.length,
          registeredCount: 0,
          allRegistered: false,
          error: err?.message ?? String(err),
        };
      }
    }),

  /**
   * Admin "Run Now" — manually trigger a scheduled job without cron auth.
   * Useful for testing after deployment or verifying email templates.
   * Admin-only; never exposed to regular users.
   */
  runJob: adminProcedure
    .input(
      z.object({
        jobName: z.enum([
          "auditready-pilot-lifecycle",
          "auditready-credential-reminders",
          "auditready-retention-cleanup",
          "auditready-privacy-policy-review",
          "auditready-deletion-deadline-alert",
          "auditready-oig-batch-check",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const startedAt = new Date().toISOString();
      try {
        let result: Record<string, unknown>;
        if (input.jobName === "auditready-pilot-lifecycle") {
          result = await runPilotLifecycle() as Record<string, unknown>;
        } else if (input.jobName === "auditready-credential-reminders") {
          result = await runCredentialReminders() as Record<string, unknown>;
        } else if (input.jobName === "auditready-retention-cleanup") {
          result = await runRetentionCleanup() as Record<string, unknown>;
        } else if (input.jobName === "auditready-deletion-deadline-alert") {
          result = await runDeletionDeadlineAlert() as Record<string, unknown>;
        } else if (input.jobName === "auditready-oig-batch-check") {
          result = await runOigBatchCheck() as Record<string, unknown>;
        } else {
          result = await runPrivacyPolicyReview() as Record<string, unknown>;
        }
        return {
          ok: true,
          jobName: input.jobName,
          startedAt,
          completedAt: new Date().toISOString(),
          result,
        };
      } catch (err: any) {
        return {
          ok: false,
          jobName: input.jobName,
          startedAt,
          completedAt: new Date().toISOString(),
          error: err?.message ?? String(err),
        };
      }
    }),
});
