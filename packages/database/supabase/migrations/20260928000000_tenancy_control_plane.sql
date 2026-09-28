-- Social Studio multi-tenant control plane (Phase 1).
--
-- Model: one agency = one organization = one dedicated Sanity project. This database is the only
-- source of truth for who belongs to which organization and which Sanity project that is. The
-- browser never supplies tenant infrastructure identifiers; the backend resolves them from the
-- authenticated user's memberships.
--
-- Access model:
--   * `authenticated` (a signed-in user through the publishable/anon key) reads through RLS.
--     Every tenant table carries organization_id and every policy goes through the helper
--     functions below, which read the caller's memberships (auth.uid()).
--   * Writes that span tables (creating an organization, provisioning, invitations, audit) run on
--     the server with the service role after explicit permission checks. Simple owner/admin writes
--     (clients, client access, organization name) are also allowed through RLS.
--   * `anon` gets nothing.

-- ─── Enums ────────────────────────────────────────────────────────────────────────────────
create type public.organization_status as enum (
  'provisioning', 'active', 'failed', 'suspended', 'cancelled', 'pending_deletion'
);
create type public.organization_role as enum ('owner', 'admin', 'editor', 'reviewer', 'client');
create type public.membership_status as enum ('active', 'invited', 'disabled');
create type public.client_status as enum ('active', 'archived');
create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'cancelled', 'incomplete');
create type public.provisioning_job_type as enum ('provision', 'health_check', 'offboard');
create type public.provisioning_job_status as enum ('pending', 'running', 'succeeded', 'failed');

-- ─── organizations ────────────────────────────────────────────────────────────────────────
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'),
  status public.organization_status not null default 'provisioning',
  plan text not null default 'trial',
  -- Content plane. Set by provisioning only; never accepted from a browser.
  sanity_project_id text unique check (sanity_project_id is null or sanity_project_id ~ '^[a-z0-9]{1,32}$'),
  sanity_dataset text not null default 'production' check (sanity_dataset ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  -- Health (Phase 7 fills these in; kept here so every agency has one row to look at).
  sanity_last_health_check_at timestamptz,
  sanity_last_error text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.organizations is 'Agencies (tenants). One dedicated Sanity project each.';
comment on column public.organizations.sanity_project_id is 'Trusted tenant Sanity project. Written by provisioning only.';

-- ─── profiles ─────────────────────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) <= 120),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── organization_members ─────────────────────────────────────────────────────────────────
create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organization_role not null,
  status public.membership_status not null default 'active',
  invited_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index organization_members_user_idx on public.organization_members (user_id) where status = 'active';

-- ─── organization_invitations ─────────────────────────────────────────────────────────────
-- Invitations by email. Accepted when a user with that (verified) email signs in.
create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+$'),
  role public.organization_role not null check (role <> 'owner'),
  client_ids uuid[] not null default '{}',
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index organization_invitations_open_idx
  on public.organization_invitations (organization_id, email) where accepted_at is null and revoked_at is null;

-- ─── clients ──────────────────────────────────────────────────────────────────────────────
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$'),
  logo_url text check (logo_url is null or logo_url ~ '^https://'),
  website text check (website is null or website ~ '^https?://'),
  industry text check (industry is null or char_length(industry) <= 80),
  status public.client_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  -- Lets child tables reference (organization_id, id) so a row can never point at another tenant's client.
  unique (organization_id, id)
);

-- ─── client_members ───────────────────────────────────────────────────────────────────────
-- Optional restriction: an agency member WITH rows here only sees those clients. A `client`
-- member only ever sees the clients listed here.
create table public.client_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  client_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organization_role not null default 'client',
  created_at timestamptz not null default now(),
  unique (client_id, user_id),
  foreign key (organization_id, client_id) references public.clients (organization_id, id) on delete cascade
);
create index client_members_user_idx on public.client_members (user_id, organization_id);

-- ─── subscriptions ────────────────────────────────────────────────────────────────────────
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  provider text not null default 'manual',
  external_subscription_id text,
  plan text not null,
  status public.subscription_status not null default 'trialing',
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_subscription_id)
);

-- ─── audit_logs ───────────────────────────────────────────────────────────────────────────
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  action text not null check (action ~ '^[a-z_]+(\.[a-z_]+)+$'),
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

-- ─── provisioning_jobs ────────────────────────────────────────────────────────────────────
create table public.provisioning_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type public.provisioning_job_type not null,
  status public.provisioning_job_status not null default 'pending',
  -- Completed steps, so a retry resumes instead of redoing work (e.g. never creates a 2nd project).
  steps jsonb not null default '{}',
  -- Internal diagnostics. Never shown to customers verbatim.
  error text,
  attempts integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index provisioning_jobs_org_idx on public.provisioning_jobs (organization_id, created_at desc);
-- At most one active provisioning job per organization.
create unique index provisioning_jobs_one_running_idx
  on public.provisioning_jobs (organization_id, type) where status in ('pending', 'running');

-- ─── platform_admins ──────────────────────────────────────────────────────────────────────
-- SaaS operators. Deliberately unrelated to tenant roles: an agency owner is never a platform admin.
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ─── updated_at triggers ──────────────────────────────────────────────────────────────────
create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger organization_members_set_updated_at before update on public.organization_members
  for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients
  for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ─── Profile on signup ────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, nullif(left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 120), ''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Authorization helpers (used by every policy) ────────────────────────────────────────
-- SECURITY DEFINER so policies can read memberships without recursive RLS; each one only ever
-- answers questions about auth.uid() itself.

create or replace function public.current_org_role(org uuid)
returns public.organization_role
language sql stable security definer set search_path = ''
as $$
  select m.role
  from public.organization_members m
  join public.organizations o on o.id = m.organization_id
  where m.organization_id = org
    and m.user_id = auth.uid()
    and m.status = 'active'
    and o.status not in ('cancelled', 'pending_deletion')
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.current_org_role(org) is not null
$$;

create or replace function public.has_org_role(org uuid, roles public.organization_role[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_org_role(org) = any (roles), false)
$$;

-- Client-level access: owner/admin see every client. Other agency roles see every client unless
-- they have client_members rows in this organization, which then restrict them. `client` users
-- see only the clients they are explicitly assigned to.
create or replace function public.can_access_client(org uuid, client uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  with role as (select public.current_org_role(org) as r)
  select case
    when (select r from role) is null then false
    when (select r from role) in ('owner', 'admin') then true
    when (select r from role) = 'client' or exists (
      select 1 from public.client_members cm where cm.organization_id = org and cm.user_id = auth.uid()
    ) then exists (
      select 1 from public.client_members cm
      where cm.organization_id = org and cm.client_id = client and cm.user_id = auth.uid()
    )
    else true
  end
    and exists (select 1 from public.clients c where c.id = client and c.organization_id = org)
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

-- ─── Privileges: start from nothing ──────────────────────────────────────────────────────
revoke all on table
  public.organizations, public.profiles, public.organization_members, public.organization_invitations,
  public.clients, public.client_members, public.subscriptions, public.audit_logs,
  public.provisioning_jobs, public.platform_admins
from anon, authenticated;

revoke all on function
  public.current_org_role(uuid), public.is_org_member(uuid), public.has_org_role(uuid, public.organization_role[]),
  public.can_access_client(uuid, uuid), public.is_platform_admin(), public.handle_new_user()
from public, anon;
grant execute on function
  public.current_org_role(uuid), public.is_org_member(uuid), public.has_org_role(uuid, public.organization_role[]),
  public.can_access_client(uuid, uuid), public.is_platform_admin()
to authenticated;

-- Column-level grants: infrastructure columns of organizations are never readable by customers.
grant select (id, name, slug, status, plan, created_at, updated_at) on public.organizations to authenticated;
grant update (name) on public.organizations to authenticated;
grant select, update (display_name, avatar_url) on public.profiles to authenticated;
grant select on public.organization_members to authenticated;
grant select on public.organization_invitations to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, delete on public.client_members to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.audit_logs to authenticated;
grant select (id, organization_id, type, status, started_at, completed_at, created_at) on public.provisioning_jobs to authenticated;
-- platform_admins: no grants. Operators are checked on the server with the service role.

-- ─── Row level security ──────────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.clients enable row level security;
alter table public.client_members enable row level security;
alter table public.subscriptions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.provisioning_jobs enable row level security;
alter table public.platform_admins enable row level security;

-- organizations
create policy "members read their organizations" on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy "owners and admins rename their organization" on public.organizations
  for update to authenticated
  using (public.has_org_role(id, array['owner', 'admin']::public.organization_role[]))
  with check (public.has_org_role(id, array['owner', 'admin']::public.organization_role[]));

-- profiles: yourself, and people you share an organization with.
create policy "read own and co-member profiles" on public.profiles
  for select to authenticated using (
    user_id = auth.uid()
    or exists (
      select 1 from public.organization_members theirs
      where theirs.user_id = profiles.user_id
        and theirs.status = 'active'
        and public.has_org_role(theirs.organization_id, array['owner', 'admin', 'editor', 'reviewer']::public.organization_role[])
    )
  );
create policy "update own profile" on public.profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- organization_members: agency staff see the team; `client` users only see themselves.
create policy "read memberships" on public.organization_members
  for select to authenticated using (
    user_id = auth.uid()
    or public.has_org_role(organization_id, array['owner', 'admin', 'editor', 'reviewer']::public.organization_role[])
  );

-- organization_invitations: team managers only.
create policy "managers read invitations" on public.organization_invitations
  for select to authenticated using (public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));

-- clients
create policy "read accessible clients" on public.clients
  for select to authenticated using (public.can_access_client(organization_id, id));
create policy "managers create clients" on public.clients
  for insert to authenticated with check (public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));
create policy "managers update clients" on public.clients
  for update to authenticated
  using (public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]))
  with check (public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));
create policy "managers delete clients" on public.clients
  for delete to authenticated using (public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));

-- client_members
create policy "read client access" on public.client_members
  for select to authenticated using (
    user_id = auth.uid() or public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
  );
create policy "managers grant client access" on public.client_members
  for insert to authenticated with check (
    public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[])
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = client_members.organization_id and m.user_id = client_members.user_id
    )
  );
create policy "managers revoke client access" on public.client_members
  for delete to authenticated using (public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));

-- subscriptions: billing is the owner's (admins can see the plan).
create policy "owners and admins read subscriptions" on public.subscriptions
  for select to authenticated using (public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));

-- audit_logs: owners and admins read their organization's trail. Written by the server only.
create policy "managers read audit log" on public.audit_logs
  for select to authenticated using (public.has_org_role(organization_id, array['owner', 'admin']::public.organization_role[]));

-- provisioning_jobs: status only (no error column is granted).
create policy "members read provisioning status" on public.provisioning_jobs
  for select to authenticated using (public.is_org_member(organization_id));
