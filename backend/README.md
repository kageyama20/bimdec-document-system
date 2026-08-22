# BIMDEC Email Service (backend)

A small always-on Node service that gives the static, Netlify-hosted
BIMDEC Document System admin portal a real emailing system:

- **Sends mail** via your SMTP account (`POST /api/send`) — used by the
  Emailing System page and by the "Send to email" button in the
  Document Generator preview.
- **Watches your inbox in real time** via IMAP IDLE and pushes new
  messages to the admin portal instantly over Socket.IO
  (`GET /api/inbox`, live `newMail` events).

This exists because a static site (Netlify) cannot hold an open SMTP/IMAP
connection or keep your mail password safe — that needs a real server.
This is that server. It's intentionally small and dependency-light.

## Why this can't just live on Netlify

- Browsers can't open raw SMTP/IMAP sockets, and mail servers wouldn't
  accept a browser connecting directly anyway.
- IMAP "real-time" (IDLE) needs a *persistent* connection — Netlify
  Functions are short-lived and spin down between requests, so they
  can't stay connected to your mailbox.
- Your mail password must never be shipped to the browser. It lives
  only in this service's environment variables.

## 1. Local setup (optional, for testing)

```bash
cd backend
npm install
cp .env.example .env
# edit .env with your real SMTP/IMAP username + password
npm start
```

Visit `http://localhost:8080/health` — you should see
`{"ok":true,"imap":{"status":"ok", ...}}` once the IMAP connection is
established (status starts as `"pending"` for a few seconds on boot).

## 2. Deploy it somewhere always-on

Netlify can't run this (see above). Use **Render** or **Railway** —
both have a free/cheap tier that's enough for this:

### Render
1. Push this repo (or just the `backend/` folder) to GitHub.
2. Render dashboard → New → Web Service → connect the repo.
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add all the variables from `.env.example` under **Environment**.
7. Deploy. Render gives you a URL like `https://bimdec-email.onrender.com`.

### Railway
1. New Project → Deploy from GitHub repo.
2. Set root directory to `backend`.
3. Add the same environment variables under **Variables**.
4. Railway auto-detects `npm start`. Deploy, then grab the generated
   public URL.

Either way, **set `ALLOWED_ORIGINS` to your real Netlify site URL**
(e.g. `https://bimphilippines.org`) so only your site can call this API.

## 3. Point the admin portal at your deployed service

Open the admin portal → **Email** page → **Connection settings**, and
enter:

- **API base URL**: the URL Render/Railway gave you
  (e.g. `https://bimdec-email.onrender.com`)
- **API key**: the same value you set as `API_KEY` in step 2

This is saved in the browser's `localStorage` on the admin's device —
it is *not* committed to the code, so each admin sets it once on
whatever device they use to manage the portal.

## Environment variables

See `.env.example` for the full list with comments. In short:

| Variable | Purpose |
|---|---|
| `API_KEY` | Shared secret the frontend must send as `X-Api-Key` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Your outgoing mail server (`shu23.u-srv.com`, `465`, `true`) |
| `SMTP_USER` / `SMTP_PASS` | Mailbox credentials used to send |
| `IMAP_HOST` / `IMAP_PORT` / `IMAP_SECURE` | Your incoming mail server (`shu23.u-srv.com`, `993`, `true`) |
| `IMAP_USER` / `IMAP_PASS` | Mailbox credentials used to read |
| `IMAP_MAILBOX` | Folder to watch, usually `INBOX` |
| `IMAP_INITIAL_FETCH` | How many recent messages to load on startup |

**Never commit a real `.env` file.** Set these as real environment
variables in Render/Railway's dashboard instead.

## API reference

All `/api/*` routes require header `X-Api-Key: <API_KEY>`.

- `GET /health` — no auth required; quick status check.
- `POST /api/send`
  ```json
  {
    "to": "client@example.com",
    "subject": "Proposal — Sample Project",
    "html": "<p>Please see the attached proposal.</p>",
    "attachments": [
      { "filename": "Proposal.pdf", "content": "<base64>", "contentType": "application/pdf" }
    ]
  }
  ```
- `GET /api/inbox?limit=50&offset=0` — recent messages (newest first).
- `GET /api/inbox/:uid` — one full message (with HTML body).
- `POST /api/inbox/:uid/read` — mark a message read in the local cache.
- Socket.IO event `newMail` — fired the instant a new message arrives.
- Socket.IO event `connectionState` — sent on connect with current IMAP status.

## Notes and limitations

- The inbox is cached **in memory** for speed — it resets on restart.
  The real, permanent copy of every email always stays on your mail
  server; this cache just makes the dashboard fast and real-time. For
  permanent searchable history in your own database, extend `store.js`
  to also write into your Supabase project.
- Free tiers on Render/Railway may sleep after inactivity, which drops
  the IMAP connection; it reconnects automatically on the next wake,
  but for true 24/7 real-time you'll want a paid always-on instance.
- This service has no built-in rate limiting — the `API_KEY` check is
  your main protection. Keep it long and secret.
