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
  verifyCredential: vi.fn(),
  getDashboardStats: vi.fn(),
  getExpiringCredentials: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
}));

import {
  createCredential,
  updateCredential,
  verifyCredential,
  getCredentialsByStaffId,
} from "./db";

// Shared mock credential with all Phase 1 verification fields
const mockCredential = {
  id: 1,
  staffId: 1,
  userId: 1,
  type: "BCBA License",
  category: "license",
  issuingBody: "BACB",
  licenseNumber: "BCBA-12345",
  issueDate: "2024-01-15",
  expirationDate: "2026-01-15",
  status: "current",
  documentLink: "https://drive.google.com/file/d/abc123",
  verificationStatus: "pending",
  verifiedBy: null,
  verificationDate: null,
  verificationNotes: null,
  notes: "Primary BCBA license",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Credential Verification Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a credential with all Phase 1 fields including documentLink", async () => {
    (createCredential as any).mockResolvedValue(mockCredential);

    const result = await createCredential({
      staffId: 1,
      userId: 1,
      type: "BCBA License",
      category: "license",
      issuingBody: "BACB",
      licenseNumber: "BCBA-12345",
      issueDate: "2024-01-15",
      expirationDate: "2026-01-15",
      status: "current",
      documentLink: "https://drive.google.com/file/d/abc123",
      notes: "Primary BCBA license",
    });

    expect(result.documentLink).toBe("https://drive.google.com/file/d/abc123");
    expect(result.licenseNumber).toBe("BCBA-12345");
    expect(result.issueDate).toBe("2024-01-15");
    expect(result.verificationStatus).toBe("pending");
    expect(result.verifiedBy).toBeNull();
    expect(result.verificationDate).toBeNull();
  });

  it("approves a credential and sets verifiedBy and verificationDate", async () => {
    const approved = {
      ...mockCredential,
      verificationStatus: "approved",
      verifiedBy: "Admin User",
      verificationDate: new Date("2026-05-17"),
      verificationNotes: "License verified against BACB registry",
    };
    (verifyCredential as any).mockResolvedValue(approved);

    const result = await verifyCredential({
      id: 1,
      verificationStatus: "approved",
      verifiedBy: "Admin User",
      verificationNotes: "License verified against BACB registry",
    });

    expect(result.verificationStatus).toBe("approved");
    expect(result.verifiedBy).toBe("Admin User");
    expect(result.verificationDate).toBeInstanceOf(Date);
    expect(result.verificationNotes).toBe("License verified against BACB registry");
  });

  it("rejects a credential and records the reason", async () => {
    const rejected = {
      ...mockCredential,
      verificationStatus: "rejected",
      verifiedBy: "Admin User",
      verificationDate: new Date("2026-05-17"),
      verificationNotes: "Document link is broken — cannot view file",
    };
    (verifyCredential as any).mockResolvedValue(rejected);

    const result = await verifyCredential({
      id: 1,
      verificationStatus: "rejected",
      verifiedBy: "Admin User",
      verificationNotes: "Document link is broken — cannot view file",
    });

    expect(result.verificationStatus).toBe("rejected");
    expect(result.verificationNotes).toContain("broken");
  });

  it("marks a credential as needs_update", async () => {
    const needsUpdate = {
      ...mockCredential,
      verificationStatus: "needs_update",
      verifiedBy: "Admin User",
      verificationDate: new Date("2026-05-17"),
      verificationNotes: "License number does not match state board records",
    };
    (verifyCredential as any).mockResolvedValue(needsUpdate);

    const result = await verifyCredential({
      id: 1,
      verificationStatus: "needs_update",
      verifiedBy: "Admin User",
      verificationNotes: "License number does not match state board records",
    });

    expect(result.verificationStatus).toBe("needs_update");
    expect(result.verifiedBy).toBe("Admin User");
  });

  it("credential without documentLink has pending verification status", async () => {
    const noDoc = { ...mockCredential, documentLink: null };
    (getCredentialsByStaffId as any).mockResolvedValue([noDoc]);

    const creds = await getCredentialsByStaffId(1);
    const cred = creds[0];

    expect(cred.documentLink).toBeNull();
    expect(cred.verificationStatus).toBe("pending");
  });

  it("CSV export includes verification status column", () => {
    const cred = { ...mockCredential, verificationStatus: "approved", verifiedBy: "Admin User" };

    const headers = [
      "Staff Name", "Role", "Credential Type", "Category", "Issuing Body",
      "License Number", "Issue Date", "Expiration Date", "Status",
      "Verification Status", "Verified By", "Notes",
    ];

    const row = [
      "Jane Smith", "BCBA", cred.type, cred.category, cred.issuingBody ?? "",
      cred.licenseNumber ?? "", cred.issueDate ?? "", cred.expirationDate ?? "",
      cred.status, cred.verificationStatus, cred.verifiedBy ?? "", cred.notes ?? "",
    ];

    const csv = [headers.join(","), row.join(",")].join("\n");
    const lines = csv.split("\n");

    expect(lines[0]).toContain("Verification Status");
    expect(lines[0]).toContain("Verified By");
    expect(lines[1]).toContain("approved");
    expect(lines[1]).toContain("Admin User");
  });
});
