/*
 * The one Supabase client for the whole app.
 *
 * URL and key come from Vite env vars (see frontend/.env.example) instead of
 * the old window.SUPABASE_CONFIG global, so the same bundle can be pointed at
 * a different project without editing source. The "anon"/publishable key is
 * safe to ship in the bundle — it only grants what the RLS policies in
 * database/supabase-schema.sql allow. The "service_role" key bypasses RLS and
 * must never appear here.
 */
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy frontend/.env.example ' +
    'to frontend/.env for local dev, or set them on the static site in render.yaml.'
  );
}

export const supabase = createClient(url, anonKey);
