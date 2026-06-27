/**
 * Email helpers for AuditReady credential expiration reminders.
 * Uses Resend. No patient data or PHI is included in any email.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.APP_URL || "https://www.useauditready.com";

export type ReminderCredential = {
  staffFirstName: string;
  staffLastName: string;
  credentialType: string;
  expirationDate: string; // "YYYY-MM-DD"
  daysUntilExpiry: number;
};

function formatDate(d: string): string {
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${parseInt(day)}, ${y}`;
}

function urgencyLabel(days: number): string {
  if (days <= 30) return "URGENT — expires in 30 days";
  if (days <= 60) return "ACTION NEEDED — expires in 60 days";
  return "HEADS UP — expires in 90 days";
}

function buildEmailHtml(
  agencyName: string,
  credentials: ReminderCredential[]
): string {
  const rows = credentials
    .map(
      (c) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E2D9CE;font-family:'DM Sans',sans-serif;font-size:13px;color:#1C1917;">
          ${c.staffFirstName} ${c.staffLastName}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2D9CE;font-family:'DM Sans',sans-serif;font-size:13px;color:#1C1917;">
          ${c.credentialType}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2D9CE;font-family:'DM Sans',sans-serif;font-size:13px;color:#1C1917;">
          ${formatDate(c.expirationDate)}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2D9CE;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;color:${c.daysUntilExpiry <= 7 ? "#B84040" : c.daysUntilExpiry <= 30 ? "#C4862A" : "#2A5240"};">
          ${c.daysUntilExpiry}d
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FDFAF6;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1D3D2F;padding:24px 32px;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,235,227,0.6);">AuditReady</p>
            <h1 style="margin:6px 0 0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">
              Credential Expiration Alert
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 32px;">
            <p style="margin:0 0 6px;font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6E64;">
              Agency: <strong style="color:#1C1917;">${agencyName}</strong>
            </p>
            <p style="margin:0 0 24px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.6;">
              The following staff credentials require your attention. Please log in to AuditReady to review and take action before they expire.
            </p>
            <!-- Table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2D9CE;border-radius:3px;border-collapse:collapse;">
              <thead>
                <tr style="background:#EFE9E0;">
                  <th style="padding:10px 12px;text-align:left;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#7A6E64;font-weight:600;">Staff Member</th>
                  <th style="padding:10px 12px;text-align:left;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#7A6E64;font-weight:600;">Credential</th>
                  <th style="padding:10px 12px;text-align:left;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#7A6E64;font-weight:600;">Expires</th>
                  <th style="padding:10px 12px;text-align:left;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#7A6E64;font-weight:600;">Days Left</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <!-- CTA -->
            <div style="margin-top:28px;text-align:center;">
              <a href="${APP_URL}/credentials"
                 style="display:inline-block;background:#1D3D2F;color:#F0EBE3;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:3px;letter-spacing:0.04em;">
                Review Credentials →
              </a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#EFE9E0;padding:16px 32px;border-top:1px solid #E2D9CE;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;color:#A89880;line-height:1.7;">
              This is an automated reminder from AuditReady. No patient data or PHI is included in this email.<br>
              You are receiving this because you are the account administrator for your agency.<br>
              To stop receiving reminders, contact <a href="mailto:support@useauditready.com" style="color:#5A8C6E;">support@useauditready.com</a>.<br>
              <a href="${APP_URL}/privacy" style="color:#A89880;">Privacy Policy</a> &nbsp;·&nbsp; <a href="${APP_URL}/terms" style="color:#A89880;">Terms of Service</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendCredentialReminderEmail({
  toEmail,
  agencyName,
  credentials,
  daysBeforeExpiry,
}: {
  toEmail: string;
  agencyName: string;
  credentials: ReminderCredential[];
  daysBeforeExpiry: number;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email send");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const subject = `[AuditReady] ${credentials.length} credential${credentials.length !== 1 ? "s" : ""} expiring in ${daysBeforeExpiry} days — ${agencyName}`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: "support@useauditready.com",
      subject,
      html: buildEmailHtml(agencyName, credentials),
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[email] Unexpected error:", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ── Retention Cleanup Email ────────────────────────────────────
export type EligibleStaffRecord = {
  id: number;
  firstName: string;
  lastName: string;
  inactivatedAt: Date;
  retentionExpiresAt: Date;
};

function buildRetentionEmailHtml(agencyName: string, staffList: EligibleStaffRecord[]): string {
  const rows = staffList
    .map(
      (s) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #E2D9CE;font-family:'DM Sans',sans-serif;font-size:13px;color:#1C1917;">
          ${s.firstName} ${s.lastName}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2D9CE;font-family:'DM Sans',sans-serif;font-size:13px;color:#1C1917;">
          ${formatDate(s.inactivatedAt.toISOString().split("T")[0])}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #E2D9CE;font-family:'DM Sans',sans-serif;font-size:13px;color:#3A8C5C;font-weight:700;">
          ${formatDate(s.retentionExpiresAt.toISOString().split("T")[0])}
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FDFAF6;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <tr><td style="background:#1D3D2F;padding:24px 32px;">
          <span style="font-family:'DM Sans',sans-serif;font-size:18px;font-weight:700;color:#F0EBE3;">AuditReady</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="font-family:Georgia,serif;font-size:22px;color:#1C1917;margin:0 0 12px 0;">Staff Records Eligible for Deletion</h2>
          <p style="font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.6;margin:0 0 24px 0;">
            Hi ${agencyName}, the following inactive staff members have passed the 2-year retention period. Their records are now eligible for permanent deletion. No action is required — records remain until you choose to delete them.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
            <thead>
              <tr style="background:#EFE9E0;">
                <th style="padding:10px 12px;text-align:left;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7A6E64;">Staff Member</th>
                <th style="padding:10px 12px;text-align:left;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7A6E64;">Inactivated</th>
                <th style="padding:10px 12px;text-align:left;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7A6E64;">Eligible Since</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6E64;margin:24px 0 0 0;line-height:1.6;">
            To delete these records, visit your <a href="${APP_URL}/staff" style="color:#1D3D2F;">Staff Directory</a> and filter by Inactive status.
          </p>
        </td></tr>
        <tr><td style="background:#EFE9E0;padding:16px 32px;border-top:1px solid #E2D9CE;">
          <p style="font-family:'DM Sans',sans-serif;font-size:11px;color:#A89880;margin:0;">
            AuditReady · Staff credential compliance for NC behavioral health agencies · No PHI collected
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendRetentionCleanupEmail({
  toEmail,
  agencyName,
  staffList,
}: {
  toEmail: string;
  agencyName: string;
  staffList: EligibleStaffRecord[];
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping retention cleanup email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  const subject = `[AuditReady] ${staffList.length} staff record${staffList.length !== 1 ? "s" : ""} eligible for deletion — ${agencyName}`;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject,
      html: buildRetentionEmailHtml(agencyName, staffList),
    });
    if (error) {
      console.error("[email] Resend retention error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[email] Unexpected retention error:", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

// ── Email Verification ─────────────────────────────────────────
export async function sendEmailVerificationEmail({
  toEmail,
  name,
  verifyUrl,
}: {
  toEmail: string;
  name: string;
  verifyUrl: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping verification email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FDFAF6;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#1A1A1A;padding:24px 32px;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,235,227,0.5);">AuditReady</p>
            <h1 style="margin:6px 0 0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">
              Verify Your Email Address
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:15px;color:#1C1917;line-height:1.65;">
              Hi ${name || "there"},
            </p>
            <p style="margin:0 0 24px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.65;">
              Thank you for creating your AuditReady account. Please verify your email address to activate your account and access your compliance dashboard.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${verifyUrl}"
                 style="display:inline-block;background:#1A1A1A;color:#F0EBE3;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:3px;letter-spacing:0.04em;">
                Verify Email Address →
              </a>
            </div>
            <p style="margin:24px 0 0;font-family:'DM Sans',sans-serif;font-size:12px;color:#A89880;line-height:1.65;">
              This link expires in 24 hours. If you did not create an AuditReady account, you can safely ignore this email.
            </p>
            <p style="margin:8px 0 0;font-family:'DM Sans',sans-serif;font-size:12px;color:#A89880;line-height:1.65;">
              If the button above doesn't work, copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color:#3A4A2E;word-break:break-all;">${verifyUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#EFE9E0;padding:16px 32px;border-top:1px solid #E2D9CE;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;color:#A89880;line-height:1.7;">
              AuditReady by Vibemo Group · Staff credential compliance for NC behavioral health agencies<br>
              <a href="${APP_URL}/privacy" style="color:#A89880;">Privacy Policy</a> &nbsp;·&nbsp;
              <a href="${APP_URL}/terms" style="color:#A89880;">Terms of Service</a> &nbsp;·&nbsp;
              Questions? <a href="mailto:support@useauditready.com" style="color:#A89880;">support@useauditready.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: "[AuditReady] Please verify your email address",
      html,
    });
    if (error) {
      console.error("[email] Verification email error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("[email] Unexpected verification email error:", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Sends a demo request notification email to the owner (support@useauditready.com).
 */
export async function sendOwnerDemoNotification({
  name,
  email,
  agencyName,
  agencySize,
  message,
}: {
  name: string;
  email: string;
  agencyName: string;
  agencySize?: string;
  message?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping demo notification");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f7f4;border-radius:8px;">
      <h2 style="color:#1D3D2F;margin-top:0;">🎉 New Demo Request</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#666;width:140px;">Name</td><td style="padding:8px 0;font-weight:600;color:#1C1917;">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#3D6B52;">${email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#666;">Agency</td><td style="padding:8px 0;font-weight:600;color:#1C1917;">${agencyName}</td></tr>
        ${agencySize ? `<tr><td style="padding:8px 0;color:#666;">Staff Size</td><td style="padding:8px 0;color:#1C1917;">${agencySize}</td></tr>` : ""}
        ${message ? `<tr><td style="padding:8px 0;color:#666;vertical-align:top;">Message</td><td style="padding:8px 0;color:#1C1917;">${message}</td></tr>` : ""}
      </table>
      <div style="margin-top:20px;padding:12px 16px;background:#fff;border-radius:6px;border:1px solid #e2d9ce;">
        <p style="margin:0;font-size:13px;color:#666;">Reply directly to <strong>${email}</strong> to schedule the demo.</p>
      </div>
      <p style="margin-top:16px;font-size:11px;color:#aaa;">Sent by AuditReady · Vibemo Group</p>
    </div>
  `;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: "support@useauditready.com",
      replyTo: email,
      subject: `New Demo Request: ${agencyName} (${name})`,
      html,
    });
    if (error) {
      console.error("[email] Demo notification error:", error);
      return { success: false, error: String(error) };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Demo notification exception:", err);
    return { success: false, error: String(err) };
  }
}

// ── Pilot Lifecycle Emails ────────────────────────────────────

const emailFooter = `
  <tr>
    <td style="background:#EFE9E0;padding:16px 32px;border-top:1px solid #E2D9CE;">
      <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;color:#A89880;line-height:1.7;">
        AuditReady by Vibemo Group · Staff credential compliance for behavioral health agencies<br>
        <a href="${APP_URL}/privacy" style="color:#A89880;">Privacy Policy</a> &nbsp;·&nbsp;
        <a href="${APP_URL}/terms" style="color:#A89880;">Terms of Service</a> &nbsp;·&nbsp;
        Questions? <a href="mailto:support@useauditready.com" style="color:#A89880;">support@useauditready.com</a>
      </p>
    </td>
  </tr>
`;

/**
 * Sends the pilot activation email to the agency.
 * Triggered when admin manually approves a pilot request.
 */
export async function sendPilotActivationEmail({
  toEmail,
  name,
  agencyName,
}: {
  toEmail: string;
  name: string;
  agencyName: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping pilot activation email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const loginUrl = `${APP_URL}/login`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your AuditReady Pilot is Active</title></head>
<body style="margin:0;padding:0;background:#F7F3ED;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#1D3D2F;padding:28px 32px;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:22px;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">AuditReady</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 24px;">
            <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:700;color:#1C1917;line-height:1.2;">
              Your 14-day pilot is active, ${name}.
            </h1>
            <p style="margin:0 0 20px;font-family:'DM Sans',sans-serif;font-size:15px;color:#5A5048;line-height:1.65;">
              Welcome to AuditReady. Your free 14-day pilot for <strong>${agencyName}</strong> has been approved and activated. You can now log in and start managing your staff credentials.
            </p>
            <p style="margin:0 0 28px;font-family:'DM Sans',sans-serif;font-size:14px;color:#7A6E64;line-height:1.65;">
              Your pilot gives you full access to all features — credential tracking, expiration reminders, AI document upload, license verification, and audit-ready exports.
            </p>
            <a href="${loginUrl}" style="display:inline-block;background:#1D3D2F;color:#F0EBE3;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:3px;letter-spacing:0.01em;">
              Log In to AuditReady →
            </a>
            <p style="margin:28px 0 0;font-family:'DM Sans',sans-serif;font-size:13px;color:#A89880;line-height:1.65;">
              Your pilot runs for 14 days. We'll send you a reminder on Day 11 and Day 13 before it expires. After the pilot, you can subscribe to continue with full access.
            </p>
          </td>
        </tr>
        ${emailFooter}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: "support@useauditready.com",
      subject: "Your AuditReady 14-day pilot is now active",
      html,
    });
    if (error) {
      console.error("[email] Pilot activation email error:", error);
      return { success: false, error: String(error) };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Pilot activation email exception:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Sends a pilot warning email (Day 11 or Day 13).
 */
export async function sendPilotWarningEmail({
  toEmail,
  name,
  agencyName,
  daysLeft,
  warningType,
}: {
  toEmail: string;
  name: string;
  agencyName: string;
  daysLeft: number;
  warningType: "day11" | "day13";
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping pilot warning email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const subscribeUrl = `${APP_URL}/pricing`;
  const urgencyColor = warningType === "day13" ? "#B84040" : "#C4862A";
  const subjectLine = warningType === "day13"
    ? `⚠️ Your AuditReady pilot ends tomorrow`
    : `Your AuditReady pilot ends in ${daysLeft} days`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Pilot Ending Soon</title></head>
<body style="margin:0;padding:0;background:#F7F3ED;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#1D3D2F;padding:28px 32px;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:22px;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">AuditReady</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 24px;">
            <p style="margin:0 0 8px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${urgencyColor};">
              ${warningType === "day13" ? "FINAL REMINDER" : "PILOT REMINDER"}
            </p>
            <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:700;color:#1C1917;line-height:1.2;">
              Your pilot ends in ${daysLeft} day${daysLeft > 1 ? "s" : ""}, ${name}.
            </h1>
            <p style="margin:0 0 20px;font-family:'DM Sans',sans-serif;font-size:15px;color:#5A5048;line-height:1.65;">
              Your 14-day free pilot for <strong>${agencyName}</strong> is ending soon. Subscribe now to keep full access to your credential dashboard, expiration reminders, and audit-ready exports.
            </p>
            <p style="margin:0 0 28px;font-family:'DM Sans',sans-serif;font-size:14px;color:#7A6E64;line-height:1.65;">
              After your pilot ends, your account will enter a 3-day read-only grace period. Your data is safe — but you won't be able to add or edit staff or credentials until you subscribe.
            </p>
            <a href="${subscribeUrl}" style="display:inline-block;background:#1D3D2F;color:#F0EBE3;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:3px;letter-spacing:0.01em;">
              Subscribe to Continue →
            </a>
            <p style="margin:20px 0 0;font-family:'DM Sans',sans-serif;font-size:13px;color:#A89880;">
              Questions? Reply to this email or contact <a href="mailto:support@useauditready.com" style="color:#3D6B52;">support@useauditready.com</a>
            </p>
          </td>
        </tr>
        ${emailFooter}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: "support@useauditready.com",
      subject: subjectLine,
      html,
    });
    if (error) {
      console.error("[email] Pilot warning email error:", error);
      return { success: false, error: String(error) };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Pilot warning email exception:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Sends the pilot expired email (Day 14 — account moves to read-only).
 */
export async function sendPilotExpiredEmail({
  toEmail,
  name,
  agencyName,
}: {
  toEmail: string;
  name: string;
  agencyName: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping pilot expired email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const subscribeUrl = `${APP_URL}/pricing`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Pilot Ended</title></head>
<body style="margin:0;padding:0;background:#F7F3ED;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <tr>
          <td style="background:#1D3D2F;padding:28px 32px;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:22px;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">AuditReady</p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 24px;">
            <h1 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;font-weight:700;color:#1C1917;line-height:1.2;">
              Your 14-day pilot has ended.
            </h1>
            <p style="margin:0 0 20px;font-family:'DM Sans',sans-serif;font-size:15px;color:#5A5048;line-height:1.65;">
              Hi ${name}, your free pilot for <strong>${agencyName}</strong> has ended. Your account is now in read-only mode — you can still view your dashboard and records, but you won't be able to add or edit staff or credentials.
            </p>
            <p style="margin:0 0 8px;font-family:'DM Sans',sans-serif;font-size:14px;color:#7A6E64;line-height:1.65;">
              <strong>Your data is safe.</strong> Subscribe within 3 days to restore full access and pick up right where you left off.
            </p>
            <p style="margin:0 0 28px;font-family:'DM Sans',sans-serif;font-size:14px;color:#7A6E64;line-height:1.65;">
              After the 3-day grace period, your account will be locked until you subscribe.
            </p>
            <a href="${subscribeUrl}" style="display:inline-block;background:#1D3D2F;color:#F0EBE3;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:3px;letter-spacing:0.01em;">
              Subscribe Now →
            </a>
            <p style="margin:20px 0 0;font-family:'DM Sans',sans-serif;font-size:13px;color:#A89880;">
              Need help choosing a plan? Contact <a href="mailto:support@useauditready.com" style="color:#3D6B52;">support@useauditready.com</a>
            </p>
          </td>
        </tr>
        ${emailFooter}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: "support@useauditready.com",
      subject: "Your AuditReady pilot has ended — subscribe to restore access",
      html,
    });
    if (error) {
      console.error("[email] Pilot expired email error:", error);
      return { success: false, error: String(error) };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Pilot expired email exception:", err);
    return { success: false, error: String(err) };
  }
}

// ── Owner Subscription Notification ──────────────────────────
/**
 * Notifies the owner when a new agency subscribes to AuditReady.
 * Sent to the owner's email (support@useauditready.com) via Resend.
 */
export async function sendOwnerSubscriptionNotification({
  userId,
  email,
  name,
  agencyName,
  plan,
}: {
  userId: number;
  email?: string | null;
  name?: string | null;
  agencyName?: string | null;
  plan: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping subscription notification");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f7f4;border-radius:8px;">
      <h2 style="color:#1D3D2F;margin-top:0;">&#x1F389; New Subscription &#x2014; ${planLabel} Plan</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#666;width:140px;">User ID</td><td style="padding:8px 0;font-family:monospace;color:#1C1917;">${userId}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Name</td><td style="padding:8px 0;font-weight:600;color:#1C1917;">${name ?? "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${email ?? ""}" style="color:#3D6B52;">${email ?? "—"}</a></td></tr>
        <tr><td style="padding:8px 0;color:#666;">Agency</td><td style="padding:8px 0;font-weight:600;color:#1C1917;">${agencyName ?? "—"}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Plan</td><td style="padding:8px 0;font-weight:600;color:#C4862A;">${planLabel}</td></tr>
      </table>
      <div style="margin-top:20px;padding:12px 16px;background:#fff;border-radius:6px;border:1px solid #e2d9ce;">
        <p style="margin:0;font-size:13px;color:#666;">Account has been automatically unlocked and set to <strong>subscribed</strong> status.</p>
      </div>
      <p style="margin-top:16px;font-size:11px;color:#aaa;">Sent by AuditReady &#xB7; Vibemo Group</p>
    </div>
  `;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: "support@useauditready.com",
      subject: `New Subscription: ${agencyName ?? name ?? "Unknown"} — ${planLabel} Plan`,
      html,
    });
    if (error) {
      console.error("[email] Subscription notification error:", error);
      return { success: false, error: String(error) };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Subscription notification exception:", err);
    return { success: false, error: String(err) };
  }
}

// ── Admin Notification Emails ─────────────────────────────────

const ADMIN_EMAIL = "support@useauditready.com";

function adminEmailWrapper(title: string, bodyHtml: string): string {
  return `
    <div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:24px;background:#f9f7f4;border-radius:8px;">
      <div style="border-left:4px solid #1D3D2F;padding-left:16px;margin-bottom:20px;">
        <h2 style="color:#1D3D2F;margin:0;font-size:18px;">${title}</h2>
      </div>
      ${bodyHtml}
      <p style="margin-top:20px;font-size:11px;color:#aaa;border-top:1px solid #e2d9ce;padding-top:12px;">
        AuditReady &middot; Vibemo Group &middot; Admin Notification
      </p>
    </div>`;
}

function tableRow(label: string, value: string): string {
  return `<tr><td style="padding:7px 0;color:#666;width:160px;font-size:13px;">${label}</td><td style="padding:7px 0;font-weight:600;color:#1C1917;font-size:13px;">${value}</td></tr>`;
}

export async function sendAdminAgencySignupNotification(data: {
  agencyId: number;
  name: string | null;
  email: string | null;
  agencyName: string | null;
  acquisitionSource: string;
  repCode?: string | null;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const sourceLabel = data.acquisitionSource === "rep" ? `Rep (${data.repCode ?? "unknown"})` : "Direct";
  const html = adminEmailWrapper("New Agency Signup", `
    <table style="width:100%;border-collapse:collapse;">
      ${tableRow("Agency", data.agencyName ?? "—")}
      ${tableRow("Name", data.name ?? "—")}
      ${tableRow("Email", data.email ?? "—")}
      ${tableRow("Source", sourceLabel)}
      ${tableRow("User ID", String(data.agencyId))}
    </table>`);
  try {
    await resend.emails.send({ from: FROM, to: ADMIN_EMAIL, subject: `New Signup: ${data.agencyName ?? data.name ?? "Unknown Agency"}`, html });
    return { success: true };
  } catch { return { success: false }; }
}

export async function sendAdminSetupFeePaidNotification(data: {
  agencyId: number;
  name: string | null;
  email: string | null;
  agencyName: string | null;
  plan: string;
  amountCents: number;
  acquisitionSource: string;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const amount = `$${(data.amountCents / 100).toFixed(2)}`;
  const html = adminEmailWrapper("Setup Fee Received", `
    <table style="width:100%;border-collapse:collapse;">
      ${tableRow("Agency", data.agencyName ?? "—")}
      ${tableRow("Plan", data.plan.charAt(0).toUpperCase() + data.plan.slice(1))}
      ${tableRow("Amount", amount)}
      ${tableRow("Source", data.acquisitionSource === "rep" ? "Rep-attributed" : "Direct")}
      ${tableRow("Email", data.email ?? "—")}
    </table>`);
  try {
    await resend.emails.send({ from: FROM, to: ADMIN_EMAIL, subject: `Setup Fee Paid: ${data.agencyName ?? "Unknown"} — ${amount}`, html });
    return { success: true };
  } catch { return { success: false }; }
}

export async function sendAdminCommissionEarnedNotification(data: {
  repName: string;
  repEmail: string;
  agencyName: string | null;
  plan: string;
  commissionCents: number;
  repCode: string;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const commission = `$${(data.commissionCents / 100).toFixed(2)}`;
  const html = adminEmailWrapper("Commission Earned", `
    <table style="width:100%;border-collapse:collapse;">
      ${tableRow("Rep", data.repName)}
      ${tableRow("Rep Code", data.repCode)}
      ${tableRow("Agency", data.agencyName ?? "—")}
      ${tableRow("Plan", data.plan.charAt(0).toUpperCase() + data.plan.slice(1))}
      ${tableRow("Commission", commission)}
    </table>
    <p style="font-size:12px;color:#666;margin-top:12px;">Commission status: <strong>Owed</strong>. Mark as paid in the Sales &amp; Attribution admin panel.</p>`);
  try {
    await resend.emails.send({ from: FROM, to: ADMIN_EMAIL, subject: `Commission Earned: ${data.repName} — ${commission}`, html });
    return { success: true };
  } catch { return { success: false }; }
}

export async function sendAdminSubscriptionFailedNotification(data: {
  agencyId: number;
  name: string | null;
  email: string | null;
  agencyName: string | null;
  plan: string;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const html = adminEmailWrapper("⚠️ Subscription Payment Failed", `
    <table style="width:100%;border-collapse:collapse;">
      ${tableRow("Agency", data.agencyName ?? "—")}
      ${tableRow("Plan", data.plan.charAt(0).toUpperCase() + data.plan.slice(1))}
      ${tableRow("Email", data.email ?? "—")}
      ${tableRow("User ID", String(data.agencyId))}
    </table>
    <p style="font-size:12px;color:#B84040;margin-top:12px;">Stripe will retry automatically. Agency access may be restricted if payment continues to fail.</p>`);
  try {
    await resend.emails.send({ from: FROM, to: ADMIN_EMAIL, subject: `Payment Failed: ${data.agencyName ?? "Unknown Agency"}`, html });
    return { success: true };
  } catch { return { success: false }; }
}

export async function sendAdminSubscriptionCancelledNotification(data: {
  agencyId: number;
  name: string | null;
  email: string | null;
  agencyName: string | null;
  plan: string;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const html = adminEmailWrapper("Subscription Cancelled", `
    <table style="width:100%;border-collapse:collapse;">
      ${tableRow("Agency", data.agencyName ?? "—")}
      ${tableRow("Plan", data.plan.charAt(0).toUpperCase() + data.plan.slice(1))}
      ${tableRow("Email", data.email ?? "—")}
      ${tableRow("User ID", String(data.agencyId))}
    </table>
    <p style="font-size:12px;color:#666;margin-top:12px;">Access will remain active through the end of the current billing period.</p>`);
  try {
    await resend.emails.send({ from: FROM, to: ADMIN_EMAIL, subject: `Subscription Cancelled: ${data.agencyName ?? "Unknown Agency"}`, html });
    return { success: true };
  } catch { return { success: false }; }
}

export async function sendAdminPilotExpiredNotification(data: {
  agencyId: number;
  name: string | null;
  email: string | null;
  agencyName: string | null;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const html = adminEmailWrapper("Pilot Expired — No Subscription", `
    <table style="width:100%;border-collapse:collapse;">
      ${tableRow("Agency", data.agencyName ?? "—")}
      ${tableRow("Name", data.name ?? "—")}
      ${tableRow("Email", data.email ?? "—")}
      ${tableRow("User ID", String(data.agencyId))}
    </table>
    <p style="font-size:12px;color:#666;margin-top:12px;">Account is now locked. Agency has been notified via email.</p>`);
  try {
    await resend.emails.send({ from: FROM, to: ADMIN_EMAIL, subject: `Pilot Expired: ${data.agencyName ?? "Unknown Agency"}`, html });
    return { success: true };
  } catch { return { success: false }; }
}

// ── Sales Rep Commission Email ────────────────────────────────

export async function sendRepCommissionEarnedEmail(data: {
  repName: string;
  repEmail: string;
  agencyName: string | null;
  plan: string;
  setupFeeCents: number;
  commissionCents: number;
  repCode: string;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const setupFee = `$${(data.setupFeeCents / 100).toFixed(2)}`;
  const commission = `$${(data.commissionCents / 100).toFixed(2)}`;
  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f7f4;border-radius:8px;">
      <div style="border-left:4px solid #C4862A;padding-left:16px;margin-bottom:20px;">
        <h2 style="color:#1D3D2F;margin:0;font-size:18px;">You earned a new setup commission</h2>
        <p style="color:#5A5048;margin:6px 0 0;font-size:14px;">Hi ${data.repName} — a new agency signed up using your rep code.</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        ${tableRow("Agency", data.agencyName ?? "—")}
        ${tableRow("Subscription Plan", planLabel)}
        ${tableRow("Setup Fee Paid", setupFee)}
        ${tableRow("Your Commission", commission)}
        ${tableRow("Commission Status", "Owed — pending payment")}
        ${tableRow("Your Rep Code", data.repCode)}
      </table>
      <div style="margin-top:20px;padding:12px 16px;background:#fff;border-radius:6px;border:1px solid #e2d9ce;">
        <p style="margin:0;font-size:13px;color:#5A5048;">Commission payments are processed by Vibemo Group. You will be contacted when payment is issued.</p>
      </div>
      <p style="margin-top:16px;font-size:11px;color:#aaa;border-top:1px solid #e2d9ce;padding-top:12px;">
        AuditReady &middot; Vibemo Group &middot; Sales Commission Notification
      </p>
    </div>`;
  try {
    await resend.emails.send({ from: FROM, to: data.repEmail, subject: `Commission Earned: ${data.agencyName ?? "New Agency"} — ${commission}`, html });
    return { success: true };
  } catch { return { success: false }; }
}

// ── Agency Notification Emails ────────────────────────────────

export async function sendAgencyPaymentFailedEmail(data: {
  agencyEmail: string;
  agencyName: string | null;
  plan: string;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f7f4;border-radius:8px;">
      <h2 style="color:#B84040;margin-top:0;">Payment Issue — Action Required</h2>
      <p style="color:#5A5048;font-size:14px;line-height:1.6;">
        We were unable to process your most recent payment for your <strong>${planLabel}</strong> subscription.
        Stripe will retry automatically. To avoid any interruption to your access, please update your payment method.
      </p>
      <div style="margin:20px 0;">
        <a href="${APP_URL}/billing" style="display:inline-block;padding:12px 24px;background:#1D3D2F;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;">
          Update Payment Method
        </a>
      </div>
      <p style="font-size:12px;color:#aaa;">If you have questions, contact us at support@useauditready.com.</p>
      <p style="margin-top:16px;font-size:11px;color:#aaa;border-top:1px solid #e2d9ce;padding-top:12px;">AuditReady &middot; Vibemo Group</p>
    </div>`;
  try {
    await resend.emails.send({ from: FROM, to: data.agencyEmail, replyTo: "support@useauditready.com", subject: "Action Required: Payment Issue with Your AuditReady Subscription", html });
    return { success: true };
  } catch { return { success: false }; }
}

export async function sendAgencySubscriptionRenewalEmail(data: {
  agencyEmail: string;
  agencyName: string | null;
  plan: string;
  nextBillingDate: string;
  amountCents: number;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  const amount = `$${(data.amountCents / 100).toFixed(2)}`;
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f7f4;border-radius:8px;">
      <h2 style="color:#1D3D2F;margin-top:0;">Subscription Renewed</h2>
      <p style="color:#5A5048;font-size:14px;line-height:1.6;">
        Your <strong>${planLabel}</strong> subscription has been renewed. Your next billing date is <strong>${data.nextBillingDate}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        ${tableRow("Plan", planLabel)}
        ${tableRow("Amount", amount)}
        ${tableRow("Next Billing", data.nextBillingDate)}
      </table>
      <a href="${APP_URL}/billing" style="display:inline-block;padding:10px 20px;background:#1D3D2F;color:#fff;text-decoration:none;border-radius:4px;font-size:13px;">
        View Billing Details
      </a>
      <p style="margin-top:16px;font-size:11px;color:#aaa;border-top:1px solid #e2d9ce;padding-top:12px;">AuditReady &middot; Vibemo Group</p>
    </div>`;
  try {
    await resend.emails.send({ from: FROM, to: data.agencyEmail, replyTo: "support@useauditready.com", subject: `Subscription Renewed — ${planLabel} Plan`, html });
    return { success: true };
  } catch { return { success: false }; }
}

export async function sendAgencyPilotEndingEmail(data: {
  agencyEmail: string;
  agencyName: string | null;
  daysRemaining: number;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const urgency = data.daysRemaining <= 3 ? "Your pilot ends very soon" : `Your pilot ends in ${data.daysRemaining} days`;
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f7f4;border-radius:8px;">
      <h2 style="color:#C4862A;margin-top:0;">${urgency}</h2>
      <p style="color:#5A5048;font-size:14px;line-height:1.6;">
        Your AuditReady free pilot is ending soon. Subscribe now to keep your credential tracking, staff records, and expiration reminders active without interruption.
      </p>
      <div style="margin:20px 0;">
        <a href="${APP_URL}/pricing" style="display:inline-block;padding:12px 24px;background:#1D3D2F;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;">
          View Plans &amp; Subscribe
        </a>
      </div>
      <p style="font-size:12px;color:#aaa;">Questions? Contact us at support@useauditready.com.</p>
      <p style="margin-top:16px;font-size:11px;color:#aaa;border-top:1px solid #e2d9ce;padding-top:12px;">AuditReady &middot; Vibemo Group</p>
    </div>`;
  try {
    await resend.emails.send({ from: FROM, to: data.agencyEmail, replyTo: "support@useauditready.com", subject: `${urgency} — Subscribe to Keep Access`, html });
    return { success: true };
  } catch { return { success: false }; }
}

export async function sendAiQuotaUpgradeEmail(data: {
  agencyEmail: string;
  agencyName: string | null;
  plan: string;
  used: number;
  limit: number;
  resetDate: string | null;
}): Promise<{ success: boolean }> {
  if (!process.env.RESEND_API_KEY) return { success: false };
  const planLabel = data.plan === "pilot" ? "Free Pilot" : data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
  const resetNote = data.resetDate
    ? `Your question limit will reset on ${new Date(data.resetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`
    : "Your trial AI question limit has been reached.";
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f7f4;border-radius:8px;">
      <h2 style="color:#1D3D2F;margin-top:0;">You've reached your AI question limit</h2>
      <p style="color:#5A5048;font-size:14px;line-height:1.6;">
        You've used all <strong>${data.limit} AI questions</strong> included in your <strong>${planLabel}</strong> plan for this period.
        ${resetNote}
      </p>
      <p style="color:#5A5048;font-size:14px;line-height:1.6;">
        To continue using the AI Compliance Assistant without waiting for your limit to reset, consider upgrading your plan.
      </p>
      <div style="margin:20px 0;">
        <a href="${APP_URL}/pricing" style="display:inline-block;padding:12px 24px;background:#1D3D2F;color:#fff;text-decoration:none;border-radius:4px;font-size:14px;font-weight:600;">
          View Plans
        </a>
      </div>
      <p style="font-size:12px;color:#888;line-height:1.5;">
        The AI Compliance Assistant is for administrative support only. AuditReady does not provide legal, clinical, billing, Medicaid, payer, or compliance advice.
      </p>
      <p style="font-size:12px;color:#aaa;">Questions? Contact us at support@useauditready.com.</p>
      <p style="margin-top:16px;font-size:11px;color:#aaa;border-top:1px solid #e2d9ce;padding-top:12px;">AuditReady &middot; Vibemo Group</p>
    </div>`;
  try {
    await resend.emails.send({
      from: FROM,
      to: data.agencyEmail,
      replyTo: "support@useauditready.com",
      subject: `You've reached your AI question limit — ${planLabel} plan`,
      html,
    });
    return { success: true };
  } catch { return { success: false }; }
}

// ── Cancellation Win-Back Email ────────────────────────────────
/**
 * Sent to the agency when they click "Cancel" in Stripe (cancelAtPeriodEnd → true).
 * Offers a path back with a CTA to the billing page.
 */
export async function sendCancellationWinbackEmail(data: {
  agencyEmail: string;
  agencyName: string | null;
  plan: string;
  periodEndDate: string; // human-readable, e.g. "June 15, 2026"
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping cancellation win-back email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const agencyLabel = data.agencyName ?? "there";
  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FDFAF6;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1D3D2F;padding:24px 32px;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,235,227,0.6);">AuditReady</p>
            <h1 style="margin:6px 0 0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">
              We're sorry to see you go.
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              Hi ${agencyLabel},
            </p>
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              Your <strong style="color:#1C1917;">${planLabel}</strong> subscription has been scheduled to cancel. You'll retain full access to AuditReady until <strong style="color:#1C1917;">${data.periodEndDate}</strong> — no data will be lost before then.
            </p>
            <p style="margin:0 0 24px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              If you cancelled by mistake, or if there's anything we can do to help — a question about features, a billing concern, or anything else — we'd love to hear from you. You can reactivate your plan at any time before your access ends.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="padding-right:12px;">
                  <a href="${APP_URL}/billing" style="display:inline-block;padding:12px 24px;background:#1D3D2F;color:#F0EBE3;text-decoration:none;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;letter-spacing:0.01em;">
                    Keep My Plan
                  </a>
                </td>
                <td>
                  <a href="mailto:support@useauditready.com" style="display:inline-block;padding:12px 24px;background:transparent;color:#1D3D2F;text-decoration:none;border-radius:4px;border:1px solid #C4B8A8;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;">
                    Contact Support
                  </a>
                </td>
              </tr>
            </table>

            <!-- What happens next -->
            <div style="background:#F0EBE3;border-radius:4px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 10px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7A6E64;">What happens next</p>
              <ul style="margin:0;padding:0 0 0 16px;font-family:'DM Sans',sans-serif;font-size:13px;color:#5A5048;line-height:1.8;">
                <li>Your access continues until <strong>${data.periodEndDate}</strong></li>
                <li>You can export your credential data at any time from the Reports page</li>
                <li>No further charges will be made after your current period ends</li>
                <li>Reactivate before ${data.periodEndDate} to keep your data and history intact</li>
              </ul>
            </div>

            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6E64;line-height:1.6;">
              Thank you for using AuditReady. If there's anything we could have done better, we'd genuinely appreciate hearing from you at <a href="mailto:support@useauditready.com" style="color:#1D3D2F;">support@useauditready.com</a>.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #E2D9CE;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;color:#A89880;line-height:1.6;">
              AuditReady &middot; Vibemo Group LLC &middot; <a href="${APP_URL}/privacy" style="color:#A89880;">Privacy Policy</a> &middot; <a href="${APP_URL}/terms" style="color:#A89880;">Terms of Service</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: data.agencyEmail,
      replyTo: "support@useauditready.com",
      subject: `Your AuditReady access continues until ${data.periodEndDate} — we'd love to keep you`,
      html,
    });

    if (error) {
      console.error("[email] Resend error (win-back):", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[email] Unexpected error (win-back):", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Sends a contact form submission notification to support@useauditready.com.
 * Reply-To is set to the sender's email so the team can reply directly.
 */
export async function sendContactFormEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping contact form notification");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }
  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9f7f4;border-radius:8px;">
      <h2 style="color:#1D3D2F;margin-top:0;">📬 New Contact Form Submission</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#666;width:100px;">Name</td><td style="padding:8px 0;font-weight:600;color:#1C1917;">${name}</td></tr>
        <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#3D6B52;">${email}</a></td></tr>
        <tr><td style="padding:8px 0;color:#666;">Subject</td><td style="padding:8px 0;font-weight:600;color:#1C1917;">${subject}</td></tr>
        <tr><td style="padding:8px 0;color:#666;vertical-align:top;">Message</td><td style="padding:8px 0;color:#1C1917;white-space:pre-wrap;">${message}</td></tr>
      </table>
      <div style="margin-top:20px;padding:12px 16px;background:#fff;border-radius:6px;border:1px solid #e2d9ce;">
        <p style="margin:0;font-size:13px;color:#666;">Reply directly to <strong>${email}</strong> to respond.</p>
      </div>
      <p style="margin-top:16px;font-size:11px;color:#aaa;">Sent by AuditReady · Vibemo Group</p>
    </div>
  `;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: "support@useauditready.com",
      replyTo: email,
      subject: `[Contact] ${subject} — from ${name}`,
      html,
    });
    if (error) {
      console.error("[email] Contact form notification error:", error);
      return { success: false, error: String(error) };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Contact form notification exception:", err);
    return { success: false, error: String(err) };
  }
}

/**
 * Sends an auto-reply confirmation to the person who submitted a demo request.
 * Lets them know we received their request and will follow up within 1 business day.
 */
export async function sendDemoConfirmationEmail({
  toEmail,
  name,
  agencyName,
}: {
  toEmail: string;
  name: string;
  agencyName: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping demo confirmation");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const firstName = name.split(" ")[0] || name;
  const loginUrl = `${APP_URL}/login`;

  const html = `
    <div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;background:#F7F3ED;border-radius:6px;overflow:hidden;border:1px solid #E2D9CE;">
      <!-- Header -->
      <div style="background:#1D3D2F;padding:28px 32px;">
        <h1 style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:1.6rem;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">
          AuditReady
        </h1>
      </div>
      <!-- Body -->
      <div style="padding:32px 32px 24px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1C1917;line-height:1.65;">
          Hi ${firstName},
        </p>
        <p style="margin:0 0 16px;font-size:15px;color:#1C1917;line-height:1.65;">
          Thanks for requesting a demo of AuditReady! We received your request for
          <strong>${agencyName}</strong> and will reach out within <strong>1 business day</strong>
          to schedule a 20-minute walkthrough.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#1C1917;line-height:1.65;">
          In the meantime, you're welcome to start your <strong>14-day free pilot</strong> right now —
          no credit card required, no patient data collected.
        </p>
        <!-- CTA -->
        <div style="text-align:center;margin:28px 0;">
          <a href="${loginUrl}"
             style="display:inline-block;background:#1D3D2F;color:#F0EBE3;text-decoration:none;
                    padding:13px 32px;border-radius:4px;font-size:14px;font-weight:700;
                    letter-spacing:0.01em;">
            Start Your Free Pilot
          </a>
        </div>
        <!-- What to expect -->
        <div style="background:#fff;border:1px solid #E2D9CE;border-radius:4px;padding:16px 20px;margin-top:8px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1C1917;">What to expect on the demo call:</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#5A5048;line-height:1.75;">
            <li>Live walkthrough of the credential dashboard</li>
            <li>How to set up staff and upload credentials in minutes</li>
            <li>Automatic expiration reminders and audit export</li>
            <li>Q&amp;A — bring your compliance questions</li>
          </ul>
        </div>
      </div>
      <!-- Footer -->
      <div style="background:#EFE9E0;padding:16px 32px;border-top:1px solid #E2D9CE;">
        <p style="margin:0;font-size:11px;color:#A89880;line-height:1.7;">
          AuditReady by Vibemo Group · Staff credential compliance for behavioral health agencies<br>
          Questions? Reply to this email or contact
          <a href="mailto:support@useauditready.com" style="color:#A89880;">support@useauditready.com</a>
        </p>
      </div>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: toEmail,
      replyTo: "support@useauditready.com",
      subject: `We received your AuditReady demo request, ${firstName}`,
      html,
    });
    if (error) {
      console.error("[email] Demo confirmation error:", error);
      return { success: false, error: String(error) };
    }
    return { success: true };
  } catch (err) {
    console.error("[email] Demo confirmation exception:", err);
    return { success: false, error: String(err) };
  }
}

// ── Subscription Ended (Fully Cancelled) Email ─────────────────
/**
 * Sent to the agency when their subscription is fully deleted (after billing period ends).
 * Informs them their account is now read-only and their data is preserved for 90 days.
 */
export async function sendAgencySubscriptionEndedEmail(data: {
  agencyEmail: string;
  agencyName: string | null;
  plan: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping subscription ended email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const agencyLabel = data.agencyName ?? "there";
  const planLabel = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FDFAF6;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1D3D2F;padding:24px 32px;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,235,227,0.6);">AuditReady</p>
            <h1 style="margin:6px 0 0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">
              Your subscription has ended.
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              Hi ${agencyLabel},
            </p>
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              Your <strong style="color:#1C1917;">${planLabel}</strong> subscription has ended. Your account is now in <strong style="color:#1C1917;">read-only mode</strong> — you can still log in and view all your staff records and credentials, but editing is paused.
            </p>

            <!-- Data preservation box -->
            <div style="background:#F0EBE3;border-radius:4px;padding:20px 24px;margin:20px 0;">
              <p style="margin:0 0 10px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7A6E64;">Your data is safe</p>
              <ul style="margin:0;padding:0 0 0 16px;font-family:'DM Sans',sans-serif;font-size:13px;color:#5A5048;line-height:1.8;">
                <li>All staff records are preserved</li>
                <li>All credentials and documents are preserved</li>
                <li>Your audit history is preserved</li>
                <li>Data is retained for 90 days — resubscribe anytime to restore full access</li>
              </ul>
            </div>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="padding-right:12px;">
                  <a href="${APP_URL}/pricing" style="display:inline-block;padding:12px 24px;background:#1D3D2F;color:#F0EBE3;text-decoration:none;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:700;letter-spacing:0.01em;">
                    Resubscribe Now
                  </a>
                </td>
                <td>
                  <a href="mailto:support@useauditready.com" style="display:inline-block;padding:12px 24px;background:transparent;color:#1D3D2F;text-decoration:none;border-radius:4px;border:1px solid #C4B8A8;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;">
                    Contact Support
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6E64;line-height:1.6;">
              Thank you for using AuditReady. We hope to see you back. If you have any questions, reach us at <a href="mailto:support@useauditready.com" style="color:#1D3D2F;">support@useauditready.com</a>.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #E2D9CE;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;color:#A89880;line-height:1.6;">
              AuditReady &middot; Vibemo Group LLC &middot; <a href="${APP_URL}/privacy" style="color:#A89880;">Privacy Policy</a> &middot; <a href="${APP_URL}/terms" style="color:#A89880;">Terms of Service</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: data.agencyEmail,
      replyTo: "support@useauditready.com",
      subject: `Your AuditReady subscription has ended — your data is preserved for 90 days`,
      html,
    });

    if (error) {
      console.error("[email] Resend error (subscription ended):", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[email] Unexpected error (subscription ended):", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Sent to the user immediately when they submit an account deletion request.
 * Confirms receipt, states the 30-day processing timeline, and provides support contact.
 */
export async function sendDeletionRequestConfirmationEmail(data: {
  toEmail: string;
  name: string | null;
  agencyName: string | null;
  requestedAt: Date;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping deletion confirmation email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const nameLabel = data.name ?? "there";
  const agencyLabel = data.agencyName ? ` for ${data.agencyName}` : "";
  const requestedDate = data.requestedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const deadlineDate = new Date(data.requestedAt.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FDFAF6;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1D3D2F;padding:24px 32px;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,235,227,0.6);">AuditReady</p>
            <h1 style="margin:6px 0 0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">
              Account deletion request received.
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              Hi ${nameLabel},
            </p>
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              We have received your request to permanently delete your AuditReady account${agencyLabel}.
            </p>

            <!-- Timeline box -->
            <div style="background:#F0EBE3;border-radius:4px;padding:20px 24px;margin:20px 0;">
              <p style="margin:0 0 10px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#7A6E64;">What happens next</p>
              <ul style="margin:0;padding:0 0 0 16px;font-family:'DM Sans',sans-serif;font-size:13px;color:#5A5048;line-height:1.8;">
                <li>Request submitted: <strong>${requestedDate}</strong></li>
                <li>Processing deadline: <strong>${deadlineDate}</strong> (within 30 days)</li>
                <li>You will receive a final confirmation email when deletion is complete</li>
                <li>Certain records (billing, audit logs) may be retained as required by law</li>
              </ul>
            </div>

            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              If you submitted this request in error or have changed your mind, please contact us immediately at
              <a href="mailto:support@useauditready.com" style="color:#1D3D2F;">support@useauditready.com</a> and we will cancel the request.
            </p>

            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6E64;line-height:1.6;">
              This request was processed in accordance with GDPR and CCPA requirements.
              See our <a href="${APP_URL}/privacy" style="color:#1D3D2F;">Privacy Policy</a> for full details on data retention.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #E2D9CE;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;color:#A89880;line-height:1.6;">
              AuditReady &middot; Vibemo Group LLC &middot; <a href="${APP_URL}/privacy" style="color:#A89880;">Privacy Policy</a> &middot; <a href="${APP_URL}/terms" style="color:#A89880;">Terms of Service</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: data.toEmail,
      replyTo: "support@useauditready.com",
      subject: `Account deletion request received — AuditReady`,
      html,
    });

    if (error) {
      console.error("[email] Resend error (deletion request confirmation):", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[email] Unexpected error (deletion request confirmation):", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}

/**
 * Sent to the user when an admin marks their deletion request as processed/complete.
 */
export async function sendDeletionCompletedEmail(data: {
  toEmail: string;
  name: string | null;
  agencyName: string | null;
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping deletion completed email");
    return { success: false, error: "RESEND_API_KEY not configured" };
  }

  const nameLabel = data.name ?? "there";
  const agencyLabel = data.agencyName ? ` for ${data.agencyName}` : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#FDFAF6;border:1px solid #E2D9CE;border-radius:4px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:#1D3D2F;padding:24px 32px;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(240,235,227,0.6);">AuditReady</p>
            <h1 style="margin:6px 0 0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#F0EBE3;letter-spacing:-0.02em;">
              Your account has been deleted.
            </h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              Hi ${nameLabel},
            </p>
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              Your AuditReady account${agencyLabel} has been permanently deleted. All staff records, credentials, documents, and settings associated with your account have been removed from our systems.
            </p>
            <p style="margin:0 0 16px;font-family:'DM Sans',sans-serif;font-size:14px;color:#5A5048;line-height:1.7;">
              Please note that certain records (billing history, audit logs) may be retained for up to 7 years as required by applicable law.
            </p>
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:13px;color:#7A6E64;line-height:1.6;">
              If you believe this deletion was processed in error, please contact us at
              <a href="mailto:support@useauditready.com" style="color:#1D3D2F;">support@useauditready.com</a>.
              Thank you for using AuditReady.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #E2D9CE;">
            <p style="margin:0;font-family:'DM Sans',sans-serif;font-size:11px;color:#A89880;line-height:1.6;">
              AuditReady &middot; Vibemo Group LLC &middot; <a href="${APP_URL}/privacy" style="color:#A89880;">Privacy Policy</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: data.toEmail,
      replyTo: "support@useauditready.com",
      subject: `Your AuditReady account has been deleted`,
      html,
    });

    if (error) {
      console.error("[email] Resend error (deletion completed):", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error("[email] Unexpected error (deletion completed):", err);
    return { success: false, error: err?.message ?? "Unknown error" };
  }
}
