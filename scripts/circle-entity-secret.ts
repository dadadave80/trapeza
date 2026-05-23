/**
 * Usage:
 *   bun scripts/circle-entity-secret.ts generate
 *   bun scripts/circle-entity-secret.ts ciphertext
 *   bun scripts/circle-entity-secret.ts register
 *
 * `generate`   prints a new 32-byte hex secret. Copy into .env.local as CIRCLE_ENTITY_SECRET.
 * `ciphertext` prints the 684-char RSA-encrypted ciphertext to paste into the Circle Console.
 *              Requires CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET.
 * `register`   uploads the ciphertext via SDK and writes the recovery file to ./recovery/.
 *              Requires CIRCLE_API_KEY + CIRCLE_ENTITY_SECRET.
 */
import {
  generateEntitySecret,
  generateEntitySecretCiphertext,
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";

const cmd = process.argv[2];

if (cmd === "generate") {
  generateEntitySecret();
} else if (cmd === "ciphertext") {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey) throw new Error("Missing CIRCLE_API_KEY in env");
  if (!entitySecret) throw new Error("Missing CIRCLE_ENTITY_SECRET in env");

  const ciphertext = await generateEntitySecretCiphertext({ apiKey, entitySecret });
  if (!ciphertext) throw new Error("No ciphertext returned");
  console.log(ciphertext);
} else if (cmd === "register") {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey) throw new Error("Missing CIRCLE_API_KEY in env");
  if (!entitySecret) throw new Error("Missing CIRCLE_ENTITY_SECRET in env");

  const response = await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: "./recovery",
  });

  const recoveryFile = response.data?.recoveryFile;
  if (recoveryFile) {
    console.log("Registered. Recovery file written to ./recovery/");
  } else {
    console.log("Registered. No recovery file payload returned.");
  }
} else {
  console.error("Usage: bun scripts/circle-entity-secret.ts <generate|ciphertext|register>");
  process.exit(1);
}
