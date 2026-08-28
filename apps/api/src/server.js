import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createLogger } from "@hubbie/shared/logging";
import { createApp } from "./app.js";

export async function startServer({
  config,
  logger,
  readiness,
  onStopping = () => {},
}) {
  const app = createApp({ config, logger, readiness });
  const httpServer = createServer(app);
  let closePromise;

  await new Promise((resolve, reject) => {
    httpServer.once("error", reject);
    httpServer.listen(config.port, () => {
      httpServer.off("error", reject);
      resolve();
    });
  });

  async function close() {
    if (closePromise) return closePromise;

    closePromise = new Promise((resolve, reject) => {
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve();
      };
      const timeout = setTimeout(() => {
        httpServer.closeAllConnections?.();
        finish();
      }, config.shutdownTimeoutMs);

      onStopping();
      httpServer.close(finish);
    });

    return closePromise;
  }

  return { close, readiness, httpServer };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { loadConfig } = await import("@hubbie/shared/config");
  const config = loadConfig(process.env);
  const logger = createLogger();
  let acceptingTraffic = true;
  const server = await startServer({
    config,
    logger,
    readiness: async () => ({ ready: acceptingTraffic }),
    onStopping: () => {
      acceptingTraffic = false;
    },
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, async () => {
      await server.close();
      process.exit(0);
    });
  }
}
