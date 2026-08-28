import { once } from "node:events";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rootDirectory = fileURLToPath(new URL("../../..", import.meta.url));

async function startsAndStops(entrypoint) {
  const child = spawn(process.execPath, [entrypoint], {
    cwd: rootDirectory,
    stdio: ["ignore", "pipe", "ignore"],
  });
  const exit = once(child, "exit");
  const output = [];
  const started = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("Worker did not announce readiness."));
    }, 1000);

    child.stdout.on("data", (chunk) => {
      clearTimeout(timeout);
      output.push(chunk.toString());
      resolve();
    });
  });

  await started;
  if (child.exitCode === null) child.kill("SIGTERM");
  const [code, signal] = await exit;

  return { code, output: output.join(""), signal };
}

function parseEvents(output) {
  return output
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line).event);
}

describe("empty worker processes", () => {
  it.each([
    ["apps/worker/src/server.js", "worker"],
    ["apps/media-worker/src/server.js", "media-worker"],
  ])(
    "announces lifecycle and exits cleanly after SIGTERM: %s",
    async (entrypoint, name) => {
      const result = await startsAndStops(entrypoint);

      expect(parseEvents(result.output)).toContain(`${name}.started`);

      if (process.platform === "win32") {
        expect(result).toMatchObject({ code: null, signal: "SIGTERM" });
      } else {
        expect(result).toMatchObject({ code: 0, signal: null });
        expect(parseEvents(result.output)).toContain(`${name}.stopped`);
      }
    },
  );
});
