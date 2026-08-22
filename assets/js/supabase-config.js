/*
 * Fill these in from your Supabase project:
 * Dashboard -> Project Settings -> API
 *   - "Project URL"        -> url
 *   - "anon public" key    -> anonKey  (safe to expose in frontend code —
 *                              it only grants what your RLS policies in
 *                              database/supabase-schema.sql allow)
 *
 * Never put the "service_role" key here — that one bypasses RLS and
 * must never reach the browser.
 */
window.SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT-REF.supabase.co',
  anonKey: 'YOUR-ANON-PUBLIC-KEY'
};
