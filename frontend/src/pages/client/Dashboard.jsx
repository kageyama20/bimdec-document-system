import { useEffect, useState } from 'react';
import PortalShell from '../../components/PortalShell';
import DB from '../../lib/db';
import { useSession } from '../../session/SessionProvider';
import usePageTitle from '../../usePageTitle';

export default function ClientDashboard() {
  usePageTitle('Client Portal — BIMDEC Document System');

  const { user } = useSession();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let alive = true;
    DB.findUserByEmail(user.email).then(p => { if (alive) setProfile(p || {}); });
    return () => { alive = false; };
  }, [user.email]);

  const rows = [
    ['Full name', profile?.fullName],
    ['Email', profile?.email],
    ['Company', profile?.company],
    ['Phone', profile?.phone],
  ];

  return (
    <PortalShell tag="Client Portal">
      <div className="welcome-banner">
        <div className="txt">
          <h1>Welcome, {user.fullName.split(' ')[0]}.</h1>
          <p>This is where proposals, invoices, and receipts issued to you by BIMDEC will appear.</p>
        </div>
      </div>

      <div className="section">
        <div className="panel-title">Your documents</div>
        <div className="empty">
          <div className="icon">🗂</div>
          No documents have been issued to your account yet.<br />
          Your BIMDEC representative will notify you once a proposal, invoice, or receipt is ready.
        </div>
      </div>

      <div className="section">
        <div className="panel-title">Your profile</div>
        <table className="table">
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td style={{ width: 180, color: 'var(--muted)', fontWeight: 600 }}>{label}</td>
                <td>{value || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PortalShell>
  );
}
