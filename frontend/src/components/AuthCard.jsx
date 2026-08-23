/* The centred card + brand header shared by the login and signup screens. */
import logo from '../assets/logo.png';

export default function AuthCard({ children, foot }) {
  return (
    <div className="stage">
      <div className="authwrap">
        <div className="authcard">
          <div className="auth-brand">
            <img src={logo} alt="BIMDEC logo" />
            <div>
              <div className="name">BIMDEC Document System</div>
              <div className="tag">Client &amp; Admin Portal</div>
            </div>
          </div>

          {children}

          <div className="authfoot">{foot}</div>
        </div>
      </div>
    </div>
  );
}
