-- BIMDEC Document System — Document numbering + records
-- ---------------------------------------------------------------
-- Run this once in your Supabase project's SQL Editor, AFTER
-- supabase-schema.sql (this relies on public.is_admin()).
--
-- Adds:
--   1. public.document_counters — one row per (doc_type, year), used
--      to hand out the next sequence number atomically.
--   2. public.next_document_number(...) — RPC the frontend calls to
--      reserve a number. Uses an upsert, so two admins clicking
--      "Generate No." at the same moment can never get the same number.
--   3. public.documents — one row per generated Quotation / Invoice /
--      Receipt, with a pointer to its PDF in Storage.
--   4. A private "documents" Storage bucket + RLS so only admins can
--      read/write the saved PDFs.
-- ---------------------------------------------------------------

create table if not exists public.document_counters (
  doc_type text not null check (doc_type in ('quotation','invoice','receipt')),
  year int not null,
  last_number int not null default 0,
  primary key (doc_type, year)
);

alter table public.document_counters enable row level security;

create policy "document_counters_admin_all" on public.document_counters
  for all using (public.is_admin()) with check (public.is_admin());

-- Atomically reserves and returns the next sequence number for
-- (doc_type, year). SECURITY DEFINER + the upsert's row lock is what
-- makes this safe under concurrent calls — do not replace this with a
-- "select last_number, then update" pair from the client.
create or replace function public.next_document_number(p_doc_type text, p_year int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  if not public.is_admin() then
    raise exception 'Only admins can generate document numbers.';
  end if;

  insert into public.document_counters (doc_type, year, last_number)
  values (p_doc_type, p_year, 1)
  on conflict (doc_type, year) do update
    set last_number = public.document_counters.last_number + 1
  returning last_number into v_next;

  return v_next;
end;
$$;

grant execute on function public.next_document_number(text, int) to authenticated;

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

create policy "documents_admin_all" on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

-- Private bucket — PDFs are fetched through short-lived signed URLs
-- (see DB.getDocumentPdfUrl in frontend/src/lib/db.js), never a public one.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_storage_admin_all" on storage.objects
  for all using (bucket_id = 'documents' and public.is_admin())
  with check (bucket_id = 'documents' and public.is_admin());

-- ---------------------------------------------------------------
-- After running this, generated Quotation/Invoice/Receipt numbers and
-- their PDFs are stored for real — see the "Generate No." and
-- "Save to records" controls on each tab of Admin -> Documents.
-- ---------------------------------------------------------------
