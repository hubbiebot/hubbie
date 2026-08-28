import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import swaggerUi from "swagger-ui-express";
import { parse } from "yaml";

const specUrl = new URL(
  "../../../../packages/contracts/openapi/openapi.yaml",
  import.meta.url,
);

export function mountSwagger(app, { env, specPath = fileURLToPath(specUrl) }) {
  if (env !== "development") return;

  const specification = parse(readFileSync(specPath, "utf8"));
  app.get("/api-docs", swaggerUi.setup(specification));
  app.use("/api-docs", swaggerUi.serve);
}
