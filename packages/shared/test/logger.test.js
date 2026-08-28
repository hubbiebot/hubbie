import { describe, expect, it } from "vitest";
import { createLogger } from "../src/logging/logger.js";

describe("createLogger", () => {
  it("redacts sensitive values from structured JSON logs", () => {
    const lines = [];
    const logger = createLogger({ write: (line) => lines.push(line) });

    logger.error("http.request_failed", {
      requestId: "request-123",
      token: "access-token-value",
      nested: {
        phone: "+5511999999999",
        prompt: "ignore all prior instructions",
        content: "private customer message",
      },
    });

    expect(JSON.parse(lines[0])).toEqual({
      event: "http.request_failed",
      level: "error",
      nested: {
        content: "[REDACTED]",
        phone: "[REDACTED]",
        prompt: "[REDACTED]",
      },
      requestId: "request-123",
      token: "[REDACTED]",
    });
    expect(lines[0]).not.toContain("access-token-value");
    expect(lines[0]).not.toContain("+5511999999999");
    expect(lines[0]).not.toContain("private customer message");
  });
});
