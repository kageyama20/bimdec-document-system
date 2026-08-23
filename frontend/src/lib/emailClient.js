/*
 * BIMDEC Email Client — thin wrapper the admin portal uses to talk to the
 * backend email service (see /backend).
 *
 * The service URL defaults to VITE_API_BASE (baked in at build time, set on
 * the static site in /render.yaml). An admin can still override it per-browser
 * from Email > Connection settings, which is what the localStorage entry is
 * for. Without that default, moving the site to a new origin would silently
 * empty every admin's localStorage and leave the Email page dead with no
 * explanation.
 *
 * The API key is deliberately NOT read from an env var — a build-time value
 * ends up readable in the published bundle. It stays in localStorage, entered
 * once per admin per device.
 */
import { io } from 'socket.io-client';

const EMAIL_CFG_KEY = 'BIMDEC_EMAIL_CFG';
const DEFAULT_API_BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');

const EmailClient = {
  /** The admin's saved overrides, exactly as stored. */
  getSavedConfig() {
    try {
      return JSON.parse(localStorage.getItem(EMAIL_CFG_KEY) || '{}');
    } catch (e) {
      return {};
    }
  },

  /** Effective config: saved override first, build-time default second. */
  getConfig() {
    const saved = this.getSavedConfig();
    return {
      apiBase: String(saved.apiBase || DEFAULT_API_BASE || '').replace(/\/+$/, ''),
      apiKey: String(saved.apiKey || ''),
    };
  },

  /** The build-time fallback, so the settings form can show it as a placeholder. */
  getDefaultApiBase() {
    return DEFAULT_API_BASE;
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
   * Returns the socket instance, or null if no backend URL is configured.
   * Callers are responsible for calling socket.disconnect() on unmount.
   */
  connectLive({ onNewMail, onConnectionState } = {}) {
    const { apiBase } = this.getConfig();
    if (!apiBase) return null;
    const socket = io(apiBase, { transports: ['websocket', 'polling'] });
    if (onNewMail) socket.on('newMail', onNewMail);
    if (onConnectionState) socket.on('connectionState', onConnectionState);
    return socket;
  },
};

export default EmailClient;
