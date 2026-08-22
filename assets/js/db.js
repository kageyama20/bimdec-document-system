/*
 * BIMDEC Document System — local "database" layer
 * ---------------------------------------------------------------
 * This is a static, front-end-only prototype. There is no server, so
 * there is no real database — this file simulates one using the
 * browser's localStorage, under the key BIMDEC_DB.
 *
 * The shape of the data mirrors /database/users.schema.json and
 * /database/invites.schema.json in the project root, so this file
 * can be swapped for real API calls later without changing the
 * shape of the records the rest of the app works with.
 *
 * IMPORTANT — this is NOT secure and is NOT production-ready:
 *   - Passwords are only lightly obscured (see hashPassword below),
 *     not cryptographically hashed with a salt.
 *   - All "database" contents live in the visitor's own browser and
 *     are trivially readable/editable via devtools.
 *   - There is no server session, so nothing here should be trusted
 *     to actually restrict access to real documents or data.
 * Before going live, replace this file with real API calls to a
 * server that owns the user table, hashes passwords (e.g. bcrypt/
 * argon2), issues invitations, and checks permissions server-side.
 * ---------------------------------------------------------------
 */

const BIMDEC_DB_KEY = 'BIMDEC_DB';
const BIMDEC_SESSION_KEY = 'BIMDEC_SESSION';

/* One bootstrap admin account so *someone* can log in and start
   issuing invitations. Change this password after first login —
   there is no "forgot password" flow in this prototype. */
const BOOTSTRAP_ADMIN = {
  id: 'u_admin_bootstrap',
  role: 'admin',
  fullName: 'BIMDEC Administrator',
  email: 'admin@bimphilippines.org',
  password: 'BIMDEC-Admin-2026',
  position: 'System Administrator',
  phone: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  mustChangePassword: true
};

function seedDB(){
  return {
    users: [ BOOTSTRAP_ADMIN ],
    invites: [
      {
        code: 'ADMIN-BOOTSTRAP-0001',
        role: 'admin',
        note: 'Example admin invite — revoke or use this, then generate fresh codes from the Admin Portal.',
        createdAt: '2026-01-01T00:00:00.000Z',
        usedBy: null,
        usedAt: null
      }
    ]
  };
}

function loadDB(){
  try{
    const raw = localStorage.getItem(BIMDEC_DB_KEY);
    if(!raw) throw new Error('no db yet');
    const db = JSON.parse(raw);
    if(!db.users || !db.invites) throw new Error('malformed db');
    return db;
  }catch(e){
    const fresh = seedDB();
    localStorage.setItem(BIMDEC_DB_KEY, JSON.stringify(fresh));
    return fresh;
  }
}

function saveDB(db){
  localStorage.setItem(BIMDEC_DB_KEY, JSON.stringify(db));
}

/* Very light obfuscation only — NOT real password hashing.
   See file header. Kept deterministic so login can re-derive it. */
function hashPassword(plain){
  let h = 0;
  const s = 'bimdec::' + plain;
  for(let i=0;i<s.length;i++){ h = ((h<<5)-h) + s.charCodeAt(i); h |= 0; }
  return 'h' + Math.abs(h).toString(36) + '_' + plain.length;
}

const DB = {
  init(){ loadDB(); },

  findUserByEmail(email){
    const db = loadDB();
    const e = String(email||'').trim().toLowerCase();
    return db.users.find(u => u.email.toLowerCase() === e) || null;
  },

  login(email, password, expectedRole){
    const user = this.findUserByEmail(email);
    if(!user) return { ok:false, error:'No account found for that email.' };
    if(hashPassword(password) !== hashPassword(user.password)){
      return { ok:false, error:'Incorrect password.' };
    }
    if(expectedRole && user.role !== expectedRole){
      return { ok:false, error:`This account is registered as ${user.role === 'admin' ? 'an Admin' : 'a Client'}. Use the ${user.role === 'admin' ? 'Admin' : 'Client'} tab to sign in.` };
    }
    const session = { userId:user.id, role:user.role, fullName:user.fullName, email:user.email, loginAt:new Date().toISOString() };
    sessionStorage.setItem(BIMDEC_SESSION_KEY, JSON.stringify(session));
    return { ok:true, user, session };
  },

  logout(){
    sessionStorage.removeItem(BIMDEC_SESSION_KEY);
  },

  getSession(){
    try{ return JSON.parse(sessionStorage.getItem(BIMDEC_SESSION_KEY) || 'null'); }
    catch(e){ return null; }
  },

  /* Guard for portal pages: redirect to login if not authenticated,
     or if authenticated with the wrong role for this page. */
  requireSession(role){
    const s = this.getSession();
    if(!s || (role && s.role !== role)){
      window.location.href = '../login.html';
      return null;
    }
    return s;
  },

  validateInvite(code){
    const db = loadDB();
    const c = String(code||'').trim().toUpperCase();
    const invite = db.invites.find(i => i.code.toUpperCase() === c);
    if(!invite) return { ok:false, error:'Invite code not recognized.' };
    if(invite.usedBy) return { ok:false, error:'This invite code has already been used.' };
    return { ok:true, invite };
  },

  /* invite is optional right now — signup.html has invite-gating temporarily
     disabled, so callers pass `role` directly instead. Still honors a real
     invite object if one is passed in, so this stays compatible once
     invite-gating is turned back on. */
  createUser({ invite, role, fullName, email, password, orgOrPosition, phone }){
    const db = loadDB();
    const e = String(email||'').trim().toLowerCase();
    if(db.users.some(u => u.email.toLowerCase() === e)){
      return { ok:false, error:'An account with that email already exists.' };
    }
    const finalRole = invite ? invite.role : role;
    const user = {
      id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      role: finalRole,
      fullName: String(fullName||'').trim(),
      email: e,
      password: password, // prototype only — see file header
      position: finalRole === 'admin' ? (orgOrPosition||'') : '',
      company: finalRole === 'client' ? (orgOrPosition||'') : '',
      phone: phone||'',
      createdAt: new Date().toISOString(),
      mustChangePassword: false,
      invitedBy: invite ? invite.code : '(no invite — invite-gating disabled)'
    };
    db.users.push(user);
    if(invite){
      const inv = db.invites.find(i => i.code === invite.code);
      if(inv){ inv.usedBy = e; inv.usedAt = new Date().toISOString(); }
    }
    saveDB(db);
    return { ok:true, user };
  },

  /* Troubleshooting helper: wipes the simulated DB + session for this
     browser/domain and reseeds from BOOTSTRAP_ADMIN. Useful if a login
     is stuck because this browser's localStorage has stale/edited data
     that no longer matches the seed (e.g. the bootstrap admin was
     edited or removed via the Admin Portal). */
  resetToBootstrap(){
    localStorage.removeItem(BIMDEC_DB_KEY);
    sessionStorage.removeItem(BIMDEC_SESSION_KEY);
    loadDB();
  },

  /* --- Admin-only helpers --- */
  listUsers(){ return loadDB().users; },
  listInvites(){ return loadDB().invites; },

  createInvite(role, note){
    const db = loadDB();
    const code = (role === 'admin' ? 'ADMIN-' : 'CLIENT-') +
      Math.random().toString(36).slice(2,6).toUpperCase() + '-' +
      Math.random().toString(36).slice(2,6).toUpperCase();
    db.invites.unshift({ code, role, note: note||'', createdAt: new Date().toISOString(), usedBy:null, usedAt:null });
    saveDB(db);
    return code;
  },

  revokeInvite(code){
    const db = loadDB();
    db.invites = db.invites.filter(i => i.code !== code);
    saveDB(db);
  }
};

DB.init();
