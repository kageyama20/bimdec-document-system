# BIMDEC Email Service (backend)

A small service that gives the BIMDEC Document System admin portal — a
static single-page app served from Render — a real emailing system:

- **Sends mail** via your SMTP account (`POST /api/send`) — used by the
  Emailing System page and by the "Send to email" button in the
  Document Generator preview.
- **Reads your inbox** via IMAP (`GET /api/inbox`) and shows new
  messages in the admin portal.

This exists because a static site cannot hold an SMTP/IMAP connection
or keep your mail password safe — that needs a real server.
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

## Why this can't just live in the static site

- Browsers can't open raw SMTP/IMAP sockets, and mail servers wouldn't
  accept a browser connecting directly anyway.
- Even a serverless function is too short-lived to hold a connection
  open in poll mode's brief per-check sense — a small standalone
  service like this one is the simplest fit.
- And the mailbox password has to live somewhere the browser can't
  read, which rules out anything shipped in the frontend bundle.
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

This service is deployed by the repo-root [`render.yaml`](../render.yaml)
Blueprint, alongside the frontend static site — **Render's free tier**,
750 instance-hours/month (enough to run one service continuously), no
credit card required.

Read the header comment in `render.yaml` before creating the Blueprint.
The short version:

1. Render dashboard → **New → Blueprint** → connect this repo → branch
   `main`. It prompts for every `sync: false` variable — copy them from
   your local `backend/.env`.
2. Note the URL Render assigns (something like
   `https://bimdec-email.onrender.com`), put it in `VITE_API_BASE` in
   `render.yaml`, put the frontend's URL in this service's
   `ALLOWED_ORIGINS`, and sync again. The public URL can't be wired
   automatically — Render's `fromService` only exposes private-network
   hostnames.

The trade-off of the free tier is the ~20-second poll delay and a 30-60
second "wake up" the first time it's used after being idle a while
(Render's cold start) — both fine for an internal admin tool. The
frontend is a Render **static site**, which is also free but never
sleeps, so only mail is affected.

### Running it locally on Windows

If IMAP or SMTP fails with `unable to verify the first certificate`,
check whether an antivirus is intercepting mail traffic:

```bash
openssl s_client -connect shu23.u-srv.com:993 -servername shu23.u-srv.com </dev/null 2>/dev/null | grep issuer=
```

An issuer like `Avast Web/Mail Shield Untrusted Root` means the AV is
re-signing the connection with a root Node doesn't trust. Turn off its
Mail Shield while developing. This is local-only — it does not happen on
Render.

### If you later want true instant push
Upgrade the Render service to a paid **Starter** instance (~$7/month,
always-on), set `IMAP_MODE=idle`, and redeploy. Nothing else changes.

### `ALLOWED_ORIGINS`

**Set this to the portal's real URL** (e.g.
`https://bimdec-portal.onrender.com`, plus `http://localhost:5173` while
developing) so only your site can call this API. Three things to know:

- It is an **exact string match** — no wildcards, no trailing slash, and
  the scheme is part of it.
- The same allowlist gates the **Socket.IO handshake**, so a missing
  origin breaks the live inbox in exactly the same silent way it breaks
  the REST calls.
- It **fails open when empty**: with no value set, every origin is
  allowed. Never blank it out to make a CORS error go away.

## 3. Point the admin portal at your deployed service

The portal already knows the URL — it comes from `VITE_API_BASE`, set on
the static site in `render.yaml`. Each admin only needs to supply the key:

Admin portal → **Email** page → **Connection settings** → paste the same
value you set as `API_KEY`, then **Save & connect**. The badge turns
green once `/health` answers (allow up to a minute for a cold start).

The key is saved in that browser's `localStorage` and is deliberately not
a build-time variable — Vite would inline it into a publicly downloadable
bundle. So each admin sets it once per device. You can also override the
backend URL in the same form to point a browser at a local or staging
instance without rebuilding.

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
