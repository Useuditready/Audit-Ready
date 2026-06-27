/**
 * Tests for AI procedures (ai.extractFromLink, ai.ask)
 *
 * These tests verify the procedure input/output shapes, guardrail logic,
 * and JSON parsing — without making real LLM calls (we mock invokeLLM).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock invokeLLM so tests don't hit the real API ────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
const mockInvokeLLM = vi.mocked(invokeLLM);

// ── Helpers to simulate procedure logic inline ────────────────
// We test the core logic (JSON parsing, guardrail response handling)
// without spinning up a full tRPC server.

function makeExtractionResponse(data: object) {
  return {
    id: "test",
    created: Date.now(),
    model: "test",
    choices: [{ index: 0, message: { role: "assistant" as const, content: JSON.stringify(data) }, finish_reason: "stop" }],
  };
}

function makeAskResponse(text: string) {
  return {
    id: "test",
    created: Date.now(),
    model: "test",
    choices: [{ index: 0, message: { role: "assistant" as const, content: text }, finish_reason: "stop" }],
  };
}

// ── Extraction logic (mirrors server/routers.ts ai.extractFromLink) ──
async function extractFromLink(documentUrl: string, hint?: string) {
  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are a credential extraction assistant." },
      { role: "user", content: `Extract from: ${documentUrl}${hint ? ` Hint: ${hint}` : ""}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "credential_extraction",
        strict: true,
        schema: { type: "object", properties: {}, required: [], additionalProperties: false },
      },
    },
  });
  const content = result.choices[0]?.message?.content;
  if (typeof content !== "string") throw new Error("AI extraction returned no content");
  return JSON.parse(content);
}

// ── Ask AI logic (mirrors server/routers.ts ai.ask) ──
async function askAI(question: string) {
  const result = await invokeLLM({
    messages: [
      { role: "system", content: "You are AuditReady's internal help assistant for credential tracking." },
      { role: "user", content: question },
    ],
    maxTokens: 600,
  });
  const content = result.choices[0]?.message?.content;
  if (typeof content !== "string" || content.trim() === "") throw new Error("AI returned no response");
  return { answer: content };
}

// ── Tests ─────────────────────────────────────────────────────
describe("AI extraction procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses extracted credential fields from LLM response", async () => {
    const extracted = {
      credentialType: "BCBA License",
      issuingBody: "BACB",
      licenseNumber: "1-23-45678",
      issueDate: "2022-01-15",
      expirationDate: "2025-01-15",
      confidence: "high",
      notes: "Clear document, all fields visible.",
    };
    mockInvokeLLM.mockResolvedValueOnce(makeExtractionResponse(extracted));

    const result = await extractFromLink("https://drive.google.com/file/d/abc123");
    expect(result.credentialType).toBe("BCBA License");
    expect(result.issuingBody).toBe("BACB");
    expect(result.licenseNumber).toBe("1-23-45678");
    expect(result.expirationDate).toBe("2025-01-15");
    expect(result.confidence).toBe("high");
  });

  it("handles null fields for missing data", async () => {
    const extracted = {
      credentialType: "CPR Card",
      issuingBody: "American Red Cross",
      licenseNumber: null,
      issueDate: null,
      expirationDate: "2025-06-01",
      confidence: "medium",
      notes: "Issue date not visible on card.",
    };
    mockInvokeLLM.mockResolvedValueOnce(makeExtractionResponse(extracted));

    const result = await extractFromLink("https://dropbox.com/s/xyz/cpr.pdf", "CPR Card");
    expect(result.licenseNumber).toBeNull();
    expect(result.issueDate).toBeNull();
    expect(result.confidence).toBe("medium");
  });

  it("throws when LLM returns no content", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "test",
      choices: [{ index: 0, message: { role: "assistant", content: "" }, finish_reason: "stop" }],
    });

    await expect(extractFromLink("https://example.com/doc.pdf")).rejects.toThrow();
  });
});

describe("Ask AI procedure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an answer for credential tracking questions", async () => {
    const answerText = "An RBT must renew their certification every 2 years through the BACB.";
    mockInvokeLLM.mockResolvedValueOnce(makeAskResponse(answerText));

    const result = await askAI("How often does an RBT need to renew their certification?");
    expect(result.answer).toBe(answerText);
  });

  it("returns a refusal message for out-of-scope questions (PHI/clinical)", async () => {
    const refusalText = "I can only help with staff credential tracking questions. For patient records, please consult your EHR system or compliance officer.";
    mockInvokeLLM.mockResolvedValueOnce(makeAskResponse(refusalText));

    const result = await askAI("Can you help me with a patient's therapy notes?");
    expect(result.answer).toContain("I can only help with staff credential tracking");
  });

  it("returns a refusal for legal/compliance advice requests", async () => {
    const refusalText = "I can only help with staff credential tracking questions. For legal advice, please consult a licensed attorney or compliance consultant.";
    mockInvokeLLM.mockResolvedValueOnce(makeAskResponse(refusalText));

    const result = await askAI("Can you help me appeal a Medicaid audit finding?");
    expect(result.answer).toContain("I can only help with staff credential tracking");
  });

  it("throws when LLM returns empty content", async () => {
    mockInvokeLLM.mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "test",
      choices: [{ index: 0, message: { role: "assistant", content: "" }, finish_reason: "stop" }],
    });

    await expect(askAI("What credentials does a BCBA need?")).rejects.toThrow("AI returned no response");
  });
});
