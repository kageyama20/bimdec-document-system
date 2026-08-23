import { Link } from 'react-router-dom';
import usePageTitle from '../usePageTitle';
import logo from '../assets/logo.png';

export default function Welcome() {
  usePageTitle('BIMDEC — Document System');

  return (
    <div className="stage">
      <div className="hero">
        <img className="hero-logo" src={logo} alt="BIMDEC logo" />
        <div className="hero-eyebrow">BIM Design &amp; Engineering Consultants</div>
        <h1>Welcome to the BIMDEC Document System</h1>
        <p className="lead">
          Sign in to prepare proposals, invoices, and acknowledgement receipts, or to
          review the documents issued to you. (Invite-code requirement is temporarily
          switched off.)
        </p>

        <div className="hero-actions">
          <Link className="hero-card is-client" to="/login?role=client">
            <span className="tag">Client Portal</span>
            <h3>I'm a Client</h3>
            <p>Sign in to view proposals, invoices, and receipts issued to your account.</p>
          </Link>
          <Link className="hero-card is-admin" to="/login?role=admin">
            <span className="tag">Admin Portal</span>
            <h3>I'm from BIMDEC</h3>
            <p>Sign in to prepare and manage proposals, invoices, and receipts.</p>
          </Link>
        </div>

        <div className="hero-foot">
          New here? <Link to="/signup">Create your account</Link> — no invitation code needed for now
        </div>
      </div>
    </div>
  );
}
