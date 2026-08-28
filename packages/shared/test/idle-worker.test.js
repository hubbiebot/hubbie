import { describe, expect, it } from "vitest";
import { createIdleWorker } from "../src/runtime/idle-worker.js";
import { runWorkerProcess } from "../src/runtime/run-worker-process.js";

describe("createIdleWorker", () => {
  it("signals stopping once and closes idempotently", async () => {
    let stoppingSignals = 0;
    const worker = createIdleWorker({
      onStopping: () => {
        stoppingSignals += 1;
      },
    });

    expect(worker.isStopping()).toBe(false);

    await Promise.all([worker.close(), worker.close()]);

    expect(worker.isStopping()).toBe(true);
    expect(stoppingSignals).toBe(1);
  });
});

describe("runWorkerProcess", () => {
  it("closes the worker when the process receives SIGTERM", async () => {
    const listeners = new Map();
    let closed = false;
    const processRef = {
      once: (signal, handler) => listeners.set(signal, handler),
    };

    runWorkerProcess({
      createWorker: () => ({
        close: async () => {
          closed = true;
        },
      }),
      processRef,
    });

    listeners.get("SIGTERM")();

    expect(closed).toBe(true);
  });

  it("emits lifecycle callbacks around SIGTERM", async () => {
    const listeners = new Map();
    const events = [];
    const processRef = {
      once: (signal, handler) => listeners.set(signal, handler),
    };

    runWorkerProcess({
      createWorker: () => ({ close: async () => {} }),
      onStarted: () => events.push("started"),
      onStopped: () => events.push("stopped"),
      processRef,
    });

    await listeners.get("SIGTERM")();

    expect(events).toEqual(["started", "stopped"]);
  });

  it("marks the process as failed when worker shutdown rejects", async () => {
    const listeners = new Map();
    const events = [];
    const processRef = {
      exitCode: 0,
      once: (signal, handler) => listeners.set(signal, handler),
    };

    runWorkerProcess({
      createWorker: () => ({
        close: async () => {
          throw new Error("worker shutdown failed");
        },
      }),
      onStopFailed: () => events.push("stop.failed"),
      processRef,
    });

    await expect(listeners.get("SIGTERM")()).resolves.toBeUndefined();

    expect(processRef.exitCode).toBe(1);
    expect(events).toEqual(["stop.failed"]);
  });
});
