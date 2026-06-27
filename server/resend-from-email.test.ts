import { describe, it, expect } from "vitest";

describe("RESEND_FROM_EMAIL", () => {
  it("should be set to a useauditready.com address", () => {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
    expect(fromEmail).toContain("useauditready.com");
  });
});
