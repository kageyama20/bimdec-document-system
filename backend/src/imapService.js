const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const store = require('./store');

/*
 * Keeps a persistent IMAP connection open (using IMAP IDLE) so new mail
 * is detected the moment it arrives, rather than on a polling delay.
 * imapflow automatically re-issues IDLE and reconnects on drops, but we
 * add our own retry/backoff around the initial connect and around any
 * fatal error so the service recovers on its own instead of needing a
 * manual restart.
 */

let client = null;
let io = null;
let reconnectDelay = 5000; // grows on repeated failures, resets on success
const MAX_RECONNECT_DELAY = 60000;

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
  if (announce && io) {
    io.emit('newMail', summary);
  }
  return summary;
}

async function initialSync(client) {
  const mailbox = process.env.IMAP_MAILBOX || 'INBOX';
  const lock = await client.getMailboxLock(mailbox);
  try {
    const total = client.mailbox.exists || 0;
    if (total === 0) return;
    const initialFetch = Number(process.env.IMAP_INITIAL_FETCH || 30);
    const start = Math.max(1, total - initialFetch + 1);
    const range = `${start}:${total}`;
    for await (const msg of client.fetch(range, { uid: true })) {
      try {
        await fetchAndStore(client, msg.uid, { announce: false });
      } catch (err) {
        console.error('[imap] failed to parse message during initial sync', err.message);
      }
    }
  } finally {
    lock.release();
  }
}

async function watchMailbox(client) {
  const mailbox = process.env.IMAP_MAILBOX || 'INBOX';
  const lock = await client.getMailboxLock(mailbox);
  lock.release(); // release the setup lock; listen for events on the client itself

  client.on('exists', async (data) => {
    // New message(s) landed — fetch just the newest one(s).
    try {
      const lock2 = await client.getMailboxLock(mailbox);
      try {
        const total = client.mailbox.exists || 0;
        const prev = data.prevCount || (total - 1);
        if (total <= prev) return;
        const range = `${prev + 1}:${total}`;
        for await (const msg of client.fetch(range, { uid: true })) {
          await fetchAndStore(client, msg.uid, { announce: true });
        }
      } finally {
        lock2.release();
      }
    } catch (err) {
      console.error('[imap] error handling new mail event', err.message);
    }
  });
}

async function connectOnce() {
  client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: String(process.env.IMAP_SECURE || 'true') === 'true',
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASS,
    },
    logger: false,
  });

  client.on('error', (err) => {
    console.error('[imap] connection error', err.message);
    store.setConnectionState('bad', err.message);
  });

  client.on('close', () => {
    store.setConnectionState('bad', 'Connection closed — reconnecting…');
    scheduleReconnect();
  });

  await client.connect();
  store.setConnectionState('ok', `Connected — watching ${process.env.IMAP_MAILBOX || 'INBOX'} in real time.`);
  reconnectDelay = 5000;

  await initialSync(client);
  await watchMailbox(client);
  await client.idle();
}

function scheduleReconnect() {
  setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 1.5, MAX_RECONNECT_DELAY);
    startImapWatcher(io).catch(() => {});
  }, reconnectDelay);
}

async function startImapWatcher(ioInstance) {
  io = ioInstance;
  store.setConnectionState('pending', 'Connecting to IMAP…');
  try {
    await connectOnce();
  } catch (err) {
    console.error('[imap] failed to connect', err.message);
    store.setConnectionState('bad', err.message);
    scheduleReconnect();
  }
}

module.exports = { startImapWatcher };
