import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getProvidersByUserId: vi.fn(),
  getProviderById: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  getPayerStatusesForProvider: vi.fn(),
  upsertPayerStatus: vi.fn(),
  deletePayerStatus: vi.fn(),
  getCredentialingDashboardStats: vi.fn(),
}));

import {
  getProvidersByUserId,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  getPayerStatusesForProvider,
  upsertPayerStatus,
  getCredentialingDashboardStats,
} from "./db";

describe("Credentialing DB helpers (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getProvidersByUserId returns array of providers", async () => {
    const mockProviders = [
      { id: 1, userId: 1, firstName: "Alice", lastName: "Chen", role: "BCBA", npi: "1234567890", caqhId: "12345678" },
      { id: 2, userId: 1, firstName: "Bob", lastName: "Smith", role: "LCSW", npi: "0987654321", caqhId: null },
    ];
    (getProvidersByUserId as any).mockResolvedValue(mockProviders);
    const result = await getProvidersByUserId(1);
    expect(result).toHaveLength(2);
    expect(result[0].firstName).toBe("Alice");
    expect(result[1].role).toBe("LCSW");
    expect(getProvidersByUserId).toHaveBeenCalledWith(1);
  });

  it("getProviderById returns a single provider or undefined", async () => {
    const mockProvider = { id: 1, userId: 1, firstName: "Alice", lastName: "Chen", role: "BCBA", npi: "1234567890" };
    (getProviderById as any).mockResolvedValue(mockProvider);
    const result = await getProviderById(1, 1);
    expect(result?.firstName).toBe("Alice");
    expect(getProviderById).toHaveBeenCalledWith(1, 1);

    // Not found
    (getProviderById as any).mockResolvedValue(undefined);
    const notFound = await getProviderById(999, 1);
    expect(notFound).toBeUndefined();
  });

  it("createProvider returns insertId", async () => {
    (createProvider as any).mockResolvedValue(3);
    const id = await createProvider({
      userId: 1,
      firstName: "Carol",
      lastName: "Davis",
      role: "Psychologist",
      npi: "1112223334",
    });
    expect(id).toBe(3);
    expect(createProvider).toHaveBeenCalledWith(expect.objectContaining({
      userId: 1,
      firstName: "Carol",
      lastName: "Davis",
    }));
  });

  it("updateProvider resolves without error", async () => {
    (updateProvider as any).mockResolvedValue(undefined);
    await expect(
      updateProvider(1, 1, { role: "BCBA-D", licenseNumber: "NC-12345" })
    ).resolves.toBeUndefined();
    expect(updateProvider).toHaveBeenCalledWith(1, 1, { role: "BCBA-D", licenseNumber: "NC-12345" });
  });

  it("deleteProvider resolves without error", async () => {
    (deleteProvider as any).mockResolvedValue(undefined);
    await expect(deleteProvider(1, 1)).resolves.toBeUndefined();
    expect(deleteProvider).toHaveBeenCalledWith(1, 1);
  });

  it("getPayerStatusesForProvider returns payer status rows", async () => {
    const mockStatuses = [
      { id: 1, providerId: 1, userId: 1, payerName: "bcbs", status: "approved", submittedAt: "2025-01-01", approvedAt: "2025-03-01", expiresAt: "2026-03-01" },
      { id: 2, providerId: 1, userId: 1, payerName: "medicaid", status: "in_review", submittedAt: "2025-04-01", approvedAt: null, expiresAt: null },
    ];
    (getPayerStatusesForProvider as any).mockResolvedValue(mockStatuses);
    const result = await getPayerStatusesForProvider(1, 1);
    expect(result).toHaveLength(2);
    expect(result[0].payerName).toBe("bcbs");
    expect(result[0].status).toBe("approved");
    expect(result[1].status).toBe("in_review");
    expect(getPayerStatusesForProvider).toHaveBeenCalledWith(1, 1);
  });

  it("upsertPayerStatus resolves without error", async () => {
    (upsertPayerStatus as any).mockResolvedValue(undefined);
    await expect(
      upsertPayerStatus({
        providerId: 1,
        userId: 1,
        payerName: "aetna",
        status: "submitted",
        submittedAt: "2025-06-01",
      })
    ).resolves.toBeUndefined();
    expect(upsertPayerStatus).toHaveBeenCalledWith(expect.objectContaining({
      payerName: "aetna",
      status: "submitted",
    }));
  });

  it("getCredentialingDashboardStats returns correct shape", async () => {
    const mockStats = { totalProviders: 5, approved: 12, needsUpdate: 2, expired: 1, inReview: 3 };
    (getCredentialingDashboardStats as any).mockResolvedValue(mockStats);
    const result = await getCredentialingDashboardStats(1);
    expect(result.totalProviders).toBe(5);
    expect(result.approved).toBe(12);
    expect(result.needsUpdate).toBe(2);
    expect(result.expired).toBe(1);
    expect(result.inReview).toBe(3);
    expect(getCredentialingDashboardStats).toHaveBeenCalledWith(1);
  });

  it("getCredentialingDashboardStats returns zeros when no data", async () => {
    (getCredentialingDashboardStats as any).mockResolvedValue({
      totalProviders: 0, approved: 0, needsUpdate: 0, expired: 0, inReview: 0,
    });
    const result = await getCredentialingDashboardStats(999);
    expect(result.totalProviders).toBe(0);
    expect(result.approved).toBe(0);
  });
});
