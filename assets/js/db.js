/*
 * BIMDEC Document System — database layer (Supabase-backed)
 * ---------------------------------------------------------------
 * Replaces the old localStorage prototype. Real accounts (Supabase
 * Auth), a real users/invites database (Postgres via Supabase), and
 * row-level security instead of "anyone with devtools can edit it".
 *
 * Requires, loaded BEFORE this file:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="assets/js/supabase-config.js"></script>
 *
 * Every method here is async (returns a Promise) — callers use
 * `await`. See database/supabase-schema.sql for the table/RLS setup
 * this expects, and database/SCHEMA.md for the data model notes.
 * ---------------------------------------------------------------
 */

const sb = window.supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);

function mapProfile(p) {
  if (!p) return null;
  return {
    id: p.id,
    role: p.role,
    fullName: p.full_name,
    email: p.email,
    position: p.position,
    company: p.company,
    phone: p.phone,
    createdAt: p.created_at,
    invitedBy: p.invited_by
  };
}

const DB = {
  async _getProfile(userId) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) { console.error(error); return null; }
    return data;
  },

  async findUserByEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    const { data, error } = await sb.from('profiles').select('*').eq('email', e).maybeSingle();
    if (error) return null;
    return mapProfile(data);
  },

  async login(email, password, expectedRole) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    const profile = await this._getProfile(data.user.id);
    if (!profile) {
      await sb.auth.signOut();
      return { ok: false, error: 'No profile found for this account. Ask an administrator to check your account.' };
    }
    if (expectedRole && profile.role !== expectedRole) {
      await sb.auth.signOut();
      return {
        ok: false,
        error: `This account is registered as ${profile.role === 'admin' ? 'an Admin' : 'a Client'}. Use the ${profile.role === 'admin' ? 'Admin' : 'Client'} tab to sign in.`
      };
    }
    return { ok: true, user: mapProfile(profile), session: mapProfile(profile) };
  },

  async logout() {
    await sb.auth.signOut();
  },

  async getSession() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const profile = await this._getProfile(session.user.id);
    if (!profile) return null;
    return mapProfile(profile);
  },

  /* Guard for portal pages: redirect to login if not authenticated,
     or if authenticated with the wrong role for this page. Call as
     `const session = await DB.requireSession('admin');` and bail out
     (return) if it comes back null — the redirect is already under way.
     Only called from admin/*.html and client/*.html, both one level
     down from login.html, hence '../login.html'. */
  async requireSession(role) {
    const s = await this.getSession();
    if (!s || (role && s.role !== role)) {
      window.location.href = '../login.html';
      return null;
    }
    return s;
  },

  async validateInvite(code) {
    const c = String(code || '').trim();
    const { data, error } = await sb.rpc('validate_invite', { p_code: c });
    if (error || !data || data.length === 0) return { ok: false, error: 'Invite code not recognized.' };
    const invite = data[0];
    if (invite.used_by) return { ok: false, error: 'This invite code has already been used.' };
    return { ok: true, invite };
  },

  /* invite is optional — signup.html currently has invite-gating
     switched off, so callers pass `role` directly. Still honors a
     real invite object if one is passed in. */
  async createUser({ invite, role, fullName, email, password, orgOrPosition, phone }) {
    const finalRole = invite ? invite.role : role;
    const e = String(email || '').trim().toLowerCase();

    const { data: signUpData, error: signUpError } = await sb.auth.signUp({ email: e, password });
    if (signUpError) return { ok: false, error: signUpError.message };

    const userId = signUpData.user ? signUpData.user.id : null;
    if (!userId) {
      return { ok: false, error: 'Signup succeeded but no user id was returned — check the Supabase Auth "Confirm email" setting (see database/supabase-schema.sql notes).' };
    }

    const profileRow = {
      id: userId,
      role: finalRole,
      full_name: String(fullName || '').trim(),
      email: e,
      position: finalRole === 'admin' ? (orgOrPosition || '') : '',
      company: finalRole === 'client' ? (orgOrPosition || '') : '',
      phone: phone || '',
      invited_by: invite ? invite.code : '(no invite — invite-gating disabled)'
    };
    const { error: profileError } = await sb.from('profiles').insert(profileRow);
    if (profileError) return { ok: false, error: profileError.message };

    if (invite) {
      await sb.rpc('redeem_invite', { p_code: invite.code, p_email: e });
    }

    return { ok: true, user: mapProfile(profileRow) };
  },

  /* --- Admin-only helpers (RLS restricts these to admin accounts) --- */
  async listUsers() {
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data.map(mapProfile);
  },

  async listInvites() {
    const { data, error } = await sb.from('invites').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data;
  },

  async createInvite(role, note) {
    const code = (role === 'admin' ? 'ADMIN-' : 'CLIENT-') +
      Math.random().toString(36).slice(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    const { data: { user } } = await sb.auth.getUser();
    const { error } = await sb.from('invites').insert({
      code, role, note: note || '', created_by: user ? user.id : null
    });
    if (error) { console.error(error); return null; }
    return code;
  },

  async revokeInvite(code) {
    await sb.from('invites').delete().eq('code', code);
  }
};
