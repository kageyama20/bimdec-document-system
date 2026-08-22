-- BIMDEC Document System — Supabase schema
-- ---------------------------------------------------------------
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).
--
-- This replaces the old localStorage-based "database" in
-- assets/js/db.js with real tables + Supabase Auth for login.
-- ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','client')),
  full_name text not null default '',
  email text not null,
  position text default '',
  company text default '',
  phone text default '',
  invited_by text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.invites (
  code text primary key,
  role text not null check (role in ('admin','client')),
  note text default '',
  created_at timestamptz not null default now(),
  used_by text,
  used_at timestamptz,
  created_by uuid references auth.users(id)
);

alter table public.profiles enable row level security;
alter table public.invites enable row level security;

-- Helper: is the currently-logged-in user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: a user can read/update their own row; admins can read/update all.
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own_or_admin" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- Invites: admin-only (list, create, revoke).
create policy "invites_admin_all" on public.invites
  for all using (public.is_admin()) with check (public.is_admin());

-- Public RPC so signup.html can check a code before the visitor is
-- authenticated (kept ready for when invite-gating is switched back on).
create or replace function public.validate_invite(p_code text)
returns table(code text, role text, note text, used_by text)
language sql
security definer
set search_path = public
as $$
  select code, role, note, used_by
  from public.invites
  where upper(code) = upper(p_code)
  limit 1;
$$;

-- Marks an invite used right after a successful signup.
create or replace function public.redeem_invite(p_code text, p_email text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.invites
  set used_by = p_email, used_at = now()
  where upper(code) = upper(p_code) and used_by is null;
$$;

grant execute on function public.validate_invite(text) to anon, authenticated;
grant execute on function public.redeem_invite(text, text) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- One bootstrap invite so you can create your first admin account
-- through the normal invite-gated signup flow. Use it once, then
-- generate fresh codes from the Admin Portal for everyone else.
insert into public.invites (code, role, note)
values ('ADMIN-BOOTSTRAP-0001', 'admin', 'Bootstrap code — use once to create the first admin account.')
on conflict (code) do nothing;

-- ---------------------------------------------------------------
-- After running this:
-- 1. Dashboard -> Authentication -> Providers -> Email ->
--    turn OFF "Confirm email" (so new accounts can sign in
--    immediately — this is an internal staff/client tool, not a
--    public signup form). Turn it back on later if you want
--    email verification.
-- 2. Dashboard -> Project Settings -> API -> copy the
--    "Project URL" and "anon public" key into
--    assets/js/supabase-config.js.
-- 3. First account created via signup.html: use invite code
--    ADMIN-BOOTSTRAP-0001, choose to sign up, and that becomes your
--    first real admin — replacing the old BOOTSTRAP_ADMIN. From
--    there, generate fresh invite codes from the Admin Portal for
--    everyone else and this bootstrap code stays unused/irrelevant.
-- ---------------------------------------------------------------
