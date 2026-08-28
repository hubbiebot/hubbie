import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { createBlindIndex } from "../src/security/blind-index.js";

describe("blind index", () => {
  it("returns a stable HMAC digest without exposing the source value", () => {
    const blindIndex = createBlindIndex({ key: Buffer.alloc(32, 3) });

    const first = blindIndex("+5511999999999");
    const second = blindIndex("+5511999999999");

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("5511999999999");
  });
});
