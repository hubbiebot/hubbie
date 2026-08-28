function statusFor(error) {
  if (error.type === "entity.too.large") return 413;
  if (
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status < 600
  )
    return error.status;
  return 500;
}

function titleFor(status) {
  if (status === 404) return "Not Found";
  if (status === 413) return "Payload Too Large";
  if (status === 400) return "Bad Request";
  return "Internal Server Error";
}

export function errorHandler(error, request, response, _next) {
  const status = statusFor(error);
  const requestId = request.id;

  request.app.locals.logger.error("http.request_failed", {
    requestId,
    status,
    errorName: error.name,
  });

  response
    .status(status)
    .type("application/problem+json")
    .json({
      type: "about:blank",
      title: titleFor(status),
      status,
      detail:
        status === 500 ? "An unexpected error occurred." : titleFor(status),
      instance: request.path,
      requestId,
    });
}
