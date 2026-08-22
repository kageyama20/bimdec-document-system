require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const mailer = require('./mailer');
const store = require('./store');
const imapService = require('./imapService');

const app = express();
app.use(express.json({ limit: '15mb' })); // generous enough for a base64 PDF attachment
app.set('etag', false);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin/non-browser requests (no Origin header) and anything in the allowlist.
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin not allowed: ' + origin));
  },
};
app.use(cors(corsOptions));

const server = http.createServer(app);
const io = new Server(server, { cors: corsOptions });

// --- Simple shared-secret auth for every /api route ---
function requireApiKey(req, res, next) {
  const key = req.header('X-Api-Key');
  if (!process.env.API_KEY) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured: API_KEY is not set.' });
  }
  if (key !== process.env.API_KEY) {
    return res.status(401).json({ ok: false, error: 'Invalid or missing X-Api-Key header.' });
  }
  next();
}

app.get('/health', (req, res) => {
  res.json({ ok: true, imap: store.getConnectionState() });
});

app.use('/api', requireApiKey);

// POST /api/send  { to, subject, html, text?, attachments?: [{filename, content(base64), contentType}] }
app.post('/api/send', async (req, res) => {
  try {
    const { to, subject, html, text, attachments } = req.body || {};
    const info = await mailer.sendMail({ to, subject, html, text, attachments });
    res.json({ ok: true, messageId: info.messageId });
  } catch (err) {
    console.error('[api] send failed', err.message);
    res.status(400).json({ ok: false, error: err.message });
  }
});

// GET /api/inbox?limit=50&offset=0
app.get('/api/inbox', async (req, res) => {
  await imapService.fetchIfDue().catch(() => {}); // poll-mode: check the mailbox now if it's due
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  res.json({
    ok: true,
    connection: store.getConnectionState(),
    messages: store.getMessages({ limit, offset }),
  });
});

// GET /api/inbox/:uid — full message including HTML body
app.get('/api/inbox/:uid', (req, res) => {
  const msg = store.getMessageByUid(req.params.uid);
  if (!msg) return res.status(404).json({ ok: false, error: 'Message not found (it may be older than the in-memory cache).' });
  res.json({ ok: true, message: msg });
});

// POST /api/inbox/:uid/read — mark as read (locally, in this cache)
app.post('/api/inbox/:uid/read', (req, res) => {
  const msg = store.markRead(req.params.uid);
  if (!msg) return res.status(404).json({ ok: false, error: 'Message not found.' });
  res.json({ ok: true, message: msg });
});

io.on('connection', (socket) => {
  socket.emit('connectionState', store.getConnectionState());
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`[server] BIMDEC email service listening on port ${PORT}`);
});

imapService.startImapWatcher(io);
