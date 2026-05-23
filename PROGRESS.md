# PROGRESS

One line per phase. See `PLAN.md` for the spec.

## Phase 0 — Skills read (Hours 0–1) — complete

Read in this session:

- `~/.arc-canteen/context/docs/circlefin-skills/use-arc.md` — chain id `5042002`, RPC `https://rpc.testnet.arc.network`, USDC at `0x3600…` (6 dp ERC-20, 18 dp native gas), EURC at `0x89B5…`, faucet `faucet.circle.com`, **viem ships `arcTestnet` — never `defineChain`**.
- `~/.arc-canteen/context/docs/circlefin-skills/use-circle-wallets.md` — confirms Developer-Controlled + SCA on Arc is the right pick.
- `~/.arc-canteen/context/docs/circlefin-skills/use-developer-controlled-wallets.md` — `initiateDeveloperControlledWalletsClient`, entity-secret lifecycle, txn state machine, **webhooks > polling**, `idempotencyKey` discipline.
- `~/.arc-canteen/context/docs/circlefin-skills/use-usdc.md` — 6-decimal rule everywhere, ERC-20 reads via viem.
- `~/.arc-canteen/context/docs/circlefin-skills/use-smart-contract-platform.md` — `evmVersion: "paris"` to avoid PUSH0, `ARC-TESTNET` blockchain id, dual-client (SCP for deploy + reads, Wallets for writes).
- `~/.arc-canteen/context/docs/circlefin-skills/use-gateway.md` — skimmed; out of scope for v1.
- `~/.arc-canteen/context/docs/developers.circle.com/agent-stack.md` — noted as v2 migration target.
- `~/.arc-canteen/context/docs/docs.arc.network/app-kit/swap.md` + `quickstarts/swap-tokens-same-chain.md` + `references/supported-blockchains.md` — chain string is `"Arc_Testnet"`, App Kit Swap on Arc Testnet supports **USDC, EURC, cirBTC only** (USYC is NOT supported — original PLAN.md draft was wrong).

Circle product surfaces confirmed: **USDC + Wallets + App Kit Swap + Smart Contract Platform + Webhooks.** No Paymaster (Arc's native gas is USDC).

## Phase 1 — Bootstrap (Hours 1–6) — partial

Done programmatically:

- Working dir nuked + re-scaffolded via `bun create next-app .` → Next 16.2.6, React 19.2.4, Tailwind v4, Bun pkg mgr.
- Runtime deps installed: `@circle-fin/developer-controlled-wallets`, `@circle-fin/app-kit`, `@circle-fin/adapter-circle-wallets`, `@circle-fin/smart-contract-platform`, `@google/genai`, `@supabase/supabase-js`, `@supabase/ssr`, `viem`, `recharts`, `lucide-react`, `zod`, `sonner`.
- shadcn initialized + `button card input label select sonner` added. (`form` skipped; add later only if needed.)
- `.env.local.example` rewritten to match the new PLAN.md env contract (drops `ARC_USYC_ADDRESS` + `ARC_RISK_ADDRESS` + `ANCHOR_SIGNER_PRIVATE_KEY`; adds `KIT_KEY`, `ARC_EURC_ADDRESS`, `ARC_CIRBTC_ADDRESS`, `CIRCLE_ARC_BLOCKCHAIN`).
- `.env.local` preserved (real keys from prior session). `.gitignore` preserved with `/recovery` + `.env*` + `*.pem` patterns.
- `lib/db/schema.sql` written with renamed columns (`usdc_balance` / `eurc_balance` / `cirbtc_balance`).
- `lib/db/client.ts` (server SSR client) + `lib/db/browser.ts` (browser client) written.
- `lib/constants.ts` written with `ARC` accessors, `CIRCLE_ARC_BLOCKCHAIN`, `APPKIT_ARC_CHAIN = "Arc_Testnet"`.
- `vercel.json` written with cron `*/15 * * * *` → `/api/agent/run`.
- `contracts/TraceAnchor.sol` preserved (compiled separately; remember `evmVersion: "paris"`).
- `scripts/circle-entity-secret.ts` preserved.
- `scripts/create-wallet-set.ts` written (one-off helper).
- `package.json` scripts: added `entity-secret:{generate,ciphertext,register}` + `create-wallet-set`.

## TODO — interactive steps you must run yourself

These need real accounts / browser flows I can't drive:

1. **Generate + register the Circle entity secret** (one-time, per `use-developer-controlled-wallets.md`):

   ```bash
   bun run entity-secret:generate          # prints a 32-byte hex — paste into .env.local as CIRCLE_ENTITY_SECRET
   bun run entity-secret:register          # writes recovery/<file>.json — store it somewhere safe and OUT of the repo
   ```

   The recovery file is your only way to recover the secret. The `.gitignore` already excludes `/recovery`, but consider also copying it to a password manager.

2. **Create the wallet set** (one-time):

   ```bash
   bun run create-wallet-set               # prints a UUID — paste into .env.local as CIRCLE_WALLET_SET_ID
   ```

3. **Fill in the rest of `.env.local`:**

   - `CIRCLE_API_KEY` — from `console.circle.com` (TEST_API_KEY prefix for testnet)
   - `KIT_KEY` — also from `console.circle.com` → Kit Keys
   - `GEMINI_API_KEY` — from `aistudio.google.com/apikey`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — from a new Supabase project
   - `CRON_SECRET` — any long random string (used to gate `/api/agent/run` from arbitrary public calls)

4. **Apply the Supabase schema:**

   - Open the Supabase SQL editor for your project.
   - Paste the contents of `lib/db/schema.sql` and run.

5. **Resolve `cirBTC` token address:**

   Once `KIT_KEY` is set, write a tiny one-off that calls `kit.swap(...)` in dry-run mode with `tokenIn: "USDC", tokenOut: "cirBTC"` and read the resolved address from the result. Cache it in `.env.local` as `ARC_CIRBTC_ADDRESS`.

6. **Link Vercel + first deploy:**

   ```bash
   bunx vercel link
   bunx vercel env pull .env.local         # if you've added vars in Vercel dashboard
   bunx vercel --prod
   ```

7. **Deploy `TraceAnchor.sol` via Circle SCP** (covered by PLAN.md Phase 3 — defer until then). When you do, **compile with `evmVersion: "paris"`** to avoid PUSH0.

Once steps 1–6 are done, the Phase 1 ship gate is met and you can start Phase 2 (wallet creation flow).
