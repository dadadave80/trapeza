-- Trapeza Supabase schema. Apply in the Supabase SQL editor.
--
-- Token columns reflect the App Kit Swap allowlist on Arc Testnet:
-- USDC (cash) / EURC (safe-FX) / cirBTC (risk). See
-- docs/docs.arc.network/app-kit/references/supported-blockchains.md.

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
  last_rebalance_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  regime text,
  signals jsonb,
  target_weights jsonb,             -- { usdc, eurc, cirbtc } summing to 1
  prev_weights jsonb,
  reasoning text,
  alerts jsonb default '[]'::jsonb,
  trace_hash text,
  arc_tx_hash text,
  circle_tx_id text,                -- developer-controlled-wallets transaction id
  executed boolean default false,
  created_at timestamptz default now()
);

create index if not exists decisions_user_created_idx
  on decisions (user_id, created_at desc);

-- Optional: realtime tail for the dashboard.
-- alter publication supabase_realtime add table portfolios, decisions;
