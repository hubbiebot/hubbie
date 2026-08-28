import { createLogger } from "@hubbie/shared/logging";
import { runWorkerProcess } from "@hubbie/shared/runtime";

const logger = createLogger({
  write: (line) => process.stdout.write(`${line}\n`),
});

runWorkerProcess({
  onStarted: () => logger.info("media-worker.started"),
  onStopFailed: () => logger.error("media-worker.stop_failed"),
  onStopped: () => logger.info("media-worker.stopped"),
});
