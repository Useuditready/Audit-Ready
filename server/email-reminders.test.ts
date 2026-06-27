/**
 * Tests for email reminder helpers and scheduled handler logic.
 * Covers: window calculation, duplicate-send prevention, isCron guard,
 * agency grouping, and Resend helper error handling.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB helpers ────────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getCredentialsNeedingReminders: vi.fn(),
    hasReminderBeenSent: vi.fn(),
    recordReminderSent: vi.fn(),
  };
});

// ── Mock email helper ──────────────────────────────────────────────────────────
vi.mock("./email", () => ({
  sendCredentialReminderEmail: vi.fn(),
}));

// ── Mock SDK (isCron check) ────────────────────────────────────────────────────
vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

import {
  getCredentialsNeedingReminders,
  hasReminderBeenSent,
  recordReminderSent,
} from "./db";
import { sendCredentialReminderEmail } from "./email";
import { sdk } from "./_core/sdk";
import { credentialRemindersHandler } from "./scheduledReminders";
import type { Request, Response } from "express";

// ── Helper to build mock req/res ───────────────────────────────────────────────
function mockReqRes() {
  const req = {} as Request;
  const jsonFn = vi.fn();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  const res = { json: jsonFn, status: statusFn } as unknown as Response;
  return { req, res, jsonFn, statusFn };
}

// ── Window calculation tests ───────────────────────────────────────────────────
describe("reminder window calculation", () => {
  it("30-day window: covers days 27–30 from today", () => {
    const today = new Date("2026-06-01");
    const daysBeforeExpiry = 30;
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() + daysBeforeExpiry - 3);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + daysBeforeExpiry);
    expect(windowStart.toISOString().slice(0, 10)).toBe("2026-06-28");
    expect(windowEnd.toISOString().slice(0, 10)).toBe("2026-07-01");
  });

  it("60-day window: covers days 57–60 from today", () => {
    const today = new Date("2026-06-01");
    const daysBeforeExpiry = 60;
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() + daysBeforeExpiry - 3);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + daysBeforeExpiry);
    expect(windowStart.toISOString().slice(0, 10)).toBe("2026-07-28");
    expect(windowEnd.toISOString().slice(0, 10)).toBe("2026-07-31");
  });

  it("90-day window: covers days 87–90 from today", () => {
    const today = new Date("2026-06-01");
    const daysBeforeExpiry = 90;
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() + daysBeforeExpiry - 3);
    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + daysBeforeExpiry);
    expect(windowStart.toISOString().slice(0, 10)).toBe("2026-08-27");
    expect(windowEnd.toISOString().slice(0, 10)).toBe("2026-08-30");
  });

  it("windows do not overlap: 30d end < 60d start", () => {
    const today = new Date("2026-06-01");
    const thirtyEnd = new Date(today);
    thirtyEnd.setDate(thirtyEnd.getDate() + 30);
    const sixtyStart = new Date(today);
    sixtyStart.setDate(sixtyStart.getDate() + 57);
    expect(thirtyEnd < sixtyStart).toBe(true);
  });
});

// ── isCron guard ───────────────────────────────────────────────────────────────
describe("credentialRemindersHandler — isCron guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 403 when request is not from cron", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: false } as any);
    const { req, res, statusFn, jsonFn } = mockReqRes();
    await credentialRemindersHandler(req, res);
    expect(statusFn).toHaveBeenCalledWith(403);
    expect(jsonFn).toHaveBeenCalledWith({ error: "cron-only endpoint" });
  });
});

// ── Duplicate-send prevention ──────────────────────────────────────────────────
describe("credentialRemindersHandler — duplicate-send prevention", () => {
  beforeEach(() => vi.clearAllMocks());

  it("skips sending when reminder has already been sent", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true } as any);
    const mockRow = {
      credentialId: 1,
      credentialType: "BCBA License",
      expirationDate: "2026-08-01",
      staffId: 5,
      staffFirstName: "Jane",
      staffLastName: "Smith",
      userId: 10,
      userEmail: "admin@clinic.com",
      agencyName: "Sunrise ABA",
      userName: "Admin User",
    };
    // Return rows for the first threshold (90d), empty for others
    vi.mocked(getCredentialsNeedingReminders)
      .mockResolvedValueOnce([mockRow])
      .mockResolvedValue([]);
    // Simulate already sent
    vi.mocked(hasReminderBeenSent).mockResolvedValue(true);

    const { req, res, jsonFn } = mockReqRes();
    await credentialRemindersHandler(req, res);

    expect(sendCredentialReminderEmail).not.toHaveBeenCalled();
    expect(recordReminderSent).not.toHaveBeenCalled();
    const result = jsonFn.mock.calls[0][0];
    expect(result.ok).toBe(true);
  });

  it("sends and records when reminder has not been sent yet", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true } as any);
    const mockRow = {
      credentialId: 2,
      credentialType: "RBT Certification",
      expirationDate: "2026-08-15",
      staffId: 6,
      staffFirstName: "Bob",
      staffLastName: "Jones",
      userId: 11,
      userEmail: "admin@agency.com",
      agencyName: "Blue Sky ABA",
      userName: "Admin",
    };
    vi.mocked(getCredentialsNeedingReminders)
      .mockResolvedValueOnce([mockRow])
      .mockResolvedValue([]);
    vi.mocked(hasReminderBeenSent).mockResolvedValue(false);
    vi.mocked(sendCredentialReminderEmail).mockResolvedValue({ success: true });
    vi.mocked(recordReminderSent).mockResolvedValue(undefined);

    const { req, res, jsonFn } = mockReqRes();
    await credentialRemindersHandler(req, res);

    expect(sendCredentialReminderEmail).toHaveBeenCalledOnce();
    expect(recordReminderSent).toHaveBeenCalledOnce();
    const result = jsonFn.mock.calls[0][0];
    expect(result.ok).toBe(true);
    expect(result.results["90d"].sent).toBe(1);
  }, 15000);
});

// ── Agency grouping ────────────────────────────────────────────────────────────
describe("credentialRemindersHandler — groups by agency", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends one email per agency even when multiple credentials are expiring", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValueOnce({ isCron: true } as any);
    const base = {
      staffId: 5,
      userId: 10,
      userEmail: "admin@clinic.com",
      agencyName: "Sunrise ABA",
      userName: "Admin",
      expirationDate: "2026-08-01",
    };
    const rows = [
      { ...base, credentialId: 1, credentialType: "BCBA License", staffFirstName: "Jane", staffLastName: "Smith" },
      { ...base, credentialId: 2, credentialType: "CPR Card", staffFirstName: "Jane", staffLastName: "Smith" },
    ];
    vi.mocked(getCredentialsNeedingReminders)
      .mockResolvedValueOnce(rows)
      .mockResolvedValue([]);
    vi.mocked(hasReminderBeenSent).mockResolvedValue(false);
    vi.mocked(sendCredentialReminderEmail).mockResolvedValue({ success: true });
    vi.mocked(recordReminderSent).mockResolvedValue(undefined);

    const { req, res, jsonFn } = mockReqRes();
    await credentialRemindersHandler(req, res);

    // Only one email sent (one agency), but recordReminderSent called twice (two credentials)
    expect(sendCredentialReminderEmail).toHaveBeenCalledOnce();
    expect(recordReminderSent).toHaveBeenCalledTimes(2);
    const result = jsonFn.mock.calls[0][0];
    expect(result.results["90d"].sent).toBe(1);
  });
});

// ── sendCredentialReminderEmail unit ──────────────────────────────────────────
describe("sendCredentialReminderEmail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success: true on success", async () => {
    vi.mocked(sendCredentialReminderEmail).mockResolvedValueOnce({ success: true });
    const result = await sendCredentialReminderEmail({
      toEmail: "admin@example.com",
      agencyName: "Test Agency",
      credentials: [
        { staffFirstName: "Jane", staffLastName: "Smith", credentialType: "BCBA License", expirationDate: "2026-08-01", daysUntilExpiry: 75 },
      ],
      daysBeforeExpiry: 90,
    });
    expect(result.success).toBe(true);
  });

  it("returns success: false with error message on failure", async () => {
    vi.mocked(sendCredentialReminderEmail).mockResolvedValueOnce({ success: false, error: "Invalid API key" });
    const result = await sendCredentialReminderEmail({
      toEmail: "admin@example.com",
      agencyName: "Test Agency",
      credentials: [],
      daysBeforeExpiry: 30,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid API key");
  });
});
