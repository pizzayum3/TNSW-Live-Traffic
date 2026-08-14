-- ============================================================
-- Discord bot migration — run once in Supabase SQL Editor
-- ============================================================
create table if not exists public.discord_messages (
  incident_id uuid primary key references public.incidents(id) on delete cascade,
  channel_id text not null,
  message_id text not null,
  created_at timestamptz default now()
);

alter table public.discord_messages enable row level security;
-- Intentionally no public policies here. Only the bot (using the
-- service_role key, which bypasses RLS entirely) can read or write
-- this table. Nobody else — not even Staff/Command on the website —
-- can see or touch it.
