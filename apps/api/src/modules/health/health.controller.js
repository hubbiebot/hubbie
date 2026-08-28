export function createHealthController({ readiness }) {
  return {
    live(_request, response) {
      response.status(200).json({ status: "ok" });
    },

    async ready(_request, response) {
      const result = await readiness();
      const status = result.ready ? 200 : 503;
      response
        .status(status)
        .json({ status: result.ready ? "ok" : "unavailable" });
    },
  };
}
