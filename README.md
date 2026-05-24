# Trapeza

> **Trapeza** (τράπεζα) · Greek for *the table*. The money-changers' tables of the Athenian agora — the original site of capital allocation, and the etymological root of modern banking. *"Money-changers leaned on their tables."* Trapeza is an adaptive portfolio agent that takes its seat at the same table, now powered by an LLM and settled on Arc.

**Live:** https://trapeza-gamma.vercel.app
**Demo (no sign-in):** https://trapeza-gamma.vercel.app/demo
**Built for:** [Agora Agents Hackathon](https://canteen.so) · Canteen × Circle · RFB-04

---

## What it does

Pick a risk profile. Deposit testnet USDC. A Groq-hosted agent runs every fifteen minutes against your wallet:

1. Reads the market (BTC/ETH 24h, realised vol, USDC/USDT depeg) from CoinGecko.
2. Classifies the regime — `risk-on`, `risk-off`, or `neutral` — via Llama 4 Scout (Gemini-3-class JSON-mode).
3. If the regime shifted, asks gpt-oss-120b for target weights inside your goal bands + a plain-English memo.
4. Settles the rebalance onchain through Circle App Kit's same-chain Swap on Arc Testnet.
5. Hashes the entire reasoning trace (signals + regime + decision + swaps) and pins the SHA-256 to a `TraceAnchor` contract.

Every decision is independently verifiable on [testnet.arcscan.app](https://testnet.arcscan.app) — the trace hash, the swap tx, the anchor tx.

## Why this wins on the rubric

Judging is **30 % agentic sophistication · 30 % traction · 20 % Circle tool usage · 20 % innovation.**

- **Agency.** The agent makes real decisions — regime classification, target weights inside hard bands, rebalance timing, swap routing. Every decision carries a plain-English memo that explains the why. The output is hard-clamped to the user's goal bands so a hallucination can't violate the contract.
- **Traction.** Sign-in is one email magic link. Onboarding mints a Circle dev-controlled SCA wallet on Arc Testnet. A `/demo` route lets curious judges browse the full dashboard with mock data — zero friction.
- **Circle tools (five surfaces).**
  - **USDC** — native gas + the cash leg
  - **Developer-Controlled Wallets** (`@circle-fin/developer-controlled-wallets`) — per-user SCA custody
  - **App Kit Swap** (`@circle-fin/app-kit` + `@circle-fin/adapter-circle-wallets`) — USDC ↔ EURC ↔ cirBTC on Arc
  - **Smart Contract Platform** (`@circle-fin/smart-contract-platform`) — deploys + monitors the `TraceAnchor` contract
  - **Webhooks** — signed `X-Circle-Signature` payloads update transaction state
- **Innovation.** The on-chain reasoning anchor is the differentiator. We treat the LLM's *prose* as the artefact, hash it, and pin it. A future judge auditing the demo can prove the agent said what it said — not the way "trust me, I'm an AI" usually works.

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Next.js 16 (App Router, Bun, Tailwind v4, brutalist design)             │
│  ┌───────────┐ ┌─────────────┐ ┌───────────────┐ ┌──────────────────┐  │
│  │  /        │ │  /onboard   │ │  /portfolio   │ │  /trace/[id]      │  │
│  └─────┬─────┘ └──────┬──────┘ └───────┬───────┘ └─────────┬────────┘  │
│        │              │                │                    │            │
│        ▼              ▼                ▼                    ▼            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  proxy.ts  · refreshes the Supabase session cookie per request  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  API routes                                                      │    │
│  │  /api/wallet  /api/portfolio  /api/agent/run                     │    │
│  │  /api/agent/trigger  /api/agent/initialize                       │    │
│  │  /api/trace  /api/webhooks/circle (signed)  /api/healthz (gated) │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└────────────┬─────────────────────┬─────────────────────┬────────────────┘
             │                     │                     │
             ▼                     ▼                     ▼
       ┌──────────┐         ┌─────────────┐       ┌───────────────┐
       │ Supabase │         │ Circle SDKs │       │   Groq        │
       │ Postgres │         │ Wallets +   │       │ Llama 4 Scout │
       │ + Auth   │         │ App Kit +   │       │ gpt-oss-120b  │
       └──────────┘         │ SCP +       │       └───────────────┘
                            │ Webhooks    │
                            └──────┬──────┘
                                   ▼
                          ┌────────────────┐
                          │ Arc Testnet    │
                          │ chainId 5042002│
                          │ USDC-native gas│
                          │ +TraceAnchor.sol│
                          └────────────────┘
                                   ▲
                                   │
                          ┌────────┴────────┐
                          │ GitHub Actions  │
                          │ */15 * * * *    │
                          │ → /api/agent/run│
                          └─────────────────┘
```

The agent loop (`lib/agent/run.ts`) is the heart:

1. Rate-limit per user (10 min unless manually triggered).
2. `readBalances()` — viem multicall ERC-20 against USDC/EURC/cirBTC + CoinGecko prices for USD valuation.
3. Skip if empty wallet; still bump `last_checked_at` for cron visibility.
4. `fetchSignals()` + last 5 decisions for context.
5. `classifyRegime()` via Llama 4 Scout (Zod-validated structured output).
6. Early exit if no regime shift candidate.
7. `decide()` via gpt-oss-120b (Zod-validated + hard-clamped to goal bands).
8. `planRebalance()` — USD-weighted deltas vs 5 % drift threshold.
9. `executeRebalance()` — routes source legs into sinks via App Kit Swap.
10. `anchorTrace()` — sha256 the trace, write to `TraceAnchor.anchor(bytes32)` via SCP.
11. Persist decision + bump portfolios.last_rebalance_at.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Runtime / pkg mgr | Bun |
| Styling | Tailwind v4 + shadcn (brutalist palette) |
| Auth + DB | Supabase (magic-link, RLS-friendly read pattern) |
| Custody | `@circle-fin/developer-controlled-wallets` (SCA on Arc Testnet) |
| Rebalance | `@circle-fin/app-kit` + `@circle-fin/adapter-circle-wallets` |
| Onchain anchor | `@circle-fin/smart-contract-platform` + custom `TraceAnchor.sol` |
| Reads | `viem` (`arcTestnet` is built-in — no `defineChain` needed) |
| LLM | Groq via `ai` + `@ai-sdk/groq` — env-swappable model names |
| Pricing | CoinGecko `/simple/price` — bitcoin + euro-coin, 5-min cache + fallback |
| Cron | GitHub Actions (`.github/workflows/agent-run.yml`) hitting `/api/agent/run` with `Authorization: Bearer ${CRON_SECRET}` |
| Hosting | Vercel |

Vercel Hobby caps cron at one run per day; the `*/15` cadence lives in GitHub Actions instead.

## Local setup

```bash
# 1. Clone + install
git clone https://github.com/YOUR_HANDLE/trapeza && cd trapeza
bun install

# 2. Apply the Supabase schema in your project's SQL editor
cat lib/db/schema.sql
# If you have an existing schema, apply migrations:
cat lib/db/migrations/001_partial_swaps_and_cron_visibility.sql

# 3. Fill in .env.local from the template
cp .env.local.example .env.local
# Edit: CIRCLE_API_KEY, CIRCLE_ENTITY_SECRET, CIRCLE_WALLET_SET_ID,
# CIRCLE_DEPLOY_WALLET_ID, KIT_KEY, GROQ_API_KEY, Supabase keys, CRON_SECRET

# 4. Generate + register a Circle entity secret (one-time)
bun run entity-secret:generate
bun run entity-secret:register

# 5. Create a Circle wallet set + deploy the trace anchor
bun run create-wallet-set
bun run deploy-anchor

# 6. Smoke-test the swap path
bun run swap-test                       # default: 0.50 USDC → EURC
bun run swap-test EURC cirBTC 0.001     # custom

# 7. Run tests
bun test

# 8. Dev server
bun run dev
```

## Deploy to Vercel

```bash
bunx vercel link
bunx vercel env pull .env.local     # pull existing env if any
bunx vercel --prod
```

Required Vercel env (Production):

```
CIRCLE_API_KEY=
CIRCLE_ENTITY_SECRET=
CIRCLE_WALLET_SET_ID=
CIRCLE_ARC_BLOCKCHAIN=ARC-TESTNET
CIRCLE_DEPLOY_WALLET_ID=
KIT_KEY=
TRACE_ANCHOR_ADDRESS=

ARC_RPC_URL=https://rpc.testnet.arc.network
ARC_CHAIN_ID=5042002
ARC_USDC_ADDRESS=0x3600000000000000000000000000000000000000
ARC_EURC_ADDRESS=0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a
ARC_CIRBTC_ADDRESS=                    # resolve via App Kit then cache

GROQ_API_KEY=                          # console.groq.com — free tier
# Optional model overrides:
# LLM_FAST_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
# LLM_HEAVY_MODEL=openai/gpt-oss-120b

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

CRON_SECRET=                           # any long random string
NEXT_PUBLIC_SITE_URL=                  # optional, defaults to trapeza-gamma.vercel.app
```

### GitHub Actions cron secrets

After pushing to GitHub, set these repo secrets (Settings → Secrets and variables → Actions):

- `AGENT_RUN_URL` — `https://YOUR_DOMAIN/api/agent/run`
- `CRON_SECRET` — same value as Vercel env

The workflow at `.github/workflows/agent-run.yml` runs every 15 min and POSTs the bearer-authed `/api/agent/run`. Trigger it manually first via the Actions tab.

### Supabase auth URL config

Supabase rejects any `emailRedirectTo` outside its allowlist and silently falls back to the Site URL. Without this you'll get magic-link emails pointing at `localhost:3000`:

- **Site URL:** `https://YOUR_DOMAIN`
- **Redirect URLs:** `https://YOUR_DOMAIN/auth/callback`, `https://YOUR_DOMAIN/**`, `http://localhost:3000/auth/callback`, `http://localhost:3000/**`

### Circle webhook setup (optional)

For the most-responsive UI, register `https://YOUR_DOMAIN/api/webhooks/circle` under Circle Developer Console → Webhooks. The handler verifies `X-Circle-Signature` (ECDSA-SHA256 over the raw body) against the public key fetched via `getNotificationSignature`. Without webhook setup the cron-driven polling is the fallback.

## Repo map

```
app/
  page.tsx               · landing
  onboard/               · email magic link + goal picker
  portfolio/             · live dashboard (container + presentational view)
  trace/[id]/            · full single-decision article
  demo/                  · same dashboard wired to mock data
  mockups/               · design exploration (terminal / glass / brutalist)
  api/
    wallet/              · GET / POST / PATCH (create + change mandate)
    portfolio/           · balances + lastCheckedAt
    trace/               · paginated decision list + detail
    agent/run/           · cron orchestrator (bearer-authed)
    agent/trigger/       · session-authed manual run-now
    agent/initialize/    · one-click seed to mid-band weights
    webhooks/circle/     · signed Circle webhook receiver
    healthz/             · diagnostic (token-gated in prod)
  error.tsx · not-found.tsx · icon.tsx · opengraph-image.tsx
  robots.ts · sitemap.ts

lib/
  agent/                 · signals · llm · prompts · regime · decide · execute · run · pricing
  arc/                   · viem client · balances · trace-anchor · abi
  circle/                · wallets · scp · webhooks (signature verify)
  db/                    · client · browser · schema.sql · migrations/
  types.ts · constants.ts

components/
  masthead.tsx           · brutalist top strip with mandate switcher + sign-out
  regime-pill.tsx        · stamp + lockup variants
  allocation-bar.tsx     · target-marker + actual-fill bar
  ui/                    · shadcn primitives

contracts/
  TraceAnchor.sol        · anchor(bytes32) → mapping(bytes32 ⇒ timestamp)

scripts/
  circle-entity-secret.ts · entity secret lifecycle
  create-wallet-set.ts    · one-off wallet set creation
  deploy-trace-anchor.ts  · solc + SCP deploy
  swap-test.ts            · App Kit swap smoke test

proxy.ts                  · Supabase session refresh (Next 16 proxy)
.github/workflows/agent-run.yml  · cron */15 → /api/agent/run
```

## Diagnostic

`GET /api/healthz?token=$CRON_SECRET` returns:

```json
{
  "env": { "NEXT_PUBLIC_SUPABASE_URL": "...", "GROQ_API_KEY": "gsk_…last", ... },
  "tables": {
    "users":      { "anon": {...}, "service": {...}, "rlsLikely": true },
    "portfolios": { "anon": {...}, "service": {...}, "rlsLikely": true },
    "decisions":  { ... }
  },
  "pricing": { "cirbtc": 76662, "eurc": 1.16, "source": "cache", "fetched_at": "..." },
  "llm":     { "provider": "groq", "configured": {...}, "fastAvailable": true, "heavyAvailable": true }
}
```

`rlsLikely: true` when anon row count is 0 but service-role count is >0 — a single endpoint that diagnoses every "why isn't this loading" bug class.

## What's next

- **Cross-chain** via CCTP / Bridge Kit (skipped for v1 scope)
- **Modular Wallets** (passkey auth) instead of dev-controlled
- **Real DeFi risk basket** beyond cirBTC (Aave/Lido on Arc once mainnet ships)
- **Backtests** so judges can replay decisions against historical signal sets
- **Multi-agent debate** — N agents propose decisions, a meta-agent reconciles, all reasoning anchored

## Acknowledgements

Built against [Circle Developer Platform](https://developers.circle.com) on [Arc](https://docs.arc.network). The reasoning-anchor pattern is inspired by the [Trading-R1](https://arxiv.org/abs/2509.11420) line of research — *reasoning as the artefact*.

---

**Built for the Agora Agents Hackathon · Canteen × Circle · RFB-04**
