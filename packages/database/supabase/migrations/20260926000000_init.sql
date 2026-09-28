-- Social Studio: server-only storage for social account tokens and OAuth state.
--
-- Security model: these tables are touched ONLY by the backend (apps/web) using the
-- service_role key, which bypasses RLS. RLS is enabled with NO policies, and all privileges are
-- revoked from anon/authenticated, so the public (anon) key cannot read or write anything here.
-- Access tokens are stored AES-256-GCM encrypted by the application; the database never sees
-- plaintext tokens or the encryption key.

-- ─── updated_at trigger ────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── social_accounts ──────────────────────────────────────────────────────────────────────
create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id text not null,           -- Sanity organization document ID (or 'default')
  client_id text not null,                 -- Sanity client document ID (published ID)
  provider text not null check (provider in ('instagram')),
  provider_account_id text not null,       -- Instagram professional account ID
  username text,
  account_type text,
  encrypted_access_token text not null,    -- v1.<iv>.<tag>.<ciphertext>, AAD = provider:provider_account_id
  token_key_version smallint not null default 1,
  token_expires_at timestamptz,
  token_refreshed_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected', 'expired', 'revoked', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_accounts_client_provider_key unique (client_id, provider)
);

comment on table public.social_accounts is
  'One connected social account per client per provider. Server-only (service_role); tokens are encrypted by the app.';

create index social_accounts_provider_account_id_idx on public.social_accounts (provider_account_id);
create index social_accounts_token_expires_at_idx on public.social_accounts (token_expires_at) where status = 'connected';

create trigger social_accounts_set_updated_at
  before update on public.social_accounts
  for each row execute function public.set_updated_at();

-- ─── oauth_states ─────────────────────────────────────────────────────────────────────────
create table public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  state_hash text not null unique check (state_hash ~ '^[0-9a-f]{64}$'), -- sha256 hex of the state; the raw state is never stored
  provider text not null check (provider in ('instagram')),
  client_id text not null,
  organization_id text not null,
  sanity_user_id text not null,
  browser_binding_hash text check (browser_binding_hash is null or browser_binding_hash ~ '^[0-9a-f]{64}$'),
  launched_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.oauth_states is
  'Single-use OAuth state for Connect Instagram. Launched once (binds a browser cookie), consumed once. Server-only (service_role).';

create index oauth_states_expires_at_idx on public.oauth_states (expires_at);

-- ─── Lock down: RLS on, no policies, no grants for client roles ──────────────────────────
alter table public.social_accounts enable row level security;
alter table public.oauth_states enable row level security;

revoke all on table public.social_accounts from anon, authenticated;
revoke all on table public.oauth_states from anon, authenticated;

-- ─── Cleanup of expired/consumed OAuth states (safe to call from pg_cron) ────────────────
create or replace function public.delete_expired_oauth_states()
returns integer
language sql
set search_path = ''
as $$
  with deleted as (
    delete from public.oauth_states
    where expires_at < now() - interval '1 day'
    returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke all on function public.delete_expired_oauth_states() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- Optional (requires the pg_cron extension):
-- select cron.schedule('delete-expired-oauth-states', '17 * * * *', $$select public.delete_expired_oauth_states()$$);
