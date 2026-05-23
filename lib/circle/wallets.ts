import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";
import { CIRCLE_ARC_BLOCKCHAIN } from "@/lib/constants";

let _client: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

export function circleClient() {
  if (_client) return _client;
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey) throw new Error("Missing CIRCLE_API_KEY");
  if (!entitySecret) throw new Error("Missing CIRCLE_ENTITY_SECRET");
  _client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  return _client;
}

export type CircleWallet = {
  id: string;
  address: `0x${string}`;
  blockchain: string;
};

// Creates a single SCA wallet on Arc Testnet for the given user. The refId
// links the Circle wallet back to our Supabase user.id for traceability.
export async function createUserWallet(refId: string): Promise<CircleWallet> {
  const client = circleClient();
  const walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  if (!walletSetId) throw new Error("Missing CIRCLE_WALLET_SET_ID");

  const res = await client.createWallets({
    accountType: "SCA",
    blockchains: [CIRCLE_ARC_BLOCKCHAIN],
    walletSetId,
    count: 1,
    metadata: [{ name: `trapeza-${refId.slice(0, 8)}`, refId }],
    idempotencyKey: crypto.randomUUID(),
  });

  const wallet = res.data?.wallets?.[0];
  if (!wallet?.address) throw new Error("Circle returned no wallet");

  return {
    id: wallet.id,
    address: wallet.address as `0x${string}`,
    blockchain: wallet.blockchain,
  };
}

export async function getWallet(walletId: string): Promise<CircleWallet | null> {
  const client = circleClient();
  const res = await client.getWallet({ id: walletId });
  const w = res.data?.wallet;
  if (!w?.address) return null;
  return {
    id: w.id,
    address: w.address as `0x${string}`,
    blockchain: w.blockchain,
  };
}
