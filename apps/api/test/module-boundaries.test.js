import { ESLint } from "eslint";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rootDirectory = fileURLToPath(new URL("../../..", import.meta.url));
describe("module boundaries", () => {
  it("rejects imports of another module internal files", async () => {
    const eslint = new ESLint({ cwd: rootDirectory });
    const [result] = await eslint.lintText(
      "import { findUser } from '../users/users.repository.js';\nexport function loadOrder() { return findUser(); }",
      { filePath: "apps/api/src/modules/orders/orders.service.js" },
    );

    expect(result.errorCount).toBe(1);
    expect(result.messages[0]).toMatchObject({
      ruleId: "no-restricted-imports",
    });
  });
});
