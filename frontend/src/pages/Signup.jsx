import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import Msg from '../components/Msg';
import DB from '../lib/db';
import usePageTitle from '../usePageTitle';

export default function Signup() {
  usePageTitle('Create account — BIMDEC Document System');

  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);

  return (
    <AuthCard
      foot={
        <>
          Already have an account? <Link to="/login">Sign in</Link><br />
          <Link to="/">&larr; Back to welcome</Link>
        </>
      }
    >
      {invite
        ? <ProfileStep invite={invite} onDone={role => navigate(`/login?role=${role}&created=1`, { replace: true })} />
        : <CodeStep onVerified={setInvite} />}
    </AuthCard>
  );
}

function CodeStep({ onVerified }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleCodeCheck = async (evt) => {
    evt.preventDefault();
    setError('');
    setBusy(true);
    const result = await DB.validateInvite(code.trim());
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onVerified(result.invite);
  };

  return (
    <>
      <div className="invite-badge">Invitation required</div>
      <h2>Enter your invite code</h2>
      <p className="sub">Ask your BIMDEC administrator for an invite code, then enter it below to continue.</p>

      <Msg text={error} />

      <form onSubmit={handleCodeCheck}>
        <div className="field">
          <label htmlFor="inviteCode">Invite code</label>
          <input
            type="text" id="inviteCode" required placeholder="e.g. ADMIN-AB12-CD34"
            autoComplete="off" style={{ textTransform: 'uppercase' }}
            value={code} onChange={e => setCode(e.target.value)}
          />
        </div>
        <button className="btn-primary" type="submit" disabled={busy}>Continue</button>
      </form>
    </>
  );
}

function ProfileStep({ invite, onDone }) {
  const isAdmin = invite.role === 'admin';

  const [form, setForm] = useState({
    fullName: '', orgOrPosition: '', phone: '', email: '', password: '', confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSignup = async (evt) => {
    evt.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    const result = await DB.createUser({
      invite,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      orgOrPosition: form.orgOrPosition.trim(),
      phone: form.phone.trim(),
    });
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }

    // Supabase auto-signs-in the new account on signup — sign back out so they
    // land on a clean login screen, matching the rest of the app's flow.
    await DB.logout();
    setBusy(false);
    onDone(invite.role);
  };

  return (
    <>
      <div className="invite-badge">Invitation verified</div>
      <h2>{isAdmin ? 'Create your Admin account' : 'Create your Client account'}</h2>
      <p className="sub">
        {isAdmin
          ? 'This account will be able to prepare and manage documents.'
          : 'This account will let you view documents issued to you.'}
      </p>

      <Msg text={error} />

      <form onSubmit={handleSignup}>
        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input type="text" id="fullName" required placeholder="e.g. Juan Dela Cruz"
            value={form.fullName} onChange={set('fullName')} />
        </div>
        <div className="field">
          <label htmlFor="orgOrPosition">{isAdmin ? 'Position / title' : 'Company / organization'}</label>
          <input type="text" id="orgOrPosition" placeholder={isAdmin ? 'e.g. System Administrator' : 'e.g. Future Objects, Inc.'}
            value={form.orgOrPosition} onChange={set('orgOrPosition')} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input type="text" id="phone" placeholder="e.g. 09xx-xxx-xxxx"
            value={form.phone} onChange={set('phone')} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input type="email" id="email" required autoComplete="username" placeholder="you@example.com"
            value={form.email} onChange={set('email')} />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" required minLength={8} autoComplete="new-password"
              placeholder="At least 8 characters" value={form.password} onChange={set('password')} />
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input type="password" id="confirmPassword" required minLength={8} autoComplete="new-password"
              placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')} />
          </div>
        </div>
        <button className="btn-primary" type="submit" disabled={busy}>Create account</button>
      </form>
    </>
  );
}
