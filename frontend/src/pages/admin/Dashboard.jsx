import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PortalShell from '../../components/PortalShell';
import DB from '../../lib/db';
import EmailClient from '../../lib/emailClient';
import { useSession } from '../../session/SessionProvider';
import usePageTitle from '../../usePageTitle';

export default function AdminDashboard() {
  usePageTitle('Admin Portal — BIMDEC Document System');

  const { user } = useSession();
  const [stats, setStats] = useState({ users: '—', invites: '—' });
  const connected = EmailClient.isConfigured();

  useEffect(() => {
    let alive = true;
    (async () => {
      const users = await DB.listUsers();
      const invites = await DB.listInvites();
      if (alive) setStats({ users: users.length, invites: invites.filter(i => !i.usedBy).length });
    })();
    return () => { alive = false; };
  }, []);

  return (
    <PortalShell tag="Admin Portal" nav="dashboard">
      <div className="welcome-banner">
        <div className="txt">
          <h1>Welcome back, {user.fullName.split(' ')[0]}.</h1>
          <p>Prepare proposals, invoices, and acknowledgement receipts, email them out, and manage who can access the system.</p>
        </div>
      </div>

      <div className="cards">
        <div className="card">
          <h3>Document Generator</h3>
          <div className="big">3</div>
          <p>Proposal, billing invoice, and acknowledgement receipt templates with your letterhead and payment details pre-filled. Send any of them straight to a client's email from the preview.</p>
          <Link className="linkbtn" to="/admin/documents">Open Documents &rarr;</Link>
        </div>
        <div className="card">
          <h3>Emailing System</h3>
          <div className="big" style={{ color: connected ? 'var(--ok)' : 'var(--muted)' }}>
            {connected ? 'On' : 'Off'}
          </div>
          <p>Send mail through your own SMTP account and read replies in real time.</p>
          <Link className="linkbtn amber" to="/admin/email">Open Email &rarr;</Link>
        </div>
        <div className="card">
          <h3>Registered users</h3>
          <div className="big">{stats.users}</div>
          <p>Admin and client accounts currently registered in this system.</p>
          <Link className="linkbtn" to="/admin/users">Manage users &rarr;</Link>
        </div>
        <div className="card">
          <h3>Open invitations</h3>
          <div className="big">{stats.invites}</div>
          <p>Invite codes generated but not yet used to create an account.</p>
          <Link className="linkbtn" to="/admin/users">Invite a user &rarr;</Link>
        </div>
      </div>
    </PortalShell>
  );
}
