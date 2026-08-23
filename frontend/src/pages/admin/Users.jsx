import { useCallback, useEffect, useState } from 'react';
import PortalShell from '../../components/PortalShell';
import DB from '../../lib/db';
import EmailClient from '../../lib/emailClient';
import usePageTitle from '../../usePageTitle';

function copyCode(code) {
  if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
}

export default function AdminUsers() {
  usePageTitle('Users & Invitations — BIMDEC Document System');

  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const [role, setRole] = useState('client');
  const [note, setNote] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ kind: '', text: '' });

  const load = useCallback(async () => {
    const [u, i] = await Promise.all([DB.listUsers(), DB.listInvites()]);
    setUsers(u);
    setInvites(i);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createInvite = async (evt) => {
    evt.preventDefault();
    let code;
    try {
      code = await DB.createInvite(role, note.trim());
    } catch (err) {
      setStatus({ kind: 'bad', text: 'Failed to generate invite: ' + err.message });
      return;
    }
    setNote('');
    await load();
    copyCode(code);

    const to = email.trim();
    if (!to) {
      setStatus({ kind: '', text: '' });
      return;
    }

    if (!EmailClient.isConfigured()) {
      setStatus({
        kind: 'bad',
        text: "Code generated, but the email service isn't connected yet — connect it on the Email page to send invites directly.",
      });
      setEmail('');
      return;
    }

    setStatus({ kind: 'pending', text: 'Emailing invite to ' + to + '…' });
    try {
      await EmailClient.send({
        to,
        subject: "You're invited to the BIMDEC Document System",
        html: `<p>You've been invited to join the BIMDEC Document System as ${role === 'admin' ? 'an Admin' : 'a Client'}.</p>
                 <p>Your invite code:</p>
                 <p style="font-family:monospace; font-size:16px; background:#EEF1F6; padding:8px 12px; display:inline-block; border-radius:6px;">${code}</p>
                 <p>Go to the signup page and enter this code to create your account.</p>`,
      });
      setStatus({ kind: 'ok', text: 'Invite emailed to ' + to + '.' });
    } catch (err) {
      setStatus({ kind: 'bad', text: 'Code generated, but the email failed to send: ' + err.message });
    }
    setEmail('');
  };

  const removeInvite = async (code) => {
    if (!confirm('Revoke invite ' + code + '? This cannot be undone.')) return;
    try {
      await DB.revokeInvite(code);
    } catch (err) {
      alert('Failed to revoke invite: ' + err.message);
      return;
    }
    load();
  };

  const openInvites = invites.filter(i => !i.usedBy).length;

  return (
    <PortalShell tag="Admin Portal" nav="users">
      <div className="welcome-banner">
        <div className="txt">
          <h1>Users &amp; Invitations</h1>
          <p>Invite new admins or clients, track open invite codes, and see everyone currently registered.</p>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <h3>Registered users</h3>
          <div className="big">{loaded ? users.length : '—'}</div>
          <p>Admin and client accounts currently registered in this system.</p>
        </div>
        <div className="card">
          <h3>Open invitations</h3>
          <div className="big">{loaded ? openInvites : '—'}</div>
          <p>Invite codes generated but not yet used to create an account.</p>
        </div>
      </div>

      <div className="section">
        <div className="panel-title">Invite a new user</div>
        <p className="sub" style={{ color: 'var(--muted)', fontSize: 13, marginTop: -8 }}>
          Signup is invitation-only — generate a code below and share it directly with the person you're inviting.
        </p>
        <form className="inline-form" onSubmit={createInvite}>
          <div className="field">
            <label htmlFor="inviteRole">Role</label>
            <select id="inviteRole" value={role} onChange={e => setRole(e.target.value)}>
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="inviteNote">Note (optional)</label>
            <input type="text" id="inviteNote" placeholder="e.g. For Future Objects, Inc."
              value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="inviteEmail">Email invite (optional)</label>
            <input type="email" id="inviteEmail" placeholder="send the code directly by email"
              value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <button className="btn-small" type="submit">Generate invite code</button>
        </form>
        <div className={`send-status ${status.kind}`}>{status.text}</div>
      </div>

      <div className="section">
        <div className="panel-title">Invitations</div>
        {invites.length === 0 ? (
          <div className="empty"><div className="icon">✉</div>No invitations yet — generate one above.</div>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Role</th><th>Note</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {invites.map(i => (
                <tr key={i.code}>
                  <td>
                    <span className="copy-code" title="Click to copy" onClick={() => copyCode(i.code)}>{i.code}</span>
                  </td>
                  <td><span className={`pill role-${i.role}`}>{i.role}</span></td>
                  <td>{i.note || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td>
                    {i.usedBy
                      ? <span className="pill used">Used · {i.usedBy}</span>
                      : <span className="pill unused">Unused</span>}
                  </td>
                  <td>
                    {!i.usedBy && (
                      <button className="btn-small" style={{ background: 'var(--danger)' }} onClick={() => removeInvite(i.code)}>
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <div className="panel-title">Registered users</div>
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Company / Position</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.fullName}</td>
                <td>{u.email}</td>
                <td><span className={`pill role-${u.role}`}>{u.role}</span></td>
                <td>{(u.company || u.position) || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                <td>{new Date(u.createdAt).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
