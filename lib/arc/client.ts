import { createPublicClient, http } from "viem";
import { arcTestnet } from "viem/chains";

// arcTestnet ships with viem (chainId 5042002). Do NOT call defineChain —
// see docs/circlefin-skills/use-arc.md "Best Practices".

let _public: ReturnType<typeof createPublicClient> | null = null;

export function publicArc() {
  if (_public) return _public;
  const rpcUrl = process.env.ARC_RPC_URL ?? arcTestnet.rpcUrls.default.http[0];
  _public = createPublicClient({
    chain: arcTestnet,
    transport: http(rpcUrl),
  });
  return _public;
}

export { arcTestnet };
