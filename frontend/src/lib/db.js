/*
 * BIMDEC Document System — Supabase-backed data layer
 * ---------------------------------------------------------------
 * Accounts live in Supabase Auth; invites and profiles live in real Postgres
 * tables (see /database/supabase-schema.sql), so both work identically across
 * every browser and device.
 *
 * Every method that touches the network is async — callers must await it.
 *
 * Note: the old requireSession() page guard lived here and redirected by
 * inspecting window.location.pathname for an /admin/ or /client/ segment.
 * That heuristic does not survive client-side routing; the equivalent is now
 * <ProtectedRoute role="..."> in src/components/ProtectedRoute.jsx, fed by
 * src/session/SessionProvider.jsx.
 * ---------------------------------------------------------------
 */
import { supabase as sb } from './supabaseClient';

function profileToUser(p) {
  if (!p) return null;
  return {
    id: p.id,
    role: p.role,
    fullName: p.full_name,
    email: p.email,
    position: p.position || '',
    company: p.company || '',
    phone: p.phone || '',
    createdAt: p.created_at,
    invitedBy: p.invited_by || ''
  };
}

function inviteRowToInvite(i) {
  return {
    code: i.code,
    role: i.role,
    note: i.note || '',
    createdAt: i.created_at,
    usedBy: i.used_by || null,
    usedAt: i.used_at || null
  };
}

async function fetchProfile(userId) {
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return profileToUser(data);
}

const DB = {
  async login(email, password, expectedRole) {
    const { data, error } = await sb.auth.signInWithPassword({ email: String(email || '').trim(), password });
    if (error) {
      return { ok: false, error: error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : error.message };
    }
    let profile;
    try {
      profile = await fetchProfile(data.user.id);
    } catch (e) {
      profile = null;
    }
    if (!profile) {
      await sb.auth.signOut();
      return { ok: false, error: 'No profile found for this account. Contact an administrator.' };
    }
    if (expectedRole && profile.role !== expectedRole) {
      await sb.auth.signOut();
      return { ok: false, error: `This account is registered as ${profile.role === 'admin' ? 'an Admin' : 'a Client'}. Use the ${profile.role === 'admin' ? 'Admin' : 'Client'} tab to sign in.` };
    }
    return { ok: true, user: profile, session: profile };
  },

  async logout() {
    await sb.auth.signOut();
  },

  /* Returns the logged-in user's profile (role, fullName, email, ...),
     or null if nobody is signed in. */
  async getSession() {
    const { data } = await sb.auth.getSession();
    if (!data || !data.session) return null;
    try {
      return await fetchProfile(data.session.user.id);
    } catch (e) {
      return null;
    }
  },

  async findUserByEmail(email) {
    const e = String(email || '').trim().toLowerCase();
    const { data, error } = await sb.from('profiles').select('*').ilike('email', e).maybeSingle();
    if (error) return null;
    return profileToUser(data);
  },

  async validateInvite(code) {
    const c = String(code || '').trim().toUpperCase();
    const { data, error } = await sb.rpc('validate_invite', { p_code: c });
    if (error) return { ok: false, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { ok: false, error: 'Invite code not recognized.' };
    if (row.used_by) return { ok: false, error: 'This invite code has already been used.' };
    return { ok: true, invite: { code: row.code, role: row.role, note: row.note || '' } };
  },

  /* invite is the verified { code, role, note } object from validateInvite. */
  async createUser({ invite, role, fullName, email, password, orgOrPosition, phone }) {
    const e = String(email || '').trim().toLowerCase();
    const finalRole = invite ? invite.role : role;

    const { data, error } = await sb.auth.signUp({ email: e, password });
    if (error) return { ok: false, error: error.message };
    const userId = data.user && data.user.id;
    if (!userId) return { ok: false, error: 'Account created, but could not confirm the new user. Try signing in.' };

    const { error: profileErr } = await sb.from('profiles').insert({
      id: userId,
      role: finalRole,
      full_name: String(fullName || '').trim(),
      email: e,
      position: finalRole === 'admin' ? (orgOrPosition || '') : '',
      company: finalRole === 'client' ? (orgOrPosition || '') : '',
      phone: phone || '',
      invited_by: invite ? invite.code : ''
    });
    if (profileErr) return { ok: false, error: profileErr.message };

    if (invite) {
      await sb.rpc('redeem_invite', { p_code: invite.code, p_email: e });
    }

    return { ok: true, user: { role: finalRole, fullName, email: e } };
  },

  /* --- Admin-only helpers (RLS restricts these to admin accounts) --- */

  async listUsers() {
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data.map(profileToUser);
  },

  async listInvites() {
    const { data, error } = await sb.from('invites').select('*').order('created_at', { ascending: false });
    if (error) return [];
    return data.map(inviteRowToInvite);
  },

  async createInvite(role, note) {
    const code = (role === 'admin' ? 'ADMIN-' : 'CLIENT-') +
      Math.random().toString(36).slice(2, 6).toUpperCase() + '-' +
      Math.random().toString(36).slice(2, 6).toUpperCase();
    const { data: sessionData } = await sb.auth.getSession();
    const createdBy = sessionData && sessionData.session ? sessionData.session.user.id : null;
    const { error } = await sb.from('invites').insert({ code, role, note: note || '', created_by: createdBy });
    if (error) throw error;
    return code;
  },

  async revokeInvite(code) {
    const { error } = await sb.from('invites').delete().eq('code', code);
    if (error) throw error;
  }
};

export default DB;
