import { createIdleWorker } from "./idle-worker.js";

export function runWorkerProcess({
  createWorker = createIdleWorker,
  onStarted = () => {},
  onStopFailed = () => {},
  onStopped = () => {},
  processRef = process,
} = {}) {
  const worker = createWorker();
  let stopPromise;

  function stop() {
    if (stopPromise) return stopPromise;

    stopPromise = Promise.resolve(worker.close())
      .then(onStopped)
      .catch(() => {
        processRef.exitCode = 1;
        onStopFailed();
      });
    return stopPromise;
  }

  onStarted();

  for (const signal of ["SIGINT", "SIGTERM"]) {
    processRef.once(signal, stop);
  }

  return worker;
}
