const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const store = require('./store');

/*
 * Two ways this can watch your inbox, chosen by IMAP_MODE:
 *
 * - "poll" (default — works on Render/Railway's FREE tier):
 *   Free web services spin down after ~15 minutes idle, so nothing can
 *   stay "always connected" for real IMAP IDLE. Instead, each call to
 *   fetchIfDue() opens a short IMAP connection, grabs anything new,
 *   stores it, and disconnects. The admin portal calls this every time
 *   it loads/polls the inbox (see /api/inbox in server.js), which also
 *   happens to be what wakes a sleeping free instance back up. A
 *   MIN_POLL_INTERVAL guards against hammering your mail server if the
 *   dashboard is refreshing quickly. New mail typically shows up within
 *   IMAP_POLL_INTERVAL_SECONDS of the admin having the Email page open —
 *   not truly instant, but free.
 *
 * - "idle" (only meaningful on an ALWAYS-ON / paid instance):
 *   Keeps one persistent connection open with IMAP IDLE, so new mail is
 *   pushed out over Socket.IO the moment it arrives. On a free instance
 *   that sleeps, this connection just gets dropped and reconnects on
 *   the next wake — which ends up behaving like a worse version of poll
 *   mode anyway, so there's no reason to use it until you're paying for
 *   an always-on service.
 */

const MODE = (process.env.IMAP_MODE || 'poll').toLowerCase();
const MIN_POLL_INTERVAL_MS = Number(process.env.IMAP_POLL_INTERVAL_SECONDS || 20) * 1000;

let io = null;
let lastFetchAt = 0;
let fetchInFlight = null;

function toSummary(parsed, uid, unread) {
  const text = (parsed.text || '').trim();
  return {
    uid,
    messageId: parsed.messageId || String(uid),
    from: parsed.from ? parsed.from.text : '(unknown sender)',
    to: parsed.to ? parsed.to.text : '',
    subject: parsed.subject || '(no subject)',
    date: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
    snippet: text.slice(0, 160),
    text: text,
    html: parsed.html || null,
    unread,
  };
}

async function fetchAndStore(client, uid, { announce } = { announce: false }) {
  const { content } = await client.download(uid, undefined, { uid: true });
  const parsed = await simpleParser(content);
  const flagsData = await client.fetchOne(uid, { flags: true }, { uid: true });
  const unread = !(flagsData && flagsData.flags && flagsData.flags.has('\\Seen'));
  const summary = toSummary(parsed, uid, unread);
  store.addMessage(summary);
  if (announce && io) io.emit('newMail', summary);
  return summary;
}

function openClient() {
  return new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: String(process.env.IMAP_SECURE || 'true') === 'true',
    auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASS },
    logger: false,
  });
}

/* ---------------- Poll mode (default, free-tier friendly) ---------------- */

let lastKnownExists = null; // total message count on the mailbox as of our last check

async function doPollFetch({ announceNew }) {
  const client = openClient();
  await client.connect();
  const mailbox = process.env.IMAP_MAILBOX || 'INBOX';
  const lock = await client.getMailboxLock(mailbox);
  try {
    const total = client.mailbox.exists || 0;
    if (lastKnownExists === null) {
      // First ever check: seed the cache with the most recent N messages
      // without treating all of them as "new" pushes.
      const initialFetch = Number(process.env.IMAP_INITIAL_FETCH || 30);
      const start = Math.max(1, total - initialFetch + 1);
      if (total > 0) {
        const range = `${start}:${total}`;
        for await (const msg of client.fetch(range, { uid: true })) {
          try { await fetchAndStore(client, msg.uid, { announce: false }); }
          catch (err) { console.error('[imap] parse failed during initial fetch', err.message); }
        }
      }
    } else if (total > lastKnownExists) {
      const range = `${lastKnownExists + 1}:${total}`;
      for await (const msg of client.fetch(range, { uid: true })) {
        try { await fetchAndStore(client, msg.uid, { announce: announceNew }); }
        catch (err) { console.error('[imap] parse failed during poll', err.message); }
      }
    }
    lastKnownExists = total;
    store.setConnectionState('ok', `Checked ${new Date().toLocaleTimeString()} — polling every ${MIN_POLL_INTERVAL_MS / 1000}s.`);
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
}

/**
 * Called from the API route whenever the admin portal asks for the inbox.
 * Only actually hits the mail server if MIN_POLL_INTERVAL_MS has elapsed
 * since the last check, and coalesces overlapping calls into one fetch.
 */
async function fetchIfDue() {
  if (MODE !== 'poll') return; // idle mode keeps its own connection open
  const now = Date.now();
  if (fetchInFlight) return fetchInFlight;
  if (now - lastFetchAt < MIN_POLL_INTERVAL_MS) return;

  lastFetchAt = now;
  fetchInFlight = doPollFetch({ announceNew: true })
    .catch(err => {
      console.error('[imap] poll failed', err.message);
      store.setConnectionState('bad', err.message);
    })
    .finally(() => { fetchInFlight = null; });
  return fetchInFlight;
}

/* ---------------- IDLE mode (only for an always-on paid instance) ---------------- */

let idleClient = null;
let reconnectDelay = 5000;
const MAX_RECONNECT_DELAY = 60000;

async function connectIdleOnce() {
  idleClient = openClient();

  idleClient.on('error', (err) => {
    console.error('[imap] connection error', err.message);
    store.setConnectionState('bad', err.message);
  });
  idleClient.on('close', () => {
    store.setConnectionState('bad', 'Connection closed — reconnecting…');
    scheduleIdleReconnect();
  });

  await idleClient.connect();
  store.setConnectionState('ok', `Connected — watching ${process.env.IMAP_MAILBOX || 'INBOX'} in real time.`);
  reconnectDelay = 5000;

  const mailbox = process.env.IMAP_MAILBOX || 'INBOX';
  const lock = await idleClient.getMailboxLock(mailbox);
  try {
    const total = idleClient.mailbox.exists || 0;
    const initialFetch = Number(process.env.IMAP_INITIAL_FETCH || 30);
    const start = Math.max(1, total - initialFetch + 1);
    if (total > 0) {
      for await (const msg of idleClient.fetch(`${start}:${total}`, { uid: true })) {
        try { await fetchAndStore(idleClient, msg.uid, { announce: false }); }
        catch (err) { console.error('[imap] failed to parse message during initial sync', err.message); }
      }
    }
    lastKnownExists = total;
  } finally {
    lock.release();
  }

  idleClient.on('exists', async (data) => {
    try {
      const lock2 = await idleClient.getMailboxLock(mailbox);
      try {
        const total = idleClient.mailbox.exists || 0;
        const prev = data.prevCount || (total - 1);
        if (total <= prev) return;
        for await (const msg of idleClient.fetch(`${prev + 1}:${total}`, { uid: true })) {
          await fetchAndStore(idleClient, msg.uid, { announce: true });
        }
        lastKnownExists = total;
      } finally {
        lock2.release();
      }
    } catch (err) {
      console.error('[imap] error handling new mail event', err.message);
    }
  });

  await idleClient.idle();
}

function scheduleIdleReconnect() {
  setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
    connectIdleOnce().catch(err => {
      console.error('[imap] reconnect failed', err.message);
      store.setConnectionState('bad', err.message);
      scheduleIdleReconnect();
    });
  }, reconnectDelay);
}

/* ---------------- Startup ---------------- */

async function startImapWatcher(ioInstance) {
  io = ioInstance;
  if (MODE === 'idle') {
    store.setConnectionState('pending', 'Connecting to IMAP (real-time mode)…');
    try {
      await connectIdleOnce();
    } catch (err) {
      console.error('[imap] failed to connect', err.message);
      store.setConnectionState('bad', err.message);
      scheduleIdleReconnect();
    }
  } else {
    store.setConnectionState('pending', 'Waiting for first inbox check (poll mode)…');
    // Best-effort initial fetch so the inbox isn't empty before the first API call.
    fetchIfDue().catch(() => {});
  }
}

module.exports = { startImapWatcher, fetchIfDue, MODE };
