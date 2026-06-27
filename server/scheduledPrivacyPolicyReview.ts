import { Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { notifyOwner } from "./_core/notification";

/**
 * Quarterly Privacy Policy review reminder.
 * Fires on the 1st of every 3rd month (March, June, September, December) at 09:00 UTC.
 * Sends an owner notification reminding the team to:
 *  - Review the Privacy Policy for accuracy
 *  - Update the "Last updated" date if any changes were made
 *  - Verify the AI sub-processor list (OpenAI / Manus LLM) is still current
 *  - Check for any new NC or federal privacy regulations
 */
export async function runPrivacyPolicyReview(): Promise<{
  ok: boolean;
  notified: boolean;
  message: string;
}> {
  const reviewDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const delivered = await notifyOwner({
    title: "Quarterly Privacy Policy Review Due",
    content: `This is your quarterly reminder to review the AuditReady Privacy Policy.\n\nReview checklist:\n\n1. Open /privacy on the live site and read through the full policy.\n2. Verify the AI sub-processor section is accurate — confirm whether OpenAI / Manus LLM is still the provider used for document extraction.\n3. Check for any new North Carolina or federal privacy regulations that may require policy updates.\n4. If any changes were made, update the "Last updated" date at the top of PrivacyPolicy.tsx.\n5. Save a checkpoint and redeploy after any edits.\n\nNo changes needed? No action required — this reminder fires automatically every quarter.\n\nTriggered: ${reviewDate}`,
  });

  return {
    ok: true,
    notified: delivered,
    message: delivered
      ? "Privacy Policy review reminder sent to owner."
      : "Reminder could not be delivered — notification service may be temporarily unavailable.",
  };
}

export async function privacyPolicyReviewHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }
    const result = await runPrivacyPolicyReview();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      error: err?.message ?? String(err),
      stack: err?.stack,
      context: { url: req.url, taskUid: "unknown" },
      timestamp: new Date().toISOString(),
    });
  }
}
