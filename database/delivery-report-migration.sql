-- BIMDEC Document System — Delivery Report feature migration
-- ---------------------------------------------------------------
-- Run this once in your Supabase project's SQL Editor, AFTER
-- documents-schema.sql and contracts-migration.sql. Safe to re-run.
--
-- Adds 'delivery' to the doc_type check constraints on both
-- public.documents and public.document_counters, so Delivery Reports
-- get their own saved records and their own "YYYYMMDD-####" numbering
-- sequence (independent of quotation/contract/invoice/receipt numbers).
-- ---------------------------------------------------------------

alter table public.documents drop constraint if exists documents_doc_type_check;
alter table public.documents
  add constraint documents_doc_type_check
  check (doc_type in ('quotation', 'invoice', 'receipt', 'contract', 'delivery'));

alter table public.document_counters drop constraint if exists document_counters_doc_type_check;
alter table public.document_counters
  add constraint document_counters_doc_type_check
  check (doc_type in ('quotation', 'invoice', 'receipt', 'contract', 'delivery'));
