import { describe, expect, it } from "vitest";

describe("secrets validation", () => {
  it("CLERK_PUBLISHABLE_KEY is set and starts with pk_", () => {
    const key = process.env.CLERK_PUBLISHABLE_KEY;
    expect(key).toBeDefined();
    expect(key!.startsWith("pk_")).toBe(true);
  });

  it("CLERK_SECRET_KEY is set and starts with sk_", () => {
    const key = process.env.CLERK_SECRET_KEY;
    expect(key).toBeDefined();
    expect(key!.startsWith("sk_")).toBe(true);
  });

  it("STRIPE_PUBLISHABLE_KEY is set and starts with pk_", () => {
    const key = process.env.STRIPE_PUBLISHABLE_KEY;
    expect(key).toBeDefined();
    expect(key!.startsWith("pk_")).toBe(true);
  });

  it("NEON_DATABASE_URL is set and starts with postgresql://", () => {
    const url = process.env.NEON_DATABASE_URL;
    expect(url).toBeDefined();
    expect(url!.startsWith("postgresql://")).toBe(true);
  });
});
