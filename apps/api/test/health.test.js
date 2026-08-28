import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const config = {
  env: "test",
  allowedOrigins: ["https://app.example.test"],
};

const logger = {
  child() {
    return this;
  },
  error() {},
  info() {},
  warn() {},
};

describe("health endpoints", () => {
  it("keeps liveness independent of dependencies", async () => {
    const app = createApp({
      config,
      logger,
      readiness: async () => ({ ready: false }),
    });

    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns 503 when readiness is false", async () => {
    const app = createApp({
      config,
      logger,
      readiness: async () => ({ ready: false }),
    });

    const response = await request(app).get("/health/ready");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "unavailable" });
  });
});
