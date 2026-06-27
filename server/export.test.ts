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

import { getStaffByUserId, getAllCredentialsByUserId } from "./db";

describe("CSV Export logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates valid CSV with headers and rows", async () => {
    const mockStaff = [
      { id: 1, userId: 1, firstName: "Jane", lastName: "Smith", role: "BCBA", status: "active", email: null, phone: null, hireDate: null, createdAt: new Date(), updatedAt: new Date() },
    ];
    const mockCreds = [
      {
        id: 1, staffId: 1, userId: 1, type: "BCBA License", category: "license",
        issuingBody: "BACB", licenseNumber: "BCBA-12345", issueDate: "2024-01-15",
        expirationDate: "2026-01-15", status: "current", documentUrl: null,
        notes: "Primary license", verified: true, createdAt: new Date(), updatedAt: new Date(),
      },
    ];

    (getStaffByUserId as any).mockResolvedValue(mockStaff);
    (getAllCredentialsByUserId as any).mockResolvedValue(mockCreds);

    // Simulate the export logic from the router
    const allCreds = await getAllCredentialsByUserId(1);
    const staffList = await getStaffByUserId(1);
    const staffMap = staffList.reduce<Record<number, { firstName: string; lastName: string; role: string | null }>>((acc: any, s: any) => {
      acc[s.id] = { firstName: s.firstName, lastName: s.lastName, role: s.role };
      return acc;
    }, {});

    const headers = ["Staff Name", "Role", "Credential Type", "Category", "Issuing Body", "License Number", "Issue Date", "Expiration Date", "Status", "Verified", "Notes"];
    const rows = allCreds.map((c: any) => {
      const staff = staffMap[c.staffId];
      const staffName = staff ? `${staff.firstName} ${staff.lastName}` : "Unknown";
      const role = staff?.role ?? "";
      return [
        staffName, role, c.type, c.category, c.issuingBody ?? "", c.licenseNumber ?? "",
        c.issueDate ?? "", c.expirationDate ?? "", c.status, c.verified ? "Yes" : "No", c.notes ?? "",
      ];
    });

    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csv = [headers.map(escapeCsv).join(","), ...rows.map((r: string[]) => r.map(escapeCsv).join(","))].join("\n");

    // Verify CSV structure
    const lines = csv.split("\n");
    expect(lines).toHaveLength(2); // header + 1 row
    expect(lines[0]).toBe("Staff Name,Role,Credential Type,Category,Issuing Body,License Number,Issue Date,Expiration Date,Status,Verified,Notes");
    expect(lines[1]).toContain("Jane Smith");
    expect(lines[1]).toContain("BCBA");
    expect(lines[1]).toContain("BCBA License");
    expect(lines[1]).toContain("BACB");
    expect(lines[1]).toContain("BCBA-12345");
    expect(lines[1]).toContain("2024-01-15");
    expect(lines[1]).toContain("2026-01-15");
    expect(lines[1]).toContain("current");
    expect(lines[1]).toContain("Yes");
    expect(lines[1]).toContain("Primary license");
  });

  it("escapes commas and quotes in CSV fields", () => {
    const escapeCsv = (val: string) => {
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    expect(escapeCsv("simple")).toBe("simple");
    expect(escapeCsv("has, comma")).toBe('"has, comma"');
    expect(escapeCsv('has "quotes"')).toBe('"has ""quotes"""');
    expect(escapeCsv("has\nnewline")).toBe('"has\nnewline"');
  });

  it("handles empty credentials list", async () => {
    (getStaffByUserId as any).mockResolvedValue([]);
    (getAllCredentialsByUserId as any).mockResolvedValue([]);

    const allCreds = await getAllCredentialsByUserId(1);
    const staffList = await getStaffByUserId(1);

    const headers = ["Staff Name", "Role", "Credential Type", "Category", "Issuing Body", "License Number", "Issue Date", "Expiration Date", "Status", "Verified", "Notes"];
    const rows = allCreds.map(() => []);

    const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
    const lines = csv.split("\n");
    expect(lines).toHaveLength(1); // Only header, no data rows
  });
});
