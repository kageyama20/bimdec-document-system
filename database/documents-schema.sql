-- BIMDEC Document System — Document numbering + records
-- ---------------------------------------------------------------
-- Run this once in your Supabase project's SQL Editor, AFTER
-- supabase-schema.sql (this relies on public.is_admin()).
--
-- Adds:
--   1. public.document_counters — one row per (doc_type, day), used
--      to hand out the next sequence number atomically. Numbers reset
--      to 0001 each calendar day (UTC).
--   2. public.next_document_number(...) — RPC the frontend calls to
--      reserve a number. Uses an upsert, so two admins clicking
--      "Generate No." at the same moment can never get the same number.
--      Returns the fully-formatted string, e.g. "20260826-0001" —
--      the client never assembles this itself.
--   3. public.documents — one row per generated Quotation / Invoice /
--      Receipt, with a pointer to its PDF in Storage.
--   4. A private "documents" Storage bucket + RLS so only admins can
--      read/write the saved PDFs.
--
-- RE-RUNNING THIS FILE (e.g. to fix a previous "permission denied for
-- function next_document_number" error): the `drop function` line
-- below removes the old (text, int) version — that's expected and
-- required, since the new version takes a different signature (just
-- p_doc_type; the day is computed server-side from `now()` instead of
-- being passed in from the client). If you'd already generated real
-- numbers under the old YYYY-#### scheme, back up
-- public.document_counters first; this script drops and recreates it.
-- Every `create policy` is preceded by a matching `drop policy if
-- exists`, so the whole file is safe to run again from scratch.
-- ---------------------------------------------------------------

drop function if exists public.next_document_number(text, int);
drop table if exists public.document_counters;

create table public.document_counters (
  doc_type text not null check (doc_type in ('quotation','invoice','receipt')),
  period text not null, -- 'YYYYMMDD', UTC calendar day
  last_number int not null default 0,
  primary key (doc_type, period)
);

alter table public.document_counters enable row level security;

drop policy if exists "document_counters_admin_all" on public.document_counters;
create policy "document_counters_admin_all" on public.document_counters
  for all using (public.is_admin()) with check (public.is_admin());

-- Atomically reserves the next sequence number for (doc_type, today)
-- and returns it pre-formatted as "YYYYMMDD-####". SECURITY DEFINER +
-- the upsert's row lock is what makes this safe under concurrent
-- calls — do not replace this with a "select last_number, then
-- update" pair from the client. The period is computed here from
-- `now()`, not passed in, so the client can't send a stale/spoofed
-- date and two clients in different timezones still land on the same
-- counter.
create or replace function public.next_document_number(p_doc_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(now() at time zone 'utc', 'YYYYMMDD');
  v_next int;
begin
  if not public.is_admin() then
    raise exception 'Only admins can generate document numbers.';
  end if;

  insert into public.document_counters (doc_type, period, last_number)
  values (p_doc_type, v_period, 1)
  on conflict (doc_type, period) do update
    set last_number = public.document_counters.last_number + 1
  returning last_number into v_next;

  return v_period || '-' || lpad(v_next::text, 4, '0');
end;
$$;

-- Belt-and-suspenders: functions default to PUBLIC execute rights in
-- Postgres, but some Supabase project setups revoke that by default,
-- which is what produces "permission denied for function
-- next_document_number" — the call never reaches the is_admin() check
-- above, it's rejected before the function body runs. Revoke-then-grant
-- explicitly so re-running this file always leaves the right role with
-- access, regardless of what state the project was in before.
revoke all on function public.next_document_number(text) from public;
grant execute on function public.next_document_number(text) to authenticated;

-- One row per generated document. doc_number is globally unique across
-- all three types (it already embeds the type-specific prefix), which
-- also lets saveGeneratedDocument() in the frontend upsert on it: saving
-- the same number twice (e.g. "Save to records" then "Send email")
-- updates the existing row instead of erroring or duplicating it.
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('quotation','invoice','receipt')),
  doc_number text not null unique,
  client_name text default '',
  company text default '',
  project text default '',
  total_amount numeric,
  pdf_path text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.documents enable row level security;

drop policy if exists "documents_admin_all" on public.documents;
create policy "documents_admin_all" on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

-- Private bucket — PDFs are fetched through short-lived signed URLs
-- (see DB.getDocumentPdfUrl in frontend/src/lib/db.js), never a public one.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents_storage_admin_all" on storage.objects;
create policy "documents_storage_admin_all" on storage.objects
  for all using (bucket_id = 'documents' and public.is_admin())
  with check (bucket_id = 'documents' and public.is_admin());

-- ---------------------------------------------------------------
-- After running this, generated Quotation/Invoice/Receipt numbers and
-- their PDFs are stored for real — see the "Generate No." and
-- "Save to records" controls on each tab of Admin -> Documents.
-- ---------------------------------------------------------------
