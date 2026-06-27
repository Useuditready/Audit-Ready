/**
 * SAM.gov API Key Validation Test
 *
 * Validates that:
 * 1. SAM_GOV_API_KEY env var is set
 * 2. checkSAMgov() returns a valid SourceResult structure
 * 3. When key is present, apiKeyRequired is not true
 *
 * Note: We do NOT make a live API call in tests to avoid consuming the
 * daily rate limit quota. We test the key presence and function contract.
 * Live API validation was confirmed manually via curl (HTTP 200, real records).
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { checkSAMgov } from "./verificationService";

describe("SAM.gov verification", () => {
  it("SAM_GOV_API_KEY environment variable is set", () => {
    const key = process.env.SAM_GOV_API_KEY;
    expect(key).toBeTruthy();
    expect(typeof key).toBe("string");
    expect(key!.length).toBeGreaterThan(10);
  });

  it("returns api_key_required when no key is provided", async () => {
    // Pass empty string to override env var and simulate missing key
    const result = await checkSAMgov("John", "Smith", " ".trim()); // empty string after trim
    expect(result.source).toBe("sam_gov");
    expect(result.apiKeyRequired).toBe(true);
    expect(result.suggestedStatus).toBe("manual_review_required");
    expect(result.manualVerifyUrl).toContain("sam.gov");
  });

  it("returns correct SourceResult shape when key is configured", async () => {
    // Mock fetch to avoid consuming daily rate limit quota
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        totalRecords: 0,
        excludedEntity: [],
        links: {},
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await checkSAMgov("Jane", "Doe", process.env.SAM_GOV_API_KEY ?? "test-key");

    expect(result.source).toBe("sam_gov");
    expect(result.apiKeyRequired).toBeFalsy();
    expect(result.found).toBe(false);
    expect(result.matchCount).toBe(0);
    expect(result.suggestedStatus).toBe("not_found");
    expect(result.queriedAt).toBeTruthy();
    expect(Array.isArray(result.records)).toBe(true);

    // Verify the API was called with the correct endpoint and key
    expect(mockFetch).toHaveBeenCalledOnce();
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("api.sam.gov");
    expect(calledUrl).toContain("entity-information/v4/exclusions");
    expect(calledUrl).toContain("api_key=");
    expect(calledUrl).toContain("exclusionName=Jane+Doe");
    expect(calledUrl).toContain("classification=Individual");

    vi.unstubAllGlobals();
  });

  it("returns needs_review when active exclusion records are found", async () => {
    const mockRecord = {
      exclusionDetails: {
        classificationType: "Individual",
        exclusionType: "Ineligible (Proceedings Completed)",
        exclusionProgram: "Reciprocal",
        excludingAgencyCode: "DOJ",
        excludingAgencyName: "JUSTICE, DEPARTMENT OF",
      },
      exclusionIdentification: {
        ueiSAM: "TEST123",
        firstName: "John",
        lastName: "Smith",
        entityName: "John Smith",
      },
      exclusionActions: {
        listOfActions: [
          {
            activateDate: "01-01-2020",
            terminationDate: "01-01-2099",
            recordStatus: "Active",
          },
        ],
      },
      exclusionPrimaryAddress: {
        city: "Washington",
        stateOrProvinceCode: "DC",
      },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        totalRecords: 1,
        excludedEntity: [mockRecord],
        links: {},
      }),
    });
    vi.stubGlobal("fetch", mockFetch);

    const result = await checkSAMgov("John", "Smith", "test-key");

    expect(result.found).toBe(true);
    expect(result.matchCount).toBe(1);
    expect(result.suggestedStatus).toBe("needs_review");
    expect(result.records[0]).toMatchObject({
      firstName: "John",
      lastName: "Smith",
      entityName: "John Smith",
      exclusionType: "Ineligible (Proceedings Completed)",
      excludingAgencyName: "JUSTICE, DEPARTMENT OF",
      city: "Washington",
      state: "DC",
    });

    vi.unstubAllGlobals();
  });
});
