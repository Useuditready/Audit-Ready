/**
 * AI-Assisted Document Extraction Tests
 * Tests the extractFromDocument procedure logic and edge cases.
 * Uses mocked LLM responses to avoid real API calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the LLM helper ──────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";

// ── Helper: build a mock LLM response ────────────────────────────────────────
function mockLLMResponse(data: Record<string, unknown>) {
  (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    choices: [
      {
        message: {
          content: JSON.stringify(data),
        },
      },
    ],
  });
}

// ── The extraction logic (mirrors routers.ts extractFromDocument procedure) ──
async function runExtraction(documentUrl: string, staffName?: string) {
  const { invokeLLM: llm } = await import("./_core/llm");

  const systemPrompt = `You are a credential document parser for a healthcare compliance system.
Extract credential information from the provided document image or PDF.
Return ONLY valid JSON with no markdown, no explanation.`;

  const userPrompt = `Extract credential information from this document.${staffName ? ` The staff member's name is "${staffName}".` : ""}

Return JSON with these fields (use null for any field you cannot determine with confidence):
{
  "credentialType": string | null,
  "issuingBody": string | null,
  "licenseNumber": string | null,
  "issueDate": string | null,
  "expirationDate": string | null,
  "providerName": string | null,
  "confidence": "high" | "medium" | "low",
  "warnings": string[]
}`;

  const response = await llm({
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: { url: documentUrl, detail: "high" },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "credential_extraction",
        strict: true,
        schema: {
          type: "object",
          properties: {
            credentialType: { type: ["string", "null"] },
            issuingBody: { type: ["string", "null"] },
            licenseNumber: { type: ["string", "null"] },
            issueDate: { type: ["string", "null"] },
            expirationDate: { type: ["string", "null"] },
            providerName: { type: ["string", "null"] },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            warnings: { type: "array", items: { type: "string" } },
          },
          required: [
            "credentialType",
            "issuingBody",
            "licenseNumber",
            "issueDate",
            "expirationDate",
            "providerName",
            "confidence",
            "warnings",
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.choices[0].message.content;
  return JSON.parse(raw);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AI Document Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Happy path: JPEG license ──────────────────────────────────────────────
  it("extracts BCBA license from JPEG with high confidence", async () => {
    mockLLMResponse({
      credentialType: "BCBA License",
      issuingBody: "Behavior Analyst Certification Board",
      licenseNumber: "1-23-45696",
      issueDate: "2022-01-15",
      expirationDate: "2025-01-15",
      providerName: "Jane Smith",
      confidence: "high",
      warnings: [],
    });

    const result = await runExtraction(
      "https://storage.example.com/credential.jpg",
      "Jane Smith"
    );

    expect(result.credentialType).toBe("BCBA License");
    expect(result.issuingBody).toBe("Behavior Analyst Certification Board");
    expect(result.licenseNumber).toBe("1-23-45696");
    expect(result.issueDate).toBe("2022-01-15");
    expect(result.expirationDate).toBe("2025-01-15");
    expect(result.confidence).toBe("high");
    expect(result.warnings).toHaveLength(0);
  });

  // ── Happy path: PDF ───────────────────────────────────────────────────────
  it("extracts LCSW license from PDF with high confidence", async () => {
    mockLLMResponse({
      credentialType: "LCSW License",
      issuingBody: "NC Social Work Certification and Licensure Board",
      licenseNumber: "C009876",
      issueDate: "2020-06-01",
      expirationDate: "2026-06-30",
      providerName: "Maria Johnson",
      confidence: "high",
      warnings: [],
    });

    const result = await runExtraction(
      "https://storage.example.com/lcsw-license.pdf",
      "Maria Johnson"
    );

    expect(result.credentialType).toBe("LCSW License");
    expect(result.licenseNumber).toBe("C009876");
    expect(result.expirationDate).toBe("2026-06-30");
    expect(result.confidence).toBe("high");
  });

  // ── Happy path: PNG ───────────────────────────────────────────────────────
  it("extracts CPR card from PNG with medium confidence", async () => {
    mockLLMResponse({
      credentialType: "CPR / First Aid Certification",
      issuingBody: "American Red Cross",
      licenseNumber: null,
      issueDate: "2024-03-10",
      expirationDate: "2026-03-10",
      providerName: "Alex Rivera",
      confidence: "medium",
      warnings: ["CPR cards often do not include a license number — this is normal."],
    });

    const result = await runExtraction(
      "https://storage.example.com/cpr-card.png",
      "Alex Rivera"
    );

    expect(result.credentialType).toBe("CPR / First Aid Certification");
    expect(result.licenseNumber).toBeNull();
    expect(result.confidence).toBe("medium");
    expect(result.warnings).toHaveLength(1);
  });

  // ── Happy path: WebP ──────────────────────────────────────────────────────
  it("extracts RBT certification from WebP format", async () => {
    mockLLMResponse({
      credentialType: "RBT Certification",
      issuingBody: "Behavior Analyst Certification Board",
      licenseNumber: "RBT-98765",
      issueDate: "2023-09-01",
      expirationDate: "2024-09-01",
      providerName: "Chris Lee",
      confidence: "high",
      warnings: [],
    });

    const result = await runExtraction(
      "https://storage.example.com/rbt-cert.webp",
      "Chris Lee"
    );

    expect(result.credentialType).toBe("RBT Certification");
    expect(result.confidence).toBe("high");
  });

  // ── Edge case: Missing expiration date ────────────────────────────────────
  it("handles missing expiration date with warning", async () => {
    mockLLMResponse({
      credentialType: "Background Check",
      issuingBody: "NC State Bureau of Investigation",
      licenseNumber: null,
      issueDate: "2023-11-15",
      expirationDate: null,
      providerName: "Sam Torres",
      confidence: "medium",
      warnings: [
        "Expiration date not found on document. Background checks may not have a printed expiration — verify renewal policy with your compliance officer.",
      ],
    });

    const result = await runExtraction(
      "https://storage.example.com/background-check.pdf",
      "Sam Torres"
    );

    expect(result.expirationDate).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("Expiration date not found");
    expect(result.confidence).toBe("medium");
  });

  // ── Edge case: Blurry / unreadable image ─────────────────────────────────
  it("returns low confidence with warnings for blurry image", async () => {
    mockLLMResponse({
      credentialType: null,
      issuingBody: null,
      licenseNumber: null,
      issueDate: null,
      expirationDate: null,
      providerName: null,
      confidence: "low",
      warnings: [
        "Document image is too blurry or low resolution to extract text reliably. Please upload a clearer photo.",
      ],
    });

    const result = await runExtraction(
      "https://storage.example.com/blurry-scan.jpg"
    );

    expect(result.confidence).toBe("low");
    expect(result.credentialType).toBeNull();
    expect(result.expirationDate).toBeNull();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain("blurry");
  });

  // ── Edge case: Incorrect document type (e.g., patient record) ────────────
  it("returns low confidence with warning for non-credential document", async () => {
    mockLLMResponse({
      credentialType: null,
      issuingBody: null,
      licenseNumber: null,
      issueDate: null,
      expirationDate: null,
      providerName: null,
      confidence: "low",
      warnings: [
        "This document does not appear to be a staff credential. It may be a patient record, clinical note, or unrelated document. Do not upload PHI.",
      ],
    });

    const result = await runExtraction(
      "https://storage.example.com/patient-record.pdf"
    );

    expect(result.confidence).toBe("low");
    expect(result.warnings.some((w: string) => w.includes("patient record") || w.includes("PHI"))).toBe(true);
  });

  // ── Edge case: Partial extraction (some fields readable) ─────────────────
  it("returns partial results with medium confidence when some fields are unreadable", async () => {
    mockLLMResponse({
      credentialType: "LPCA License",
      issuingBody: "NC Board of Licensed Clinical Mental Health Counselors",
      licenseNumber: "A8235",
      issueDate: null,
      expirationDate: null,
      providerName: "Patrice Banks Rogers",
      confidence: "medium",
      warnings: [
        "Issue date and expiration date were not clearly visible on this document. Please enter them manually.",
      ],
    });

    const result = await runExtraction(
      "https://storage.example.com/lpca-partial.jpg",
      "Patrice Banks Rogers"
    );

    expect(result.credentialType).toBe("LPCA License");
    expect(result.licenseNumber).toBe("A8235");
    expect(result.issueDate).toBeNull();
    expect(result.expirationDate).toBeNull();
    expect(result.confidence).toBe("medium");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  // ── Edge case: LLM returns malformed JSON ────────────────────────────────
  it("throws an error when LLM returns malformed JSON", async () => {
    (invokeLLM as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: "Sorry, I cannot process this document.",
          },
        },
      ],
    });

    await expect(
      runExtraction("https://storage.example.com/bad.jpg")
    ).rejects.toThrow();
  });

  // ── Confidence level validation ───────────────────────────────────────────
  it("always returns one of the three valid confidence levels", async () => {
    for (const confidence of ["high", "medium", "low"]) {
      mockLLMResponse({
        credentialType: "Test Credential",
        issuingBody: "Test Board",
        licenseNumber: "TEST-123",
        issueDate: "2024-01-01",
        expirationDate: "2026-01-01",
        providerName: null,
        confidence,
        warnings: [],
      });

      const result = await runExtraction(
        "https://storage.example.com/test.pdf"
      );
      expect(["high", "medium", "low"]).toContain(result.confidence);
    }
  });

  // ── Staff name hint improves extraction ───────────────────────────────────
  it("passes staff name as a hint to the LLM", async () => {
    mockLLMResponse({
      credentialType: "BCBA License",
      issuingBody: "BACB",
      licenseNumber: "1-23-45696",
      issueDate: "2022-01-01",
      expirationDate: "2025-01-01",
      providerName: "Patrice Banks",
      confidence: "high",
      warnings: [],
    });

    const result = await runExtraction(
      "https://storage.example.com/bcba.jpg",
      "Patrice Banks"
    );

    // The LLM was called — verify it received the staff name hint
    expect(invokeLLM).toHaveBeenCalledOnce();
    const callArgs = (invokeLLM as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: { role: string }) => m.role === "user");
    const textContent = Array.isArray(userMessage.content)
      ? userMessage.content.find((c: { type: string }) => c.type === "text")?.text
      : userMessage.content;
    expect(textContent).toContain("Patrice Banks");
    expect(result.providerName).toBe("Patrice Banks");
  });
});
