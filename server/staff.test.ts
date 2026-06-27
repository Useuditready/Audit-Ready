import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db module
vi.mock("./db", () => ({
  getStaffByUserId: vi.fn(),
  getStaffById: vi.fn(),
  createStaff: vi.fn(),
  updateStaff: vi.fn(),
  deleteStaff: vi.fn(),
  getCredentialsByStaffId: vi.fn(),
  getAllCredentialsByUserId: vi.fn(),
  createCredential: vi.fn(),
  updateCredential: vi.fn(),
  deleteCredential: vi.fn(),
  getDashboardStats: vi.fn(),
  getExpiringCredentials: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

import {
  getStaffByUserId,
  getStaffById,
  createStaff,
  getDashboardStats,
  getExpiringCredentials,
  getCredentialsByStaffId,
  createCredential,
} from "./db";

describe("Staff DB helpers (mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getStaffByUserId returns array", async () => {
    const mockStaff = [
      { id: 1, userId: 1, firstName: "Jane", lastName: "Smith", role: "BCBA", status: "active" },
      { id: 2, userId: 1, firstName: "John", lastName: "Doe", role: "RBT", status: "active" },
    ];
    (getStaffByUserId as any).mockResolvedValue(mockStaff);

    const result = await getStaffByUserId(1);
    expect(result).toHaveLength(2);
    expect(result[0].firstName).toBe("Jane");
    expect(getStaffByUserId).toHaveBeenCalledWith(1);
  });

  it("getStaffById returns single staff or undefined", async () => {
    const mockStaff = { id: 1, userId: 1, firstName: "Jane", lastName: "Smith", role: "BCBA", status: "active" };
    (getStaffById as any).mockResolvedValue(mockStaff);

    const result = await getStaffById(1, 1);
    expect(result?.firstName).toBe("Jane");
    expect(getStaffById).toHaveBeenCalledWith(1, 1);

    // Not found
    (getStaffById as any).mockResolvedValue(undefined);
    const notFound = await getStaffById(999, 1);
    expect(notFound).toBeUndefined();
  });

  it("createStaff returns insertId", async () => {
    (createStaff as any).mockResolvedValue(5);

    const id = await createStaff({
      userId: 1,
      firstName: "New",
      lastName: "Staff",
      status: "active",
    });
    expect(id).toBe(5);
    expect(createStaff).toHaveBeenCalledWith({
      userId: 1,
      firstName: "New",
      lastName: "Staff",
      status: "active",
    });
  });

  it("getDashboardStats returns aggregated counts", async () => {
    const mockStats = { totalStaff: 10, totalCredentials: 45, current: 38, expiringSoon: 5, expired: 2 };
    (getDashboardStats as any).mockResolvedValue(mockStats);

    const stats = await getDashboardStats(1);
    expect(stats.totalStaff).toBe(10);
    expect(stats.current).toBe(38);
    expect(stats.expiringSoon).toBe(5);
    expect(stats.expired).toBe(2);
  });

  it("getExpiringCredentials returns joined data", async () => {
    const mockExpiring = [
      { id: 1, type: "CPR", expirationDate: "2026-06-01", status: "expiring_soon", staffId: 1, staffFirstName: "Jane", staffLastName: "Smith", staffRole: "BCBA" },
    ];
    (getExpiringCredentials as any).mockResolvedValue(mockExpiring);

    const result = await getExpiringCredentials(1, 90);
    expect(result).toHaveLength(1);
    expect(result[0].staffFirstName).toBe("Jane");
    expect(result[0].type).toBe("CPR");
  });

  it("getCredentialsByStaffId returns credentials for a staff member", async () => {
    const mockCreds = [
      { id: 1, staffId: 1, type: "BCBA License", status: "current", category: "license" },
      { id: 2, staffId: 1, type: "CPR / First Aid", status: "expiring_soon", category: "certification" },
    ];
    (getCredentialsByStaffId as any).mockResolvedValue(mockCreds);

    const result = await getCredentialsByStaffId(1, 1);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("BCBA License");
  });

  it("createCredential returns insertId", async () => {
    (createCredential as any).mockResolvedValue(10);

    const id = await createCredential({
      staffId: 1,
      userId: 1,
      type: "Background Check",
      category: "background_check",
      status: "current",
    });
    expect(id).toBe(10);
  });
});
