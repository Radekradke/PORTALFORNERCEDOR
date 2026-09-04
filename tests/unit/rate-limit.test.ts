import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("rate-limit.ts", () => {
  it("permite requisições até o limite e bloqueia a partir daí", () => {
    const key = `test:${Math.random()}`;
    const max = 3;
    const windowMs = 60_000;

    expect(checkRateLimit(key, max, windowMs).allowed).toBe(true);
    expect(checkRateLimit(key, max, windowMs).allowed).toBe(true);
    expect(checkRateLimit(key, max, windowMs).allowed).toBe(true);

    const blocked = checkRateLimit(key, max, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("isola contadores por chave", () => {
    const keyA = `test-a:${Math.random()}`;
    const keyB = `test-b:${Math.random()}`;

    checkRateLimit(keyA, 1, 60_000);
    const blockedA = checkRateLimit(keyA, 1, 60_000);
    const allowedB = checkRateLimit(keyB, 1, 60_000);

    expect(blockedA.allowed).toBe(false);
    expect(allowedB.allowed).toBe(true);
  });
});
