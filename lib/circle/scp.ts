import { initiateSmartContractPlatformClient } from "@circle-fin/smart-contract-platform";

let _client: ReturnType<typeof initiateSmartContractPlatformClient> | null = null;

export function scpClient() {
  if (_client) return _client;
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey) throw new Error("Missing CIRCLE_API_KEY");
  if (!entitySecret) throw new Error("Missing CIRCLE_ENTITY_SECRET");
  _client = initiateSmartContractPlatformClient({ apiKey, entitySecret });
  return _client;
}
