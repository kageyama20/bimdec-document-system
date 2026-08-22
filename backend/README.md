# BIMDEC Email Service (backend)

A small service that gives the static, Netlify-hosted BIMDEC Document
System admin portal a real emailing system:

- **Sends mail** via your SMTP account (`POST /api/send`) — used by the
  Emailing System page and by the "Send to email" button in the
  Document Generator preview.
- **Reads your inbox** via IMAP (`GET /api/inbox`) and shows new
  messages in the admin portal.

This exists because a static site (Netlify) cannot hold an SMTP/IMAP
connection or keep your mail password safe — that needs a real server.
This is that server. It's intentionally small and dependency-light,
and it's designed to run entirely on **free hosting tiers**.

## Two modes: poll (free) vs idle (paid, instant)

Set with `IMAP_MODE` in your environment variables:

- **`poll`** (default) — checks your mailbox for new mail whenever the
  admin portal asks for the inbox (roughly every 20 seconds while the
  Email page is open, throttled by `IMAP_POLL_INTERVAL_SECONDS`), then
  disconnects. This is what actually works on Render/Railway's **free**
  tier, because free instances spin down after ~15 minutes idle and
  can't hold a connection open in the background anyway. New mail shows
  up within a few seconds to ~20 seconds of the admin having the page
  open — not instant, but free.
- **`idle`** — keeps one persistent IMAP connection open and pushes new
  mail out instantly over Socket.IO. Only actually behaves as "instant"
  on an **always-on / paid** instance. On a free instance it just gets
  disconnected when the service sleeps and reconnects later, which ends
  up worse than poll mode — so there's no reason to turn this on until
  you've upgraded.

Sending mail (SMTP) works the same either way and isn't affected by
sleep — it just wakes the free instance on demand when you hit "Send".

## Why this can't just live on Netlify

- Browsers can't open raw SMTP/IMAP sockets, and mail servers wouldn't
  accept a browser connecting directly anyway.
- Netlify Functions are short-lived and can't hold a connection open
  even in poll mode's brief per-check sense — a small standalone
  service like this one is the simplest fit.
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
`{"ok":true,"imap":{"status":"pending"or"ok", ...}}`.

## 2. Deploy it for free

Netlify can't run this (see above). **Render's free tier** is the
easiest fit — 750 free instance-hours/month is enough to run one
service continuously, and no credit card is required:

### Render (free)
1. Push this repo (or just the `backend/` folder) to GitHub.
2. Render dashboard → New → Web Service → connect the repo.
3. Root directory: `backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Instance type: **Free**
7. Add all the variables from `.env.example` under **Environment**
   (leave `IMAP_MODE=poll` — that's the free-tier-compatible default).
8. Deploy. Render gives you a URL like `https://bimdec-email.onrender.com`.

That's it — $0/month. The trade-off is the ~20-second poll delay and a
30-60 second "wake up" the first time it's used after being idle a
while (Render's cold start) — both fine for an internal admin tool.

### If you later want true instant push
Upgrade the Render service to a paid **Starter** instance (~$7/month,
always-on), set `IMAP_MODE=idle`, and redeploy. Nothing else changes.

### Railway (alternative)
Railway's free tier has become far more limited than Render's, so
Render is the better default for a genuinely free setup. If you still
prefer Railway, the steps are the same: root directory `backend`, same
environment variables, `npm start`.

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
