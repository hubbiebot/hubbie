const ENVIRONMENTS = new Set(["development", "test", "production"]);

function configError() {
  return new Error("CONFIG_INVALID");
}

function parseOrigins(value) {
  if (typeof value !== "string" || value.trim() === "") throw configError();

  return value.split(",").map((origin) => {
    const normalized = origin.trim();
    let parsed;
    try {
      parsed = new URL(normalized);
    } catch {
      throw configError();
    }

    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== normalized
    ) {
      throw configError();
    }

    return normalized;
  });
}

function parseShutdownTimeout(value) {
  const timeout = Number(value);
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 120_000) {
    throw configError();
  }

  return timeout;
}

export function loadConfig(source) {
  const env = source.NODE_ENV;
  const port = Number(source.PORT);
  const shutdownTimeoutMs = parseShutdownTimeout(source.SHUTDOWN_TIMEOUT_MS);

  if (
    !ENVIRONMENTS.has(env) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw configError();
  }

  return Object.freeze({
    env,
    port,
    allowedOrigins: Object.freeze(parseOrigins(source.ALLOWED_ORIGINS)),
    shutdownTimeoutMs,
  });
}
