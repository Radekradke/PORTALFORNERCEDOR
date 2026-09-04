import { describe, expect, it } from "vitest";
import { generateOpaqueToken, hashToken } from "@/lib/tokens";

describe("tokens.ts", () => {
  it("gera tokens opacos únicos", () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toEqual(b);
    expect(a.length).toBeGreaterThan(20);
  });

  it("hash é determinístico e não reversível trivialmente", () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toEqual(hashToken(token));
    expect(hashToken(token)).not.toEqual(token);
  });
});
