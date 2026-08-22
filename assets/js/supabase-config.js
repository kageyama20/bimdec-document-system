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
  url: 'https://tardsfjvpfusgrgzruit.supabase.co/rest/v1/',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcmRzZmp2cGZ1c2dyZ3pydWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczOTQyNjYsImV4cCI6MjEwMjk3MDI2Nn0.E3ksg3Co0hR8r7Sv7R6-I5wM1BtvOQ7DqCkD1WTtXIk'
};
