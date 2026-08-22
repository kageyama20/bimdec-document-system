/*
 * BIMDEC Email Client — thin wrapper the admin portal pages use to
 * talk to the backend email service (see /backend). The service URL
 * and API key are entered once by the admin (Email page > Connection
 * settings) and kept in this browser's localStorage — never hardcoded
 * here, and never sent anywhere except to the URL the admin typed in.
 */

const EMAIL_CFG_KEY = 'BIMDEC_EMAIL_CFG';

const EmailClient = {
  getConfig() {
    try {
      return JSON.parse(localStorage.getItem(EMAIL_CFG_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  setConfig({ apiBase, apiKey }) {
    const cfg = { apiBase: String(apiBase || '').replace(/\/+$/, ''), apiKey: String(apiKey || '') };
    localStorage.setItem(EMAIL_CFG_KEY, JSON.stringify(cfg));
    return cfg;
  },

  isConfigured() {
    const { apiBase, apiKey } = this.getConfig();
    return Boolean(apiBase && apiKey);
  },

  async _fetch(path, options = {}) {
    const { apiBase, apiKey } = this.getConfig();
    if (!apiBase || !apiKey) {
      throw new Error('Email service isn\'t connected yet. Go to the Email page and enter your backend URL + API key.');
    }
    const res = await fetch(apiBase + path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        ...(options.headers || {}),
      },
    });
    let data;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok || !data || data.ok === false) {
      throw new Error((data && data.error) || `Request failed (${res.status})`);
    }
    return data;
  },

  async checkHealth() {
    const { apiBase } = this.getConfig();
    if (!apiBase) throw new Error('No backend URL configured yet.');
    const res = await fetch(apiBase + '/health');
    if (!res.ok) throw new Error('Backend did not respond (' + res.status + ')');
    return res.json();
  },

  /**
   * @param {{to:string, subject:string, html?:string, text?:string, attachments?:Array}} msg
   */
  async send(msg) {
    return this._fetch('/api/send', { method: 'POST', body: JSON.stringify(msg) });
  },

  async listInbox({ limit = 50, offset = 0 } = {}) {
    return this._fetch(`/api/inbox?limit=${limit}&offset=${offset}`);
  },

  async getMessage(uid) {
    return this._fetch(`/api/inbox/${encodeURIComponent(uid)}`);
  },

  async markRead(uid) {
    return this._fetch(`/api/inbox/${encodeURIComponent(uid)}/read`, { method: 'POST' });
  },

  /**
   * Opens a live Socket.IO connection for real-time inbox updates.
   * Requires the socket.io client script to already be loaded on the page.
   * Returns the socket instance, or null if not configured / library missing.
   */
  connectLive({ onNewMail, onConnectionState } = {}) {
    const { apiBase } = this.getConfig();
    if (!apiBase || typeof io === 'undefined') return null;
    const socket = io(apiBase, { transports: ['websocket', 'polling'] });
    if (onNewMail) socket.on('newMail', onNewMail);
    if (onConnectionState) socket.on('connectionState', onConnectionState);
    return socket;
  },
};
