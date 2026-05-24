-- Migration 001 — partial-swap tracking + cron visibility.
--
-- Apply in Supabase SQL editor after the initial schema.sql.
-- Safe to re-run (uses IF NOT EXISTS guards everywhere).

alter table portfolios
  add column if not exists last_checked_at timestamptz;

alter table decisions
  add column if not exists arc_tx_hashes jsonb default '[]'::jsonb;

alter table decisions
  add column if not exists partial boolean default false;
