import { createLogger } from "@hubbie/shared/logging";
import { runWorkerProcess } from "@hubbie/shared/runtime";

const logger = createLogger({
  write: (line) => process.stdout.write(`${line}\n`),
});

runWorkerProcess({
  onStarted: () => logger.info("worker.started"),
  onStopFailed: () => logger.error("worker.stop_failed"),
  onStopped: () => logger.info("worker.stopped"),
});
