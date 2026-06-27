import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { sendPilotActivationEmail, sendEmailVerificationEmail, sendAdminAgencySignupNotification } from "../email";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import crypto from "crypto";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Extract the email domain from an email address.
 * Returns undefined if the email is invalid or missing.
 */
function getEmailDomain(email: string | null | undefined): string | undefined {
  if (!email) return undefined;
  const parts = email.split("@");
  return parts.length === 2 ? parts[1].toLowerCase() : undefined;
}

/**
 * Personal/consumer email domains that should NOT be used for
 * single-admin-per-agency enforcement (since many agencies could
 * share the same @gmail.com domain).
 */
const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
  "icloud.com", "aol.com", "live.com", "msn.com",
  "protonmail.com", "proton.me", "me.com", "mac.com",
]);

export function registerOAuthRoutes(app: Express) {
  // ── Email verification endpoint ───────────────────────────────
  app.get("/api/verify-email", async (req: Request, res: Response) => {
    const token = getQueryParam(req, "token");
    if (!token) {
      res.redirect(302, "/verify-email?status=invalid");
      return;
    }

    try {
      const user = await db.getUserByVerificationToken(token);
      if (!user) {
        res.redirect(302, "/verify-email?status=invalid");
        return;
      }

      // Check token is not older than 24 hours
      const sentAt = user.emailVerificationSentAt;
      if (sentAt) {
        const ageMs = Date.now() - new Date(sentAt).getTime();
        if (ageMs > 24 * 60 * 60 * 1000) {
          res.redirect(302, "/verify-email?status=expired");
          return;
        }
      }

      await db.markEmailVerified(user.id);
      res.redirect(302, "/verify-email?status=success");
    } catch (error) {
      console.error("[OAuth] Email verification failed", error);
      res.redirect(302, "/verify-email?status=error");
    }
  });

  // ── OAuth callback ────────────────────────────────────────────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      // Check if this user already exists in our DB
      const existingUser = await db.getUserByOpenId(userInfo.openId);
      const isNewUser = !existingUser;
      const userEmail = userInfo.email ?? null;
      const emailDomain = getEmailDomain(userEmail);

      // ── Single-admin-per-agency enforcement ──────────────────
      // Only enforce for non-personal email domains (agency emails)
      if (isNewUser && emailDomain && !PERSONAL_DOMAINS.has(emailDomain)) {
        const existingAdmin = await db.getAdminByEmailDomain(emailDomain);
        if (existingAdmin) {
          // Another admin already exists for this email domain.
          // Redirect to a "duplicate agency" page.
          res.redirect(302, "/agency-already-registered");
          return;
        }
      }

      // Upsert the user — new users get role=admin by default
      // (every account is an agency admin in Phase 1)
      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userEmail,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
        role: "admin", // Phase 1: every account is an agency admin
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      // ── Auto-grant 14-day free pilot for new users ─────────
      if (isNewUser) {
        try {
          const freshUser = await db.getUserByOpenId(userInfo.openId);
          if (freshUser) {
            await db.autoGrantPilot(freshUser.id);
            // Send welcome/activation email (non-blocking)
            if (userEmail) {
              sendPilotActivationEmail({
                toEmail: userEmail,
                name: userInfo.name || "there",
                agencyName: freshUser.agencyName || "your agency",
              }).catch(err => console.error("[OAuth] Pilot activation email failed:", err));
              // Notify owner of new agency signup (non-blocking)
              sendAdminAgencySignupNotification({
                agencyId: freshUser.id,
                name: userInfo.name || null,
                email: userEmail,
                agencyName: freshUser.agencyName || null,
                acquisitionSource: (freshUser as any).acquisitionSource ?? "direct",
                repCode: (freshUser as any).repCodeUsed ?? undefined,
              }).catch(err => console.error("[OAuth] Admin signup notification failed:", err));
            }
          }
        } catch (pilotErr) {
          // Non-blocking — log but don't fail the login
          console.error("[OAuth] Failed to auto-grant pilot:", pilotErr);
        }
      }

      // ── Auto-send verification email for new users ────────────
      if (isNewUser && userEmail) {
        try {
          const freshUser = await db.getUserByOpenId(userInfo.openId);
          if (freshUser && !freshUser.emailVerifiedAt) {
            const token = crypto.randomUUID().replace(/-/g, "");
            await db.saveEmailVerificationToken(freshUser.id, token);
            const origin = process.env.APP_URL || "https://www.useauditready.com";
            const verifyUrl = `${origin}/api/verify-email?token=${token}`;
            await sendEmailVerificationEmail({
              toEmail: userEmail,
              name: userInfo.name || "",
              verifyUrl,
            });
          }
        } catch (emailErr) {
          // Non-blocking — log but don't fail the login
          console.error("[OAuth] Failed to send verification email:", emailErr);
        }
      }

      res.redirect(302, "/dashboard");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}
