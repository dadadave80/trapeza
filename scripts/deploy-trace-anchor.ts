/**
 * One-off: compile contracts/TraceAnchor.sol with evmVersion=paris (avoid
 * PUSH0 — Arc Testnet rejects it; see docs/circlefin-skills/use-smart-contract-platform.md)
 * and deploy via Circle Smart Contract Platform.
 *
 * Usage:
 *   bun run deploy-anchor
 *
 * Required env:
 *   CIRCLE_API_KEY
 *   CIRCLE_ENTITY_SECRET
 *   CIRCLE_DEPLOY_WALLET_ID  — a wallet in your set with enough USDC to pay gas on Arc
 *
 * Prints the deployed contract address — paste into .env.local (and Vercel
 * env) as TRACE_ANCHOR_ADDRESS.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import solc from "solc";
import { scpClient } from "@/lib/circle/scp";

const apiKey = process.env.CIRCLE_API_KEY;
const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
const walletId = process.env.CIRCLE_DEPLOY_WALLET_ID;
if (!apiKey) throw new Error("Missing CIRCLE_API_KEY");
if (!entitySecret) throw new Error("Missing CIRCLE_ENTITY_SECRET");
if (!walletId)
  throw new Error(
    "Missing CIRCLE_DEPLOY_WALLET_ID — create a wallet in your wallet set, fund it from faucet.circle.com, then set this env to its id",
  );

const source = readFileSync(join(process.cwd(), "contracts/TraceAnchor.sol"), "utf8");

const input = {
  language: "Solidity",
  sources: { "TraceAnchor.sol": { content: source } },
  settings: {
    evmVersion: "paris", // critical for Arc Testnet (no PUSH0)
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode.object"] },
    },
  },
};

console.error("Compiling TraceAnchor.sol with evmVersion=paris ...");
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors?.some((e: { severity: string }) => e.severity === "error")) {
  console.error("Solidity compile errors:");
  for (const e of output.errors) console.error(e.formattedMessage ?? e.message);
  process.exit(1);
}

const contract = output.contracts["TraceAnchor.sol"]["TraceAnchor"];
const bytecode = `0x${contract.evm.bytecode.object}` as `0x${string}`;
const abi = contract.abi;

if (!bytecode || bytecode === "0x") {
  console.error("Compilation produced no bytecode");
  process.exit(1);
}
console.error(`Compiled. Bytecode size: ${(bytecode.length - 2) / 2} bytes.`);

const scp = scpClient();

console.error("Deploying via Circle Smart Contract Platform ...");
const deployRes = await scp.deployContract({
  blockchain: "ARC-TESTNET",
  name: "TraceAnchor",
  description: "Pins SHA-256 of Trapeza agent reasoning traces onchain.",
  walletId,
  bytecode,
  abiJson: JSON.stringify(abi),
  constructorParameters: [],
  fee: { type: "level", config: { feeLevel: "MEDIUM" } },
  idempotencyKey: crypto.randomUUID(),
});

const contractId = deployRes.data?.contractId;
if (!contractId) {
  console.error("No contractId returned:", JSON.stringify(deployRes.data, null, 2));
  process.exit(1);
}
console.error(`Deploy initiated. Contract id: ${contractId}`);
console.error("Polling deployment status (this can take 30s-2min) ...");

for (let i = 0; i < 120; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const status = await scp.getContract({ id: contractId });
  const c = status.data?.contract;
  const ds = c?.status;
  if (i % 5 === 0) console.error(`[poll ${i}] status=${ds ?? "(unknown)"}`);
  if (ds === "COMPLETE") {
    const addr = c?.contractAddress;
    if (!addr) {
      console.error("COMPLETE but no contractAddress in response:", JSON.stringify(c, null, 2));
      process.exit(1);
    }
    console.log(addr);
    console.error(`\n✓ Deployed at ${addr}`);
    console.error("Paste into .env.local and Vercel env as TRACE_ANCHOR_ADDRESS, then redeploy.");
    process.exit(0);
  }
  if (ds === "FAILED") {
    console.error("Deployment FAILED:", c?.deploymentErrorReason, c?.deploymentErrorDetails);
    process.exit(1);
  }
}

console.error("Timed out polling. Check Circle console manually with contractId:", contractId);
process.exit(1);
