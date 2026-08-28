import { createHmac } from "node:crypto";

export function createBlindIndex({ key }) {
  return (canonicalValue) =>
    createHmac("sha256", key).update(canonicalValue, "utf8").digest("hex");
}
