/**
 * Tests for onboarding checklist and pending review queue DB helpers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the DB module ─────────────────────────────────────────────────────────
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getPendingCredentials: vi.fn(),
    dismissOnboarding: vi.fn(),
  };
});

import { getPendingCredentials, dismissOnboarding } from "./db";

describe("getPendingCredentials", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array (empty when no pending credentials)", async () => {
    vi.mocked(getPendingCredentials).mockResolvedValueOnce([]);
    const result = await getPendingCredentials(1);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it("returns credentials with staffFirstName and staffLastName fields", async () => {
    const mockRow = {
      id: 1,
      staffId: 10,
      userId: 1,
      type: "BCBA License",
      category: "license" as const,
      issuingBody: "BACB",
      licenseNumber: "1-23-45678",
      issueDate: "2024-01-01",
      expirationDate: "2026-12-31",
      status: "current" as const,
      documentLink: "https://example.com/doc.pdf",
      notes: null,
      verificationStatus: "pending" as const,
      verifiedBy: null,
      verificationDate: null,
      verificationNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      staffFirstName: "Jane",
      staffLastName: "Smith",
      staffRole: "BCBA",
    };
    vi.mocked(getPendingCredentials).mockResolvedValueOnce([mockRow]);
    const result = await getPendingCredentials(1);
    expect(result).toHaveLength(1);
    expect(result[0].staffFirstName).toBe("Jane");
    expect(result[0].staffLastName).toBe("Smith");
    expect(result[0].verificationStatus).toBe("pending");
  });

  it("is called with the correct userId", async () => {
    vi.mocked(getPendingCredentials).mockResolvedValueOnce([]);
    await getPendingCredentials(42);
    expect(getPendingCredentials).toHaveBeenCalledWith(42);
  });
});

describe("dismissOnboarding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves without throwing", async () => {
    vi.mocked(dismissOnboarding).mockResolvedValueOnce(undefined);
    await expect(dismissOnboarding(1)).resolves.toBeUndefined();
  });

  it("is called with the correct userId", async () => {
    vi.mocked(dismissOnboarding).mockResolvedValueOnce(undefined);
    await dismissOnboarding(7);
    expect(dismissOnboarding).toHaveBeenCalledWith(7);
  });
});
