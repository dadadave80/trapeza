-- Trapeza Supabase schema. Apply in the Supabase SQL editor.
--
-- Four-asset basket on Arc Testnet (via the hackathon mocks):
--   USDC   — cash + gas reserve
--   EURC   — safe-FX
--   cirBTC — risk leg
--   USYC   — yield-bearing wrapped USDC (~10% APY via MockUSYC vault)

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  goal text check (goal in ('conservative', 'balanced', 'aggressive')),
  circle_wallet_id text,
  arc_address text,
  created_at timestamptz default now()
);

create table if not exists portfolios (
  user_id uuid primary key references users(id) on delete cascade,
  usdc_balance numeric default 0,
  eurc_balance numeric default 0,
  cirbtc_balance numeric default 0,
  -- USYC shares (not USDC value). The agent persists shares so a future audit
  -- can reconstruct the wallet from balances + the share-to-asset ratio at
  -- decision time.
  usyc_balance numeric default 0,
  -- last_rebalance_at: last decision that actually executed at least one swap
  last_rebalance_at timestamptz,
  -- last_checked_at: most recent agent tick, even when it did nothing
  -- (cron visibility — lets the dashboard show "agent woke up 4 min ago")
  last_checked_at timestamptz,
  updated_at timestamptz default now()
);

-- For existing prod dbs that pre-date the USYC column, run once:
--   alter table portfolios add column if not exists usyc_balance numeric default 0;

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  regime text,
  signals jsonb,
  target_weights jsonb,             -- { usdc, eurc, cirbtc, usyc } summing to 1
  prev_weights jsonb,
  reasoning text,
  alerts jsonb default '[]'::jsonb,
  trace_hash text,
  -- arc_tx_hash kept for backwards compat (= first executed swap), but
  -- arc_tx_hashes carries the full list so partial-success cases are visible
  arc_tx_hash text,
  arc_tx_hashes jsonb default '[]'::jsonb,
  -- partial = some legs executed, some failed. UI surfaces this differently
  -- from a clean "all executed" or "plan only" decision.
  partial boolean default false,
  circle_tx_id text,                -- developer-controlled-wallets transaction id
  executed boolean default false,
  created_at timestamptz default now()
);

create index if not exists decisions_user_created_idx
  on decisions (user_id, created_at desc);

-- Optional: realtime tail for the dashboard.
-- alter publication supabase_realtime add table portfolios, decisions;
