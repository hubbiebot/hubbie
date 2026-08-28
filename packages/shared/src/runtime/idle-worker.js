export function createIdleWorker({ onStopping = () => {} } = {}) {
  let stopping = false;
  let closePromise;
  const livenessHandle = setInterval(() => {}, 2 ** 31 - 1);

  function close() {
    if (closePromise) return closePromise;

    closePromise = Promise.resolve().then(() => {
      stopping = true;
      onStopping();
      clearInterval(livenessHandle);
    });

    return closePromise;
  }

  return {
    close,
    isStopping: () => stopping,
  };
}
