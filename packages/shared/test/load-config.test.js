import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/load-config.js";

describe("loadConfig", () => {
  it("rejects missing PORT without exposing configuration values", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        ALLOWED_ORIGINS: "https://app.example.test",
      }),
    ).toThrow("CONFIG_INVALID");
  });

  it("rejects origins that are not absolute HTTP URLs", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        PORT: "3000",
        ALLOWED_ORIGINS: "/relative",
        SHUTDOWN_TIMEOUT_MS: "5000",
      }),
    ).toThrow("CONFIG_INVALID");
  });

  it("rejects a missing shutdown timeout", () => {
    expect(() =>
      loadConfig({
        NODE_ENV: "development",
        PORT: "3000",
        ALLOWED_ORIGINS: "https://app.example.test",
      }),
    ).toThrow("CONFIG_INVALID");
  });

  it("returns immutable validated configuration", () => {
    const config = loadConfig({
      NODE_ENV: "development",
      PORT: "3000",
      ALLOWED_ORIGINS: "https://app.example.test,https://admin.example.test",
      SHUTDOWN_TIMEOUT_MS: "5000",
    });

    expect(config).toEqual({
      env: "development",
      port: 3000,
      allowedOrigins: [
        "https://app.example.test",
        "https://admin.example.test",
      ],
      shutdownTimeoutMs: 5000,
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.allowedOrigins)).toBe(true);
    expect(() =>
      config.allowedOrigins.push("https://untrusted.example.test"),
    ).toThrow();
  });
});
