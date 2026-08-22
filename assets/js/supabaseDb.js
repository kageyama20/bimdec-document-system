/*
 * BIMDEC Document System — Supabase-backed "database" layer
 * ---------------------------------------------------------------
 * This replaces the old localStorage-only assets/js/db.js. It keeps
 * the same DB.* method names the rest of the app already calls, so
 * pages didn't need a full rewrite — just a swap of which script tag
 * they load, plus awaiting these methods since real network calls are
 * async (the old localStorage versions were synchronous).
 *
 * Requires, in this order, before this file:
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src=".../assets/js/supabase-config.js"></script>
 *
 * Run database/supabase-schema.sql once in your Supabase project's
 * SQL Editor before using this — it creates the profiles/invites
 * tables, RLS policies, and helper functions this file calls.
 * ---------------------------------------------------------------
 */

if (!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || !window.SUPABASE_CONFIG.anonKey) {
  console.error('[supabaseDb] Missing window.SUPABASE_CONFIG — check assets/js/supabase-config.js is loaded first.');
}

const _sb = window.supabase.createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);

async function _getProfile(userId) {
  const { data, error } = await _sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

function _toSession(authUser, profile) {
  if (!profile) return null;
  return {
    userId: authUser.id,
    role: profile.role,
    fullName: profile.full_name,
    email: profile.email,
    loginAt: new Date().toISOString(),
  };
}

function _friendlyAuthError(message) {
  if (/Invalid login credentials/i.test(message)) return 'Incorrect email or password.';
  if (/User already registered/i.test(message)) return 'An account with that email already exists.';
  return message;
}

const DB = {
  async login(email, password, expectedRole) {
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: _friendlyAuthError(error.message) };

    let profile;
    try { profile = await _getProfile(data.user.id); }
    catch (e) { return { ok: false, error: 'Could not load your account profile: ' + e.message }; }

    if (!profile) {
      return { ok: false, error: 'No profile found for this account. Ask an administrator to check your account.' };
    }
    if (expectedRole && profile.role !== expectedRole) {
      await _sb.auth.signOut();
      const actual = profile.role === 'admin' ? 'an Admin' : 'a Client';
      const useTab = profile.role === 'admin' ? 'Admin' : 'Client';
      return { ok: false, error: `This account is registered as ${actual}. Use the ${useTab} tab to sign in.` };
    }
    return { ok: true, session: _toSession(data.user, profile) };
  },

  async logout() {
    await _sb.auth.signOut();
  },

  async getSession() {
    const { data } = await _sb.auth.getSession();
    if (!data.session) return null;
    let profile;
    try { profile = await _getProfile(data.session.user.id); }
    catch (e) { return null; }
    return _toSession(data.session.user, profile);
  },

  /* Guard for portal pages: redirect to login if not authenticated,
     or if authenticated with the wrong role for this page. Call this
     from an async boot() at the bottom of the page's script, not at
     the top level — see admin/*.html for the pattern. */
  async requireSession(role) {
    const s = await this.getSession();
    if (!s || (role && s.role !== role)) {
      const inSubfolder = /\/(admin|client)\//.test(window.location.pathname);
      window.location.href = inSubfolder ? '../login.html' : 'login.html';
      return null;
    }
    return s;
  },

  async createUser({ role, fullName, email, password, orgOrPosition, phone, inviteCode }) {
    const { data, error } = await _sb.auth.signUp({ email, password });
    if (error) return { ok: false, error: _friendlyAuthError(error.message) };
    if (!data.user) {
      return { ok: false, error: 'Check your email to confirm your account, then sign in.' };
    }

    const { error: profileErr } = await _sb.from('profiles').insert({
      id: data.user.id,
      role,
      full_name: fullName,
      email,
      position: role === 'admin' ? (orgOrPosition || '') : '',
      company: role === 'client' ? (orgOrPosition || '') : '',
      phone: phone || '',
      invited_by: inviteCode || '',
    });
    if (profileErr) {
      return { ok: false, error: 'Account created, but profile setup failed: ' + profileErr.message };
    }

    if (inviteCode) {
      await _sb.rpc('redeem_invite', { p_code: inviteCode, p_email: email }).catch(() => {});
    }
    return { ok: true };
  },

  async findUserByEmail(email) {
    const { data, error } = await _sb.from('profiles').select('*').eq('email', email).maybeSingle();
    if (error || !data) return null;
    return {
      fullName: data.full_name, email: data.email, role: data.role,
      company: data.company, position: data.position, phone: data.phone,
      createdAt: data.created_at,
    };
  },

  /* --- Admin-only helpers (rely on RLS to actually enforce "admin-only") --- */

  async listUsers() {
    const { data, error } = await _sb.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(u => ({
      fullName: u.full_name, email: u.email, role: u.role,
      company: u.company, position: u.position, createdAt: u.created_at,
    }));
  },

  async listInvites() {
    const { data, error } = await _sb.from('invites').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(i => ({
      code: i.code, role: i.role, note: i.note,
      usedBy: i.used_by, usedAt: i.used_at, createdAt: i.created_at,
    }));
  },

  async createInvite(role, note) {
    const code = (role === 'admin' ? 'ADMIN-' : 'CLIENT-') +
      Math.random().toString(36).slice(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    const { data: userData } = await _sb.auth.getUser();
    const { error } = await _sb.from('invites').insert({
      code, role, note: note || '',
      created_by: userData && userData.user ? userData.user.id : null,
    });
    if (error) throw error;
    return code;
  },

  async revokeInvite(code) {
    const { error } = await _sb.from('invites').delete().eq('code', code).is('used_by', null);
    if (error) throw error;
  },

  async validateInvite(code) {
    const { data, error } = await _sb.rpc('validate_invite', { p_code: code });
    if (error) return { ok: false, error: error.message };
    if (!data || data.length === 0) return { ok: false, error: 'Invite code not recognized.' };
    const invite = data[0];
    if (invite.used_by) return { ok: false, error: 'This invite code has already been used.' };
    return { ok: true, invite: { code: invite.code, role: invite.role, note: invite.note } };
  },
};

window.DB = DB;
