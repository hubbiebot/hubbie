import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { createFieldCrypto } from "../src/security/field-crypto.js";

describe("field crypto", () => {
  it("fails closed when ciphertext is read with another record AAD", () => {
    const crypto = createFieldCrypto({
      resolveKey: () => Buffer.alloc(32, 7),
    });
    const envelope = crypto.encryptField({
      plaintext: "+5511999999999",
      aad: "installation-1:contacts:phone:contact-1",
      keyVersion: 1,
    });

    expect(() =>
      crypto.decryptField(envelope, "installation-1:contacts:phone:contact-2"),
    ).toThrow("AUTHENTICATION_FAILED");
  });
});
