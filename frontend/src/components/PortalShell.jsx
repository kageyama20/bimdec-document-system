/*
 * The app bar + admin section nav that every portal page repeated verbatim.
 * `nav` is the active admin tab, or null for the client portal (which has no
 * section nav).
 */
import { Link, useNavigate } from 'react-router-dom';
import DB from '../lib/db';
import { useSession } from '../session/SessionProvider';
import logo from '../assets/logo.png';

const ADMIN_TABS = [
  { key: 'dashboard', to: '/admin', label: 'Dashboard' },
  { key: 'documents', to: '/admin/documents', label: 'Documents' },
  { key: 'users', to: '/admin/users', label: 'Users & Invitations' },
  { key: 'email', to: '/admin/email', label: 'Email' },
];

export default function PortalShell({ tag, nav = null, children }) {
  const { user } = useSession();
  const navigate = useNavigate();

  const doLogout = async () => {
    await DB.logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div className="appbar">
        <div className="appbar-inner">
          <img className="mark" src={logo} alt="BIMDEC logo" />
          <div className="brandtext">
            <div className="name">BIMDEC Document System</div>
            <div className="tag">{tag}</div>
          </div>
          <div className="spacer"></div>
          <div className="who">Signed in as <b>{user ? user.fullName : '—'}</b></div>
          <button className="logout" onClick={doLogout}>Log out</button>
        </div>
      </div>

      {nav && (
        <div className="adminnav">
          <div className="adminnav-inner">
            {ADMIN_TABS.map(t => (
              <Link key={t.key} to={t.to} className={t.key === nav ? 'active' : undefined}>
                {t.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="shell">{children}</div>
    </>
  );
}
