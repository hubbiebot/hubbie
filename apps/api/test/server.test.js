import { createConnection } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { startServer } from "../src/server.js";

const servers = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("startServer", () => {
  it("marks readiness false before closing the HTTP server", async () => {
    let ready = true;
    const server = await startServer({
      config: {
        env: "test",
        port: 0,
        allowedOrigins: [],
        shutdownTimeoutMs: 100,
      },
      logger: { info() {}, error() {} },
      readiness: async () => ({ ready }),
      onStopping: () => {
        ready = false;
      },
    });
    servers.push(server);

    await server.close();

    expect(await server.readiness()).toEqual({ ready: false });
  });

  it("forces shutdown within the configured timeout when a connection remains open", async () => {
    const server = await startServer({
      config: {
        env: "test",
        port: 0,
        allowedOrigins: [],
        shutdownTimeoutMs: 50,
      },
      logger: { info() {}, error() {} },
      readiness: async () => ({ ready: true }),
    });
    servers.push(server);
    const socket = createConnection(server.httpServer.address().port);
    await new Promise((resolve) => socket.once("connect", resolve));

    const closedWithinDeadline = await Promise.race([
      server.close().then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 250)),
    ]);

    socket.destroy();
    expect(closedWithinDeadline).toBe(true);
  });
});
