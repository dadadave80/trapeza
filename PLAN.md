# Ultraplan — Trapeza

> **Trapeza** (τράπεζα) · Greek for "table." The money-changers' tables of the Athenian agora — the original site of capital allocation, and the etymological root of modern banking. The hackathon site puts it directly: *"money-changers leaned on their tables."* Trapeza is an adaptive portfolio manager that takes its seat at the same table, now powered by AI and settled on Arc.

**Target:** Agora Agents Hackathon (Canteen × Circle), RFB-04
**Deadline:** May 25, 2026 (≈48 hours from now)
**Build mode:** Solo or small team, Claude Code at the wheel
**Runtime:** Bun · **LLM:** Google Gemini · **Settlement:** Arc + USDC

---

## 0. Read this first

This plan is written for Claude Code to execute against, with a human reviewer checkpointing between phases. It assumes ~48 hours of effective build time, which means **the only thing that matters is shipping a working product real users have touched.** Architectural elegance is a tie-breaker, not a goal.

Three rules of engagement for Claude Code:

1. **Ship the demo path first.** Onboard → deposit → rebalance → see result. Everything else is decoration.
2. **Real onchain calls, real users.** A simulator does not score on traction. Mock data does not score on agentic sophistication.
3. **Commit and deploy after every phase.** A deployed v0.1 is worth ten times an undeployed v0.7.

**Skill-first rule (non-negotiable):** Before writing or modifying any Circle/Arc code path, open the matching `~/.arc-canteen/context/docs/circlefin-skills/*.md` file and follow its setup + best-practice rules. Those skills are the authoritative spec; per-page docs at `developers.circle.com` and `docs.arc.network` are secondary. The `AGENTS.md` at the repo root is the index — it maps each task to the skill that owns it.

---

## 1. The product, in one paragraph

**Trapeza** is a goal-based adaptive portfolio manager on Arc testnet. A user signs up, picks a risk profile (Conservative / Balanced / Aggressive), and deposits USDC into an embedded Circle wallet. A Gemini-powered agent runs every 15 minutes: it reads market signals, classifies the current regime (risk-on / risk-off / neutral), decides target allocations across **{USDC cash, EURC safe-FX, cirBTC risk}**, and executes the rebalance onchain via Circle App Kit's Swap capability. The user sees their portfolio, the current regime, and the agent's reasoning trace for every decision. Every decision is hash-pinned onchain so the trace is verifiable.

That's it. That's the whole product. Two screens, one agent loop, one rebalance flow.

> **Why these three tokens?** Per `app-kit/references/supported-blockchains.md`, **Arc Testnet Swap supports USDC, EURC, and cirBTC only.** USYC, USDT, and risk-asset substitutes are not routable through App Kit on Arc testnet. The earlier draft of this plan used USYC; it's been replaced with EURC (safe-FX leg) and cirBTC (risk leg) so the agent can actually execute its decisions through a supported Circle product surface.

---

## 2. Why this angle wins on the rubric

The judging weights are **30% agentic sophistication, 30% traction, 20% Circle tool usage, 20% innovation.** This product maps cleanly:

- **Agency (30%)** — the agent makes real decisions (regime classification, target weights, rebalance timing) rather than executing a fixed rule. The reasoning trace is the proof.
- **Traction (30%)** — frictionless onboarding via Circle Developer-Controlled Wallets. The single deposit flow gives us a clean "real user deposited real testnet USDC" metric.
- **Circle tools (20%)** — five Circle product surfaces, each load-bearing:
  1. **USDC** — deposits, balances, and the native gas token on Arc (`use-usdc.md`, `use-arc.md`).
  2. **Wallets / Developer-Controlled** — `@circle-fin/developer-controlled-wallets` for custody and signing (`use-developer-controlled-wallets.md`).
  3. **App Kit Swap** — `@circle-fin/app-kit` + `@circle-fin/adapter-circle-wallets` for the rebalance leg (`docs/docs.arc.network/app-kit/swap.md`).
  4. **Smart Contract Platform** — `@circle-fin/smart-contract-platform` to deploy `TraceAnchor.sol` from bytecode and to monitor `TraceAnchored` events via webhook (`use-smart-contract-platform.md`).
  5. **Webhooks** — Circle's signed `X-Circle-Signature` webhook for transaction state changes; replaces polling, per the best-practice rule in `use-developer-controlled-wallets.md`.
- **Innovation (20%)** — the onchain-pinned reasoning trace is novel and ties into the Trading-R1 research item on the site. Mention it in the README; judges will recognize the reference. The Greek-banking name is also a deliberate signal: we read the brief.

> **Why no Paymaster?** Because **Arc uses USDC as its native gas token** (`use-arc.md` → "Core Concepts"). The Paymaster product exists on chains where USDC needs a sponsor; on Arc it's redundant and would not register as a real product integration. The slot is reallocated to Smart Contract Platform, which is where the onchain anchor lives.

What this plan deliberately does **not** chase: cross-chain (CCTP/Gateway adds a day we don't have — see `bridge-stablecoin.md` and `use-gateway.md` for what we're skipping), tax-loss harvesting (depends on lot-tracking we can't build credibly in 48h), perp positions (RFB-01 territory, not ours), copy-trading (RFB-06 territory).

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 16 app (Vercel) · Bun runtime · App Router         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Onboarding   │  │ Dashboard    │  │ Decision history │ │
│  │ /onboard     │  │ /portfolio   │  │ /trace/[id]      │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘ │
│         │                 │                    │            │
│         └────────────┬────┴────────────────────┘            │
│                      ▼                                       │
│              Next.js API routes                              │
│   /api/wallet  /api/portfolio  /api/agent/run  /api/trace   │
│   /api/webhooks/circle    (signed Circle txn callbacks)     │
└────────┬──────────────┬──────────────┬──────────────────────┘
         │              │              │
         ▼              ▼              ▼
   ┌──────────┐  ┌─────────────┐  ┌──────────────┐
   │ Supabase │  │ Circle SDKs │  │ Google Gemini│
   │ Postgres │  │ (Wallets +  │  │ (3-flash +   │
   │          │  │ App Kit +   │  │  3.1-pro)    │
   │          │  │ SCP)        │  │              │
   └──────────┘  └──────┬──────┘  └──────┬───────┘
                        │                 │
                        ▼                 │
              ┌─────────────────┐        │
              │ Arc testnet     │◄───────┘
              │ chainId 5042002 │   viem reads
              │ rpc.testnet.arc │   (App Kit handles writes)
              │ .network        │
              └─────────────────┘
                        ▲
                        │
              ┌─────────┴───────┐
              │ Vercel Cron     │
              │ every 15 min    │  ─► triggers /api/agent/run
              └─────────────────┘
```

**Data flow per rebalance cycle:**

1. Vercel Cron hits `/api/agent/run` every 15 min.
2. Route fetches: market signals (price feeds, volatility), current portfolio state (read via viem against Arc), regime history.
3. Calls **Gemini 3 Flash** for fast signal classification ("is this a regime-shift candidate?").
4. If yes, calls **Gemini 3.1 Pro** for the full decision (target weights + reasoning trace).
5. Computes diff between current and target allocation.
6. Executes swaps via `@circle-fin/app-kit` `kit.swap({ from: { adapter: circleWalletsAdapter, chain: "Arc_Testnet" }, ... })`.
7. Hashes the reasoning trace, calls `TraceAnchor.anchor(hash)` via `walletsClient.createContractExecutionTransaction`, stores full trace in Postgres.
8. Circle webhook fires `transactions.confirmed` → `/api/webhooks/circle` updates the decision row with the final tx hash + block.
9. Updates user dashboard via Supabase realtime.

---

## 4. Stack (pin these, don't bike-shed)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16, App Router, TypeScript | One repo, API routes co-located, Vercel deploy in one command. **Note:** Next 16 has breaking changes from older training data — read `node_modules/next/dist/docs/` before touching routing, caching, or middleware (see `AGENTS.md` Next.js callout). |
| Runtime / pkg mgr | **Bun** | Fastest install + native TS + native `.env` loading; one tool instead of three. |
| Styling | Tailwind v4 + shadcn | Ships fast, looks like a real product. |
| Auth | Supabase magic link | Free tier, realtime built-in. |
| Custody | `@circle-fin/developer-controlled-wallets` | Per `use-developer-controlled-wallets.md`: server-side EOA/SCA on Arc Testnet. The agent acts as the custodian for the demo. |
| Rebalance | `@circle-fin/app-kit` + `@circle-fin/adapter-circle-wallets` | Per `app-kit/swap.md` + `app-kit/quickstarts/swap-tokens-same-chain.md`: the only sanctioned path for same-chain USDC↔EURC↔cirBTC swaps on Arc Testnet. |
| Onchain anchor | `@circle-fin/smart-contract-platform` | Per `use-smart-contract-platform.md`: deploy `TraceAnchor.sol` from bytecode, import it, monitor `TraceAnchored` events via webhook. |
| Reads | `viem` | `arcTestnet` is **already a built-in chain in viem** (`use-arc.md` best-practice rule) — do NOT call `defineChain`. The current `lib/arc/client.ts` uses `defineChain` and must be switched to `import { arcTestnet } from 'viem/chains'`. |
| DB | Supabase (Postgres + Realtime) | Free tier, realtime built-in. |
| LLM | **Google Gemini** via `@google/genai` SDK · `gemini-3-flash` for fast loop, `gemini-3.1-pro` for decision | Free tier on AI Studio; current GA models. |
| Cron + webhooks | Vercel Cron (`vercel.json`) + Vercel HTTPS endpoint for the Circle webhook | Native, zero infra. |
| Charts | Recharts | Standard, looks fine out of the box. |
| Hosting | Vercel | One push to deploy. |
| Arc RPC | `https://rpc.testnet.arc.network` (canonical, from `use-arc.md`). The Canteen-proxied RPC at `rpc.testnet.arc-node.thecanteenapp.com` is available as a fallback. | The canonical Arc RPC is the safer default; the Canteen proxy enforces an allowlist that may exclude methods App Kit needs. |

**Do not:** add Redux, add a separate Python service, add Docker, add a monorepo tool, write a custom contract beyond the trivial hash-anchor, hand-roll an HTTP client for App Kit (the existing `lib/circle/appkit.ts` does this with a guessed URL — it must be replaced with `@circle-fin/app-kit`).

**Required env vars** (already partially scaffolded in `.env.local.example`):

```bash
# Circle
CIRCLE_API_KEY=                       # TEST_API_KEY:... from console.circle.com
CIRCLE_ENTITY_SECRET=                 # 32-byte hex, generated via scripts/circle-entity-secret.ts
CIRCLE_WALLET_SET_ID=                 # created once via createWalletSet, then re-used
CIRCLE_ARC_BLOCKCHAIN=ARC-TESTNET     # SCP/Wallets blockchain identifier
KIT_KEY=                              # App Kit kit key from console.circle.com
TRACE_ANCHOR_ADDRESS=                 # filled in after SCP deploys TraceAnchor.sol

# Arc
ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000   # 6 decimals ERC-20
ARC_EURC_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a   # 6 decimals
ARC_CIRBTC_ADDRESS=                                            # resolve via App Kit token alias `cirBTC`

# Gemini
GEMINI_API_KEY=                       # https://aistudio.google.com/apikey

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

> **Secrets discipline (Circle skill rule):** `CIRCLE_ENTITY_SECRET`, the recovery file under `./recovery/`, and `CIRCLE_API_KEY` are all `.gitignore`d. The recovery file MUST stay out of the repo — `use-developer-controlled-wallets.md` is explicit: "ALWAYS store recovery files outside the repository root. NEVER commit them to version control."

---

## 5. Repo layout

This reflects the current scaffold, not a greenfield plan. Existing files marked `✓`; new work marked `+`.

```
trapeza/
├── PLAN.md                          ✓ this file
├── AGENTS.md                        ✓ skills index (read this every session)
├── README.md                        + judging-facing; write last
├── .env.local.example               ✓
├── package.json                     ✓ uses bun + Next 16
├── bun.lock                         ✓
├── next.config.ts                   ✓
├── vercel.json                      ✓ cron config (add webhook route)
├── app/
│   ├── page.tsx                     ✓ landing — what is Trapeza
│   ├── onboard/page.tsx             ✓ pick goal + create wallet
│   ├── portfolio/page.tsx           ✓ main dashboard
│   ├── trace/[id]/page.tsx          ✓ single decision trace view
│   ├── api/
│   │   ├── wallet/route.ts          ✓ create/fetch user wallet
│   │   ├── portfolio/route.ts       ✓ current state
│   │   ├── agent/run/route.ts       ✓ cron-triggered agent loop
│   │   ├── trace/route.ts           ✓ list/fetch decisions
│   │   └── webhooks/circle/route.ts + signed Circle webhook handler
├── lib/
│   ├── agent/
│   │   ├── signals.ts               ✓
│   │   ├── regime.ts                ✓ Gemini Flash regime classifier
│   │   ├── decide.ts                ✓ Gemini Pro decision
│   │   ├── execute.ts               ~ rewrite: swap USYC→EURC/cirBTC, use @circle-fin/app-kit
│   │   ├── gemini.ts                ✓
│   │   └── prompts.ts               ~ update token names (USYC→EURC, RISK→cirBTC)
│   ├── circle/
│   │   ├── wallets.ts               ✓ already uses initiateDeveloperControlledWalletsClient
│   │   ├── appkit.ts                ~ rewrite: replace fetch wrapper with @circle-fin/app-kit
│   │   ├── scp.ts                   + initiateSmartContractPlatformClient wrapper
│   │   └── webhooks.ts              + X-Circle-Signature verification helper
│   ├── arc/
│   │   ├── client.ts                ~ use `arcTestnet` from viem/chains, drop defineChain
│   │   ├── balances.ts              ✓
│   │   ├── trace-anchor.ts          ~ call via SCP createContractExecutionTransaction
│   │   └── abi/                     ✓
│   ├── constants.ts                 ✓
│   ├── types.ts                     ~ rename usyc→eurc, risk→cirbtc in TargetWeights
│   └── db/
│       ├── schema.sql               ✓ (rename usyc_balance → eurc_balance, risk_balance → cirbtc_balance)
│       └── client.ts                ✓
├── contracts/
│   └── TraceAnchor.sol              ✓ trivial hash-store contract — compile with evmVersion: "paris"
├── components/                      ✓ shadcn/ui + custom
├── recovery/                        ✓ entity-secret recovery file (gitignored)
└── scripts/
    └── circle-entity-secret.ts      ✓ generate / ciphertext / register
```

---

## 6. Sprint plan — 48 hours, 5 phases

Each phase has a hard "ship gate." If a gate isn't met, drop scope, don't push the gate.

### Phase 0 · Read the skills · Hours 0–1

Open these files in your editor before touching code. They are the spec; everything else is hint.

| Task in this build | Read | Then verify against |
|---|---|---|
| Anything Arc-specific (chain config, addresses) | `~/.arc-canteen/context/docs/circlefin-skills/use-arc.md` | `docs/docs.arc.network/arc/references/connect-to-arc.md` |
| USDC reads / transfers / approvals | `~/.arc-canteen/context/docs/circlefin-skills/use-usdc.md` | `docs/developers.circle.com/stablecoins/usdc-contract-addresses.md` |
| Choosing a wallet type (already decided: dev-controlled) | `~/.arc-canteen/context/docs/circlefin-skills/use-circle-wallets.md` | — |
| Developer-controlled wallet implementation | `~/.arc-canteen/context/docs/circlefin-skills/use-developer-controlled-wallets.md` | `docs/developers.circle.com/wallets/dev-controlled.md` |
| Same-chain swap (USDC ↔ EURC ↔ cirBTC) | `docs/docs.arc.network/app-kit/swap.md` + `docs/docs.arc.network/app-kit/quickstarts/swap-tokens-same-chain.md` | `docs/docs.arc.network/app-kit/references/supported-blockchains.md` (token allowlist) |
| Deploy + monitor TraceAnchor.sol | `~/.arc-canteen/context/docs/circlefin-skills/use-smart-contract-platform.md` | `docs/developers.circle.com/contracts/scp-deploy-smart-contract.md` |
| Webhook signature verification | `docs/developers.circle.com/wallets/dev-controlled.md` → "Webhook Notifications" | — |
| Building agent-flavored auth + nanopayments (deferred) | `docs/developers.circle.com/agent-stack.md` | — |

If a code change you're about to make contradicts a skill rule (e.g., a security rule, a "NEVER" line), **stop and surface the contradiction in chat before proceeding.** That's the whole point of having skills.

**Ship gate:**
- All skill files above have been read in this session.
- The wallet-type decision is documented as "Developer-Controlled + SCA on Arc Testnet" (already correct in the scaffold).
- The five Circle product surfaces (USDC, Wallets, App Kit, SCP, Webhooks) are confirmed in your head as the load-bearing list — not Paymaster, not Gateway.

---

### Phase 1 · Bootstrap finish-up · Hours 1–6

Most scaffolding is already in place (`bun create next-app` was run; deps, shadcn, vercel link, Supabase, Circle SDK install — all done). The remaining work is wiring + Phase-0 corrections.

```bash
# 1. Verify environment
bun --version            # need 1.1+

# 2. Install the App Kit + SCP packages the original draft skipped
bun add @circle-fin/app-kit @circle-fin/adapter-circle-wallets
bun add @circle-fin/smart-contract-platform

# 3. Wire env
cp .env.local.example .env.local      # then fill in CIRCLE_API_KEY, KIT_KEY, GEMINI_API_KEY, etc.

# 4. Generate + register the Circle entity secret (one-time, per use-developer-controlled-wallets.md)
bun scripts/circle-entity-secret.ts generate      # writes secret → paste into .env.local as CIRCLE_ENTITY_SECRET
bun scripts/circle-entity-secret.ts register      # writes recovery/ — confirm it is gitignored

# 5. Create the wallet set (one-time)
# Run a one-off script that calls client.createWalletSet({ name: "trapeza", idempotencyKey: crypto.randomUUID() })
# and paste the returned id into .env.local as CIRCLE_WALLET_SET_ID

# 6. Supabase schema
# Apply lib/db/schema.sql in Supabase SQL editor (rename usyc_balance→eurc_balance, risk_balance→cirbtc_balance first)

# 7. Vercel
bunx vercel link
bunx vercel env pull .env.local       # mirror cloud env to local
bunx vercel --prod                    # first deploy
```

> **Note on Next.js + Bun:** Next.js 16 works fine under Bun. Use `bun dev` to run, `bun run build` to build.

**Supabase schema** (`lib/db/schema.sql`, updated token columns):

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  goal text check (goal in ('conservative','balanced','aggressive')),
  circle_wallet_id text,
  arc_address text,
  created_at timestamptz default now()
);

create table portfolios (
  user_id uuid primary key references users(id),
  usdc_balance numeric default 0,
  eurc_balance numeric default 0,
  cirbtc_balance numeric default 0,
  last_rebalance_at timestamptz,
  updated_at timestamptz default now()
);

create table decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  regime text,
  target_weights jsonb,            -- { usdc, eurc, cirbtc } summing to 1
  reasoning text,
  trace_hash text,
  arc_tx_hash text,
  circle_tx_id text,               -- developer-controlled-wallets transaction id
  executed boolean default false,
  created_at timestamptz default now()
);

create index on decisions (user_id, created_at desc);
```

**Ship gate:**
- `bun dev` runs locally with a landing page.
- App is deployed to Vercel at a real URL.
- Supabase tables exist with the renamed token columns.
- A test row inserted from a server route returns success.
- `recovery/` is present and `.gitignore`d. `git status --ignored` confirms it is ignored.

---

### Phase 2 · Wallets + deposits · Hours 6–16

**Goal:** A user can sign in, pick a goal, get a Circle SCA wallet on Arc Testnet, see their address, and the app sees their balance update when they fund it.

Implementation order:

1. **Auth** — Supabase magic-link email auth (skip OAuth; setup time). Wire it into `app/onboard/page.tsx`.
2. **Goal selection** — three-option radio: Conservative (`risk ∈ [0.0, 0.2], eurc_min 0.3`), Balanced (`risk ∈ [0.2, 0.5], eurc_min 0.2`), Aggressive (`risk ∈ [0.3, 0.7], eurc_min 0.1`). These bands are already encoded in `lib/types.ts::goalBands` — keep the band values but rename `usycMin` → `eurcMin` and treat "risk" as `cirBTC`.
3. **Wallet creation** — on goal submit, POST `/api/wallet`. The server-side flow is already implemented in `lib/circle/wallets.ts` and matches the skill exactly: `initiateDeveloperControlledWalletsClient` → `createWallets({ accountType: "SCA", blockchains: ["ARC-TESTNET"], walletSetId, count: 1 })`. Verify the env vars and walletSetId are set before exercising.
4. **Deposit surface** — show the Arc address + QR code. Tell the user to fund via **the Circle faucet at `https://faucet.circle.com`** (this is the canonical faucet per `use-arc.md`; no Discord/Canteen-specific faucet needed for testnet USDC).
5. **Balance polling** — `/api/portfolio` reads on-chain ERC-20 balances via viem against `https://rpc.testnet.arc.network`:
   - USDC at `0x3600000000000000000000000000000000000000` (6 decimals)
   - EURC at `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` (6 decimals)
   - cirBTC at the address you resolve once via App Kit token alias `cirBTC` (cache it in `ARC_CIRBTC_ADDRESS`)
   - Poll every 10s on the dashboard. (Webhook coverage for deposits is best-effort; polling is the safety net.)

**Critical Circle Wallets snippet** (`lib/circle/wallets.ts` — current scaffold is correct, shown for reference):

```typescript
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const client = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
});

export async function createUserWallet(refId: string) {
  const wallet = await client.createWallets({
    accountType: "SCA",
    blockchains: ["ARC-TESTNET"],
    walletSetId: process.env.CIRCLE_WALLET_SET_ID!,
    count: 1,
    metadata: [{ name: `trapeza-${refId.slice(0, 8)}`, refId }],
  });
  return wallet.data!.wallets![0];
}
```

> **Per the skill (`use-developer-controlled-wallets.md`):** never call `getWallet` / `getWallets` for balances — those endpoints never return balance data. Read balances via viem against the ERC-20 contracts. The current `lib/arc/balances.ts` already does this.

**Ship gate:**
- A new user can complete onboarding in under 60 seconds.
- The dashboard shows their real Arc address (`https://testnet.arcscan.app/address/<addr>` is a working link).
- When they send testnet USDC to that address, the dashboard reflects it within 30 seconds.
- `lib/arc/client.ts` has been switched from `defineChain` to `import { arcTestnet } from 'viem/chains'` (per the `use-arc.md` rule).

---

### Phase 3 · Agent brain + execution · Hours 16–32

This is the heart of the build. Don't skimp.

#### 3a. Signals (`lib/agent/signals.ts`)

Pull three signals — keep it simple:

- **BTC/ETH 24h % change** from a free public endpoint (CoinGecko has a generous free tier).
- **BTC realized volatility** — compute rolling 24h std-dev from hourly prices.
- **USDC/USDT depeg signal** — fetch both prices, flag if either deviates >0.5%.

Cache for 5 min in Postgres.

#### 3b. Gemini client (`lib/agent/gemini.ts`)

Single client, reused across the loop:

```typescript
import { GoogleGenAI } from '@google/genai';

export const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export const MODELS = {
  fast: 'gemini-3-flash',
  heavy: 'gemini-3.1-pro',
} as const;
```

#### 3c. Regime classifier (`lib/agent/regime.ts`)

Fast path — Gemini 3 Flash, ~200 tokens out, structured JSON output. If `regime_shift_candidate` is false, skip the heavy decision call and exit early. This is the cost discipline that makes the loop economical at 15-min cadence per user.

#### 3d. Decision (`lib/agent/decide.ts`)

Heavy path — Gemini 3.1 Pro, structured output, ~800 tokens.

Inputs: current regime, user goal, current portfolio weights, last 5 decisions for context.

Output schema (validated with Zod after parsing — `lib/types.ts::decisionOutputSchema` exists, but rename the weights keys):

```typescript
{
  target_weights: { usdc: number, eurc: number, cirbtc: number },  // sums to 1
  rebalance_now: boolean,
  reasoning: string,  // 3-5 sentences, this is what users see
  alerts: string[]
}
```

The system prompt encodes the **goal bands** (Conservative may not exceed 20% cirBTC; Aggressive may not fall below 30% cirBTC; EURC has a goal-specific floor), the **rebalance threshold** (only rebalance if any single asset deviates >5% from target — this prevents thrashing), and the **decision principles** the user can read.

Store the full prompt + response in the `decisions` table. The reasoning trace is your innovation hook.

#### 3e. Execution (`lib/agent/execute.ts`)

**This is the section that most changes from the previous draft.** The current `lib/circle/appkit.ts` hand-rolls a `fetch` against a guessed URL — that is incorrect per `app-kit/quickstarts/swap-tokens-same-chain.md`. Replace it with the official SDK.

For each delta between current and target weights, the execution path is:

```typescript
import { AppKit } from "@circle-fin/app-kit";
import { createCircleWalletsAdapter } from "@circle-fin/adapter-circle-wallets";
import { circleClient } from "@/lib/circle/wallets"; // dev-controlled wallets client

const kit = new AppKit();

export async function swapLeg(args: {
  walletId: string;
  tokenIn: "USDC" | "EURC" | "cirBTC";
  tokenOut: "USDC" | "EURC" | "cirBTC";
  amountIn: string; // human-readable, e.g. "10.00"
}) {
  const adapter = createCircleWalletsAdapter({
    client: circleClient(),
    walletId: args.walletId,
  });

  return kit.swap({
    from: { adapter, chain: "Arc_Testnet" },
    tokenIn: args.tokenIn,
    tokenOut: args.tokenOut,
    amountIn: args.amountIn,
    config: { kitKey: process.env.KIT_KEY! },
  });
}
```

Notes from the skills + Arc app-kit docs:

- The chain string is **`"Arc_Testnet"`** (capital A, capital T, underscore). It matches `BridgeChain.Arc_Testnet` from `@circle-fin/app-kit`. Identifiers are case-sensitive (`app-kit/references/supported-blockchains.md`).
- The token allowlist on Arc Testnet is **USDC, EURC, cirBTC ONLY** for Swap. Anything else returns no route.
- **Gas is paid in USDC natively** — no Paymaster header, no `paymaster: { mode: "USDC" }` payload (that line in the current `appkit.ts` was a Paymaster pattern from other chains and does nothing on Arc).
- The exact `createCircleWalletsAdapter` import path may be slightly different — verify by reading `node_modules/@circle-fin/adapter-circle-wallets/` once installed. If the constructor name differs, adjust.

**After execution**, anchor the reasoning trace:

- Compute `sha256(JSON.stringify(reasoningTrace))` → `traceHash`.
- Call `TraceAnchor.anchor(traceHash)` via `walletsClient.createContractExecutionTransaction({ walletId, abiFunctionSignature: "anchor(bytes32)", abiParameters: [traceHash], contractAddress: process.env.TRACE_ANCHOR_ADDRESS!, fee: { type: 'level', config: { feeLevel: 'MEDIUM' } } })` — per `use-smart-contract-platform.md` "Best Practices".
- Save the returned `id` to `decisions.circle_tx_id` immediately; the webhook will fill in `arc_tx_hash` and flip `executed = true` on `COMPLETE`.

`TraceAnchor.sol` is a 20-line contract:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TraceAnchor {
  mapping(bytes32 => uint256) public anchoredAt;
  event TraceAnchored(bytes32 indexed traceHash, address indexed by, uint256 at);

  function anchor(bytes32 traceHash) external {
    require(anchoredAt[traceHash] == 0, "already anchored");
    anchoredAt[traceHash] = block.timestamp;
    emit TraceAnchored(traceHash, msg.sender, block.timestamp);
  }
}
```

Compile + deploy via Circle SCP (`use-smart-contract-platform.md` Implementation Pattern #1, "Deploy Contract from Bytecode"):

- **Compile with `evmVersion: "paris"`** — Solidity ≥0.8.20 defaults to `shanghai`, which emits the `PUSH0` opcode. Arc Testnet does not accept `PUSH0`; deployment fails with `ESTIMATION_ERROR` / `Create2: Failed on deploy`. This is called out as a **Best Practice rule** in the skill.
- Use `initiateSmartContractPlatformClient.deployContract({ blockchain: "ARC-TESTNET", bytecode: "0x...", abi: [...], constructorParameters: [], idempotencyKey: crypto.randomUUID(), name: "TraceAnchor", walletId: <a dev-controlled wallet you fund once> })`.
- Poll `scpClient.getContract({ id })` for `deploymentStatus === "COMPLETED"`. On success, write `contractAddress` into `TRACE_ANCHOR_ADDRESS` in Vercel env.
- Then `scpClient.createEventMonitor({ blockchain: "ARC-TESTNET", contractAddress, eventSignature: "TraceAnchored(bytes32,address,uint256)" })` to wire the webhook — this is your Smart Contract Platform integration in full bloom.

#### 3f. Webhook handler (`app/api/webhooks/circle/route.ts`)

`use-developer-controlled-wallets.md` is explicit: **prefer webhooks over polling**. Register a public HTTPS endpoint in the Circle Developer Console under Webhooks, verify the `X-Circle-Signature` + `X-Circle-Key-Id` headers on every callback, and update the matching `decisions` row on terminal-state events (`COMPLETE`, `FAILED`, `DENIED`, `CANCELLED`).

#### 3g. Cron (`vercel.json`)

```json
{
  "crons": [
    { "path": "/api/agent/run", "schedule": "*/15 * * * *" }
  ]
}
```

In `/api/agent/run`, iterate over all active users with non-zero balance. Bound execution: skip if `last_rebalance_at` < 10 min ago (`MIN_INTERVAL_SECONDS` in `constants.ts`). Wrap in try/catch per user so one user's failure doesn't kill the loop.

**Ship gate:**
- Agent loop runs end-to-end without manual trigger.
- For a funded test wallet, at least one rebalance has executed onchain via App Kit Swap, the Circle txn reaches `COMPLETE`, and the webhook has written `arc_tx_hash` into the decisions row.
- The reasoning trace's `traceHash` is anchored via `TraceAnchor.anchor`, and the resulting tx is visible on `https://testnet.arcscan.app`.
- The dashboard shows the reasoning trace + the explorer link within 30s of execution.

---

### Phase 4 · Polish, deploy, get users · Hours 32–44

**Dashboard polish** — the screen judges spend the most time on. Three sections:

1. **Top:** current allocation as a horizontal stacked bar (USDC / EURC / cirBTC), with target overlay. Big regime indicator pill.
2. **Middle:** "Why this allocation?" — most recent reasoning trace, in plain English, with an "anchored onchain at [tx]" link to `testnet.arcscan.app`.
3. **Bottom:** decision history list (last 10), each expandable to show full reasoning and target weights.

**Trace detail page** (`/trace/[id]`) — full reasoning, signals at decision time, target vs actual weights, the anchor tx link. This is what you'll show in the demo video.

**Get users (hours 38–44):**

- Post in Canteen Discord with a Loom + signup link. Offer to walk people through onboarding 1:1.
- Post in Arc builder Discord (mention Canteen + Agora).
- Hit up 10 people directly. DMs convert; broadcasts don't.
- Track signups + funded wallets in a simple Supabase view.
- Realistic target: **8–15 users, 4–8 funded.** That's a real traction story.

**Ship gate:**
- Production URL is shareable and works for a stranger end-to-end.
- At least 5 real users have signed up (not you and your alts).
- At least 2 of them have funded and seen an agent decision.

---

### Phase 5 · Submission · Hours 44–48

**README** (judging-facing — write it like a pitch):

1. One-paragraph elevator — open with the Trapeza etymology, it's a free signal that you read the brief.
2. Live demo URL.
3. 60-second Loom embedded.
4. "What the AI decides" — explicit list, with sample reasoning trace screenshots.
5. "Circle tools used" — **five** items, each with a `lib/...` file reference:
   - USDC (`lib/arc/balances.ts`)
   - Developer-Controlled Wallets (`lib/circle/wallets.ts`)
   - App Kit Swap (`lib/agent/execute.ts`)
   - Smart Contract Platform (`lib/circle/scp.ts`, `contracts/TraceAnchor.sol`)
   - Webhooks (`app/api/webhooks/circle/route.ts`)
6. Traction numbers (live count from Supabase, screenshot).
7. The Trading-R1 reasoning-as-product reference + how Trapeza extends it (the onchain anchor).
8. Architecture diagram (export from this PLAN.md).
9. Local setup instructions (`bun install && bun dev`).

**Demo video script (3 min max):**

- 0:00–0:20 — the problem + the name reveal (Trapeza, the agora's tables).
- 0:20–0:40 — onboarding live: pick goal, get wallet, fund it via `faucet.circle.com`.
- 0:40–1:30 — dashboard tour: regime, allocation, reasoning trace.
- 1:30–2:15 — trigger an agent run manually (have a debug endpoint), show the App Kit Swap tx land, click into trace detail, click the Arc explorer link.
- 2:15–2:45 — traction numbers + a real user testimonial pulled from Discord.
- 2:45–3:00 — what's next (cross-chain via CCTP per `bridge-stablecoin.md`, Modular Wallets for passkey UX per `use-modular-wallets.md`, real DeFi risk basket).

**Submit:**

- Submit form: `https://forms.gle/ok3Gr9zhmHnApvK48`.
- Submit at hour 44, not hour 48. Then submit again at hour 47 with any final fixes. **They explicitly say you can submit as many times as you like.**

---

## 7. Gemini prompt templates (copy-paste-ready)

Drop these in `lib/agent/prompts.ts`. Both are tuned for JSON-only output via Gemini's `responseMimeType: 'application/json'` config.

```typescript
export const REGIME_SYSTEM = `You are a market regime classifier for Trapeza, a portfolio agent on Arc.
Return JSON only — no preamble, no markdown fences.
Schema:
{ "regime": "risk_on" | "risk_off" | "neutral",
  "confidence": number,           // 0.0 to 1.0
  "regime_shift_candidate": boolean,
  "brief": string }               // ≤120 chars

Rules:
- risk_off if: BTC 24h < -5%, OR BTC realized vol > 4%, OR any stablecoin depeg > 0.5%
- risk_on if: BTC 24h > +3% AND BTC realized vol < 2.5% AND no depeg
- otherwise: neutral
- regime_shift_candidate = (current regime != previous regime) OR (confidence < 0.6)`;

export const DECISION_SYSTEM = `You are Trapeza, an adaptive portfolio manager on Arc.
You decide target allocations for {USDC, EURC, cirBTC} that sum to 1.0.
USDC is cash; EURC is safe-FX (mild diversification); cirBTC is the risk leg.

Return JSON only. Schema:
{ "target_weights": { "usdc": number, "eurc": number, "cirbtc": number },
  "rebalance_now": boolean,
  "reasoning": string,            // 3-5 sentences, plain English, user-facing
  "alerts": string[] }

Goal bands (these are hard limits — do not violate):
- conservative: cirbtc ∈ [0.00, 0.20], eurc ≥ 0.30
- balanced:     cirbtc ∈ [0.20, 0.50], eurc ≥ 0.20
- aggressive:   cirbtc ∈ [0.30, 0.70], eurc ≥ 0.10

Regime adjustments (within bands):
- risk_off → tilt to USDC + EURC, minimize cirBTC
- risk_on  → tilt to cirBTC
- neutral  → mid-band

Rebalance only if any single asset's actual weight differs from target by >5%.
Reasoning must reference the regime, the goal, and what changed since the last decision.
Address the user directly. Be calm, specific, and short.`;
```

---

## 8. Risk register + bailout plans

| Risk | Probability | Bailout |
|---|---|---|
| `@circle-fin/adapter-circle-wallets` constructor name differs from the example | Medium | Read `node_modules/@circle-fin/adapter-circle-wallets/` once installed; the package exports an adapter factory regardless of name. |
| `cirBTC` token alias resolution fails through App Kit on Arc Testnet | Medium | Drop cirBTC → reduce to USDC/EURC only and treat the "risk" leg as a higher EURC allocation. Note in README. |
| Vercel Cron is unreliable on free tier | Low | Vercel Cron is fine on free; still add a manual "Run agent now" button on the dashboard (good for the demo regardless). |
| Arc RPC is rate-limited | Medium | Cache balance reads aggressively (10s TTL). Batch via multicall. |
| Onboarding has friction (faucet delays at `faucet.circle.com`) | High | Pre-fund a "demo mode" wallet you control. Let visitors view a live agent loop without funding. |
| Circle webhook signature verification fails / no callback | Medium | Fall back to `walletsClient.getTransaction({ id })` polling per 10s on outstanding `circle_tx_id`s. |
| `TraceAnchor.sol` deploys but reverts (PUSH0) | Medium | Recompile with `evmVersion: "paris"` per the SCP skill rule. Re-deploy. |
| You run out of time on dashboard | High | Ship a basic table. Beautiful UI is the smallest contributor to score. |
| Gemini API rate-limit on free tier | Low | Free tier is generous for hackathon volume. If hit, upgrade to paid or stagger cron. |
| Gemini returns invalid JSON | Low | `responseMimeType: 'application/json'` makes this rare; wrap with Zod parse + single retry. |

The **demo-mode read-only dashboard** is your single most important bailout. It guarantees a working demo even if no users sign up, and it raises traction by letting visitors see the product without committing.

---

## 9. What's deliberately out of scope

These are good ideas. They are not for this 48-hour window. Document them in the README "what's next" section — judges reward founders who know what they cut.

- **Cross-chain (CCTP / Bridge Kit)** — single-chain on Arc testnet for v1. See `bridge-stablecoin.md` for what we'd build.
- **Gateway unified balance** — `use-gateway.md` is the on-ramp when we go multi-chain.
- **Modular Wallets (passkey UX)** — `use-modular-wallets.md`; better DX, but requires a frontend SDK pivot we can't justify in 48h.
- **Agent Stack / Circle CLI / Agent Wallets** — `agent-stack.md` is the natural Trapeza-v2 path (the agent itself holds the wallet, with onchain spending controls), but switching now is a full rewrite of `lib/circle/wallets.ts`. Document as the v2 migration target.
- **Tax-loss harvesting** — requires lot-level history we won't build now.
- **Real DeFi risk basket** (Aave, Lido, etc.) — cirBTC stands in.
- **Mobile-responsive everything** — desktop demo only; basic responsive is fine.
- **Multi-user wallet recovery flows** — developer-controlled wallets, period.
- **Sophisticated regime models** — Flash + signals is enough to demonstrate agency.
- **Backtesting / paper-trading UI** — live mode only.
- **Notifications (email/SMS)** — Discord shoutout suffices.

---

## 10. First commands for Claude Code (literally run these first)

```bash
# Hour 0 — open the skill files (Phase 0). Don't write code until you've read them.
ls ~/.arc-canteen/context/docs/circlefin-skills/
# At minimum read: use-arc.md, use-usdc.md, use-developer-controlled-wallets.md,
# use-smart-contract-platform.md, and AGENTS.md at the repo root.
# Then read: docs/docs.arc.network/app-kit/swap.md and
# docs/docs.arc.network/app-kit/quickstarts/swap-tokens-same-chain.md.

# Hour 0 — verify environment
bun --version             # need 1.1+

# Hour 0 — install the packages the original draft missed
bun add @circle-fin/app-kit @circle-fin/adapter-circle-wallets
bun add @circle-fin/smart-contract-platform

# Hour 0 — Circle entity-secret one-time setup (only if not yet registered)
bun scripts/circle-entity-secret.ts generate     # paste output → CIRCLE_ENTITY_SECRET in .env.local
bun scripts/circle-entity-secret.ts register     # writes recovery/ — confirm .gitignore covers it

# Hour 0 — create the wallet set (one-off, paste id → CIRCLE_WALLET_SET_ID)
# Quick way: add a tiny bun script or run via `bun repl`:
#   const c = (await import("./lib/circle/wallets")).circleClient();
#   const r = await c.createWalletSet({ name: "trapeza", idempotencyKey: crypto.randomUUID() });
#   console.log(r.data?.walletSet?.id);

# Hour 0 — Vercel link + first deploy
bunx vercel link
bunx vercel env pull .env.local
bunx vercel --prod

# Now: open AGENTS.md + the three highest-priority skill files in tabs, then start Phase 1.
```

---

## 11. Hourly checkpoint cadence

At every checkpoint, do exactly three things: **commit, deploy, write one sentence in `PROGRESS.md` about what's working.**

| Hour | Checkpoint |
|---|---|
| 1 | Phase 0 done: all skill files read; Circle tool list (USDC, Wallets, App Kit, SCP, Webhooks) confirmed |
| 6 | Scaffolding deployed, Supabase live, entity secret registered |
| 12 | Wallet creation working end-to-end (SCA on `ARC-TESTNET`) |
| 16 | Deposit flow + balance polling working (USDC + EURC + cirBTC reads) |
| 22 | Regime classifier returns valid JSON for live signals |
| 26 | `TraceAnchor.sol` deployed via SCP, event monitor wired, address in env |
| 30 | First successful App Kit Swap executes onchain (USDC → EURC or USDC → cirBTC) |
| 32 | Reasoning trace anchored via SCP, webhook updates `arc_tx_hash`, full agent loop hands-off |
| 38 | Dashboard polished, demo-mode wallet running |
| 44 | First real users onboarded, README + Loom drafted |
| 47 | Final submission |

If you blow a checkpoint by more than two hours, **drop scope. Do not push the schedule.**

---

## 12. One last thing for Claude Code

When Claude Code reads this plan, the first action should be: **read `AGENTS.md` at the repo root, then read the matching skill files in `~/.arc-canteen/context/docs/circlefin-skills/`** for every Circle/Arc surface this plan touches:

- `use-arc.md` — chain ID, RPC, faucet, USDC/EURC addresses, decimals rules, the "viem already supports `arcTestnet`" rule.
- `use-usdc.md` — the 6-decimal rule, contract addresses table, read vs. write operations.
- `use-developer-controlled-wallets.md` — `initiateDeveloperControlledWalletsClient`, entity-secret lifecycle, transaction state machine, **webhooks over polling**, `idempotencyKey` discipline.
- `use-smart-contract-platform.md` — `initiateSmartContractPlatformClient`, the `evmVersion: "paris"` PUSH0 rule, deploy-from-bytecode flow, event monitor wiring.
- `use-circle-wallets.md` — wallet-type decision matrix (confirms dev-controlled + SCA on Arc is correct).

Per-page Circle docs at `docs/developers.circle.com/**/*.md` and Arc docs at `docs/docs.arc.network/**/*.md` are the second source. Live URLs at `developers.circle.com` and `docs.arc.network` are the third. **In that order.**

The Circle API surface area, Arc testnet specifics, App Kit Swap signatures, and `@google/genai` method names matter more than scaffolding speed. Get the chain ID, wallet creation flow, App Kit Swap signatures, and `@google/genai` method names right on the first try by reading the skills, not by guessing from training data.

Then start at Hour 0 of Phase 0.

Good luck. Ship.
