import { Buffer } from "node:buffer";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export function createFieldCrypto({ resolveKey }) {
  function encryptField({ plaintext, aad, keyVersion }) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", resolveKey(keyVersion), iv);
    cipher.setAAD(Buffer.from(aad));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);

    return {
      ciphertext: ciphertext.toString("base64"),
      iv: iv.toString("base64"),
      keyVersion,
      tag: cipher.getAuthTag().toString("base64"),
    };
  }

  function decryptField(envelope, aad) {
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        resolveKey(envelope.keyVersion),
        Buffer.from(envelope.iv, "base64"),
      );
      decipher.setAAD(Buffer.from(aad));
      decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
      return Buffer.concat([
        decipher.update(Buffer.from(envelope.ciphertext, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new Error("AUTHENTICATION_FAILED");
    }
  }

  return { decryptField, encryptField };
}
