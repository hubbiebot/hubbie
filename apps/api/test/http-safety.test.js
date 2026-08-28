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

function buildApp(readiness = async () => ({ ready: true })) {
  return createApp({ config, logger, readiness });
}

describe("HTTP safety defaults", () => {
  it("returns Problem Details without a stack for unexpected async errors", async () => {
    const response = await request(
      buildApp(async () => {
        throw new Error("connection string must not be exposed");
      }),
    ).get("/health/ready?token=must-not-appear");

    expect(response.status).toBe(500);
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.body).toMatchObject({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
    });
    expect(response.body).not.toHaveProperty("stack");
    expect(response.text).not.toContain(
      "connection string must not be exposed",
    );
    expect(response.body.instance).toBe("/health/ready");
  });

  it("rejects a JSON request larger than 256 KB", async () => {
    const response = await request(buildApp())
      .post("/health/live")
      .set("Content-Type", "application/json")
      .send({ payload: "x".repeat(256 * 1024 + 1) });

    expect(response.status).toBe(413);
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.body).toMatchObject({
      status: 413,
      title: "Payload Too Large",
    });
  });

  it("returns Problem Details with a request ID for an unknown route", async () => {
    const response = await request(buildApp()).get(
      "/missing?token=must-not-appear",
    );

    expect(response.status).toBe(404);
    expect(response.headers["x-request-id"]).toBeTruthy();
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.body).toMatchObject({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      instance: "/missing",
    });
  });

  it("allows only configured origins", async () => {
    const allowed = await request(buildApp())
      .get("/health/live")
      .set("Origin", "https://app.example.test");
    const denied = await request(buildApp())
      .get("/health/live")
      .set("Origin", "https://untrusted.example.test");

    expect(allowed.headers["access-control-allow-origin"]).toBe(
      "https://app.example.test",
    );
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("serves Swagger only in development", async () => {
    const development = createApp({
      config: { ...config, env: "development" },
      logger,
      readiness: async () => ({ ready: true }),
    });
    const production = createApp({
      config: { ...config, env: "production" },
      logger,
      readiness: async () => ({ ready: true }),
    });

    expect((await request(development).get("/api-docs")).status).toBe(200);
    expect((await request(production).get("/api-docs")).status).toBe(404);
  });
});
