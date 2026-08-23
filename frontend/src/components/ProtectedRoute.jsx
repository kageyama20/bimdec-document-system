/*
 * Route guard — the router-friendly replacement for the old
 * `await DB.requireSession('admin')` block that every portal page repeated.
 *
 * Rendering a splash while the session resolves matters: without it the guard
 * would see `user === null` on the first paint and bounce a signed-in admin
 * straight back to the login screen.
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useSession } from '../session/SessionProvider';

function Splash() {
  return (
    <div className="stage">
      <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'var(--muted)' }}>
        Checking your session…
      </div>
    </div>
  );
}

export default function ProtectedRoute({ role }) {
  const { loading, user } = useSession();

  if (loading) return <Splash />;
  if (!user) return <Navigate to={role ? `/login?role=${role}` : '/login'} replace />;
  if (role && user.role !== role) return <Navigate to={`/login?role=${role}`} replace />;

  return <Outlet />;
}
