const SENSITIVE_FIELD =
  /authorization|content|credential|message|name|password|phone|prompt|qr|secret|token/i;

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_FIELD.test(key) ? "[REDACTED]" : redact(item),
    ]),
  );
}

export function createLogger({ write = (line) => console.log(line) } = {}) {
  function log(level, event, metadata = {}) {
    write(JSON.stringify({ level, event, ...redact(metadata) }));
  }

  return {
    error: (event, metadata) => log("error", event, metadata),
    info: (event, metadata) => log("info", event, metadata),
    warn: (event, metadata) => log("warn", event, metadata),
  };
}
