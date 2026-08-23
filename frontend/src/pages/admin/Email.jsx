import { useCallback, useEffect, useRef, useState } from 'react';
import PortalShell from '../../components/PortalShell';
import EmailClient from '../../lib/emailClient';
import usePageTitle from '../../usePageTitle';

function timeAgo(iso) {
  return new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminEmail() {
  usePageTitle('Email — BIMDEC Document System');

  const saved = EmailClient.getSavedConfig();
  const defaultApiBase = EmailClient.getDefaultApiBase();

  const [cfgApiBase, setCfgApiBase] = useState(saved.apiBase || '');
  const [cfgApiKey, setCfgApiKey] = useState(saved.apiKey || '');
  const [settingsStatus, setSettingsStatus] = useState({ kind: '', text: '' });

  const [conn, setConn] = useState({ kind: 'pending', text: 'Not connected' });
  const [inbox, setInbox] = useState({ state: 'idle', messages: [], error: '' });
  const [activeUid, setActiveUid] = useState(null);
  const [message, setMessage] = useState(null);

  const [compose, setCompose] = useState({ to: '', subject: '', body: '' });
  const [composeStatus, setComposeStatus] = useState({ kind: '', text: '' });
  const bodyRef = useRef(null);

  const refreshInbox = useCallback(async () => {
    if (!EmailClient.isConfigured()) return;
    try {
      const data = await EmailClient.listInbox({ limit: 50 });
      setInbox({ state: 'loaded', messages: data.messages || [], error: '' });
    } catch (err) {
      setInbox({ state: 'error', messages: [], error: err.message });
    }
  }, []);

  const connectAndLoad = useCallback(async () => {
    if (!EmailClient.isConfigured()) {
      setConn({ kind: 'pending', text: 'Not connected' });
      return;
    }
    try {
      await EmailClient.checkHealth();
      setConn({ kind: 'ok', text: 'Connected' });
      setSettingsStatus({ kind: 'ok', text: 'Connected to backend.' });
    } catch (err) {
      setConn({ kind: 'bad', text: 'Backend unreachable' });
      setSettingsStatus({ kind: 'bad', text: 'Could not reach backend: ' + err.message });
    }
    refreshInbox();
  }, [refreshInbox]);

  /* Initial connect. */
  useEffect(() => { connectAndLoad(); }, [connectAndLoad]);

  /* Keep polling while this page is open. Each call is a real HTTP request,
     which is also what wakes a sleeping free-tier backend back up. */
  useEffect(() => {
    const timer = setInterval(refreshInbox, 20000);
    return () => clearInterval(timer);
  }, [refreshInbox]);

  /* Live inbox over Socket.IO. The old page opened this socket and never
     closed it; the cleanup below is what makes that safe under a router. */
  useEffect(() => {
    const socket = EmailClient.connectLive({
      onNewMail(msg) {
        setInbox(prev => ({ state: 'loaded', messages: [msg, ...prev.messages], error: '' }));
      },
      onConnectionState(state) {
        if (state.status === 'ok') setConn({ kind: 'ok', text: 'Live — ' + state.detail });
        else if (state.status === 'bad') setConn({ kind: 'bad', text: state.detail });
        else setConn({ kind: 'pending', text: state.detail });
      },
    });
    return () => { if (socket) socket.disconnect(); };
  }, [cfgApiBase]);

  const saveSettings = async (evt) => {
    evt.preventDefault();
    EmailClient.setConfig({ apiBase: cfgApiBase.trim() || defaultApiBase, apiKey: cfgApiKey.trim() });
    setSettingsStatus({ kind: 'pending', text: 'Saved. Checking connection…' });
    await connectAndLoad();
  };

  const openMessage = async (uid) => {
    setActiveUid(uid);
    setMessage({ state: 'loading' });
    try {
      const data = await EmailClient.getMessage(uid);
      setMessage({ state: 'loaded', m: data.message });
      if (data.message.unread) EmailClient.markRead(uid).catch(() => {});
    } catch (err) {
      setMessage({ state: 'error', error: err.message });
    }
  };

  const replyTo = (m) => {
    setCompose(c => ({
      ...c,
      to: String(m.from || '').replace(/.*<|>.*/g, ''),
      subject: 'Re: ' + m.subject,
    }));
    if (bodyRef.current) bodyRef.current.focus();
  };

  const sendCompose = async (evt) => {
    evt.preventDefault();
    setComposeStatus({ kind: 'pending', text: 'Sending…' });
    try {
      await EmailClient.send({
        to: compose.to.trim(),
        subject: compose.subject.trim(),
        html: compose.body.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])).replace(/\n/g, '<br>'),
        text: compose.body,
      });
      setComposeStatus({ kind: 'ok', text: 'Sent to ' + compose.to.trim() + '.' });
      setCompose(c => ({ ...c, body: '' }));
    } catch (err) {
      setComposeStatus({ kind: 'bad', text: 'Failed: ' + err.message });
    }
  };

  return (
    <PortalShell tag="Admin Portal" nav="email">
      <div className="welcome-banner">
        <div className="txt">
          <h1>Emailing System</h1>
          <p>Send mail through your own SMTP account and read replies as they arrive — powered by the backend service connected below.</p>
        </div>
        <div className="spacer"></div>
        <span className={`conn-badge ${conn.kind}`}><span className="dot"></span><span>{conn.text}</span></span>
      </div>

      <div className="section">
        <div className="panel-title">Connection settings</div>
        <p className="sub" style={{ color: 'var(--muted)', fontSize: 13, marginTop: -8 }}>
          The backend URL is already set for this deployment — you only need to paste the
          API key. Override the URL here to point at a different backend; both are saved
          only in this browser. See <code>/backend/README.md</code> for how the service is deployed.
        </p>
        <form className="inline-form" onSubmit={saveSettings}>
          <div className="field">
            <label htmlFor="cfgApiBase">Backend URL</label>
            <input type="text" id="cfgApiBase" placeholder={defaultApiBase || 'https://bimdec-email.onrender.com'}
              value={cfgApiBase} onChange={e => setCfgApiBase(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="cfgApiKey">API key</label>
            <input type="text" id="cfgApiKey" placeholder="paste the API_KEY you set on the backend"
              value={cfgApiKey} onChange={e => setCfgApiKey(e.target.value)} />
          </div>
          <button className="btn-small" type="submit">Save &amp; connect</button>
        </form>
        <div className={`send-status ${settingsStatus.kind}`}>{settingsStatus.text}</div>
      </div>

      <div className="email-layout">
        <div>
          <div className="section">
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Inbox</span>
              <button className="btn-small" style={{ padding: '6px 10px', fontSize: 11 }} onClick={refreshInbox}>Refresh</button>
            </div>
            <ul className="inbox-list">
              {inbox.state === 'error' && (
                <div className="empty"><div className="icon">⚠</div>{inbox.error}</div>
              )}
              {inbox.state !== 'error' && inbox.messages.length === 0 && (
                <div className="empty"><div className="icon">✉</div>
                  {EmailClient.isConfigured()
                    ? 'No messages yet.'
                    : 'Enter the API key above to load your inbox.'}
                </div>
              )}
              {inbox.messages.map(m => (
                <li
                  key={m.uid}
                  className={`inbox-item${m.unread ? ' unread' : ''}${activeUid === String(m.uid) ? ' active' : ''}`}
                  onClick={() => openMessage(String(m.uid))}
                >
                  <span className="when">{timeAgo(m.date)}</span>
                  <div className="from">{m.from}</div>
                  <div className="subj">{m.subject}</div>
                  <div className="snip">{m.snippet}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          {message && (
            <div className="section">
              <div className="panel-title">Message</div>
              <div className="msg-view">
                {message.state === 'loading' && <p style={{ color: 'var(--muted)' }}>Loading…</p>}
                {message.state === 'error' && <p style={{ color: 'var(--danger)' }}>{message.error}</p>}
                {message.state === 'loaded' && (
                  <>
                    <div className="hdr">
                      <p className="subj">{message.m.subject}</p>
                      <div className="meta">From {message.m.from} &nbsp;·&nbsp; {timeAgo(message.m.date)}</div>
                    </div>
                    {/* Same as the original page: HTML mail is rendered as-is.
                        This trusts whatever arrives in the mailbox — see the
                        note in backend/README.md before widening who can send. */}
                    {message.m.html
                      ? <div className="body" dangerouslySetInnerHTML={{ __html: message.m.html }} />
                      : <div className="body">{message.m.text || '(no body)'}</div>}
                    <div style={{ marginTop: 16 }}>
                      <button className="btn-small" onClick={() => replyTo(message.m)}>Reply</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="section">
            <div className="panel-title">Compose</div>
            <form className="compose-grid" onSubmit={sendCompose}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="cTo">To</label>
                <input type="email" id="cTo" required placeholder="client@example.com"
                  value={compose.to} onChange={e => setCompose(c => ({ ...c, to: e.target.value }))} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="cSubject">Subject</label>
                <input type="text" id="cSubject" required placeholder="e.g. Following up on your proposal"
                  value={compose.subject} onChange={e => setCompose(c => ({ ...c, subject: e.target.value }))} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="cBody">Message</label>
                <textarea id="cBody" required placeholder="Write your message…" ref={bodyRef}
                  value={compose.body} onChange={e => setCompose(c => ({ ...c, body: e.target.value }))} />
              </div>
              <button className="btn-small" type="submit" style={{ justifySelf: 'start' }}>Send email</button>
              <div className={`send-status ${composeStatus.kind}`}>{composeStatus.text}</div>
            </form>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
