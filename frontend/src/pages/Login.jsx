import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import Msg from '../components/Msg';
import DB from '../lib/db';
import { useSession } from '../session/SessionProvider';
import usePageTitle from '../usePageTitle';

const SUBTEXT = {
  admin: 'Sign in with your BIMDEC staff account to prepare documents.',
  client: 'Sign in to view the documents issued to you.',
};

export default function Login() {
  usePageTitle('Sign in — BIMDEC Document System');

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refresh } = useSession();

  const [role, setRole] = useState(params.get('role') === 'admin' ? 'admin' : 'client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const pickRole = (next) => {
    setRole(next);
    setError('');
  };

  const handleLogin = async (evt) => {
    evt.preventDefault();
    setError('');
    setBusy(true);
    const result = await DB.login(email, password, role);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Pull the new session into the provider before navigating, so the guard
    // on the destination route doesn't bounce us back here.
    await refresh();
    navigate(role === 'admin' ? '/admin' : '/client', { replace: true });
  };

  return (
    <AuthCard
      foot={
        <>
          Have an invite code? <Link to="/signup">Create an account</Link><br />
          <Link to="/">&larr; Back to welcome</Link>
        </>
      }
    >
      <h2>Welcome back</h2>
      <p className="sub">{SUBTEXT[role]}</p>

      <div className="roletabs">
        <button type="button" className={role === 'client' ? 'active' : undefined} onClick={() => pickRole('client')}>Client</button>
        <button type="button" className={role === 'admin' ? 'active' : undefined} onClick={() => pickRole('admin')}>Admin</button>
      </div>

      <Msg text={params.get('created') ? 'Account created — sign in below.' : ''} kind="ok" />
      <Msg text={error} kind="error" />

      <form onSubmit={handleLogin}>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            type="email" id="email" required autoComplete="username" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            type="password" id="password" required autoComplete="current-password" placeholder="••••••••"
            value={password} onChange={e => setPassword(e.target.value)}
          />
        </div>
        <button className="btn-primary" type="submit" disabled={busy}>Sign in</button>
      </form>
    </AuthCard>
  );
}
