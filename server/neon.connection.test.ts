import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";

describe("Neon database connection", () => {
  it("should connect and execute a simple query via getDb()", async () => {
    // The project uses DATABASE_URL (mapped from NEON_DATABASE_URL in the platform)
    const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
    expect(dbUrl, "DATABASE_URL must be set").toBeTruthy();

    // Dynamically import to avoid module-level connection errors
    const { getDb } = await import("./db");
    const db = await getDb();
    expect(db, "Database connection should be established").not.toBeNull();

    const result = await db!.execute(sql`SELECT 1 AS ok`);
    // mysql2 drizzle returns rows as an array
    const rows = result[0] as unknown as Array<{ ok: number }>;
    expect(rows[0]?.ok).toBe(1);
  }, 15000);
});
