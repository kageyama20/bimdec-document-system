# BIMDEC — Document System

A client/admin portal in front of the BIMDEC document generator (proposal,
billing invoice, and acknowledgement receipt templates).

Two deployables, both on Render's free tier, both described by
[`render.yaml`](render.yaml):

| | What | Render service |
|---|---|---|
| `frontend/` | Vite + React single-page app — the whole portal | Static Site (free, never sleeps) |
| `backend/` | Express + Socket.IO service: SMTP send + IMAP inbox | Web Service (free, sleeps after ~15 min idle) |

Accounts, profiles, and invite codes live in Supabase (see
`database/SCHEMA.md`), not in the browser.

## Running it locally

```bash
cd frontend
cp .env.example .env      # Supabase project + default backend URL
npm install
npm run dev               # http://localhost:5173
```

`npm run build && npm run preview` runs the production bundle on
http://localhost:4173 — worth doing before any deploy, because it is the only
way to catch bundling problems (and the SPA fallback) that `npm run dev` hides.

The frontend talks to the deployed email backend by default. Expect a 30-50
second wait on the first request while Render wakes the free instance. To run
the backend locally instead, see `backend/README.md`, then set
`VITE_API_BASE=http://localhost:8080` in `frontend/.env`.

Either way the backend must list your dev origin in `ALLOWED_ORIGINS`
(`http://localhost:5173`, plus `http://localhost:4173` for `preview`) or every
request — including the live-inbox WebSocket — is rejected by CORS.

## Using it

1. **Welcome** (`/`) — Client / Admin entry point.
2. **Sign in** (`/login`) — the role tabs decide which portal you land in;
   signing in with the wrong tab is rejected rather than silently redirected.
3. **Sign up** (`/signup`) — invitation-only. Enter a code from an admin
   first; the profile form only appears once the code validates.
4. **Admin portal** (`/admin`) — stats and links into the sections below.
5. **Documents** (`/admin/documents`) — the generator: proposals, invoices,
   and receipts, with the firm's letterhead, payment channel details, and the
   boilerplate Terms / Revision Policy / Payment Schedule pre-filled. Each
   template can be printed, saved as a PDF at a chosen paper size, or emailed
   to a client as a PDF attachment. Drafts autosave to the browser.
6. **Users & Invitations** (`/admin/users`) — generate and revoke invite
   codes (optionally emailing them), and see everyone registered.
7. **Email** (`/admin/email`) — send mail through your own SMTP account and
   read replies as they arrive. Needs the backend connected: the URL comes
   preconfigured from `VITE_API_BASE`, so each admin only pastes the API key
   once per browser.
8. **Client portal** (`/client`) — profile and the documents issued to them.

## Folder structure

```
bimdec-document-system/
├── render.yaml               Blueprint: both services, free tier
├── frontend/                 The portal (Vite + React)
│   ├── index.html            Single SPA entry
│   ├── .env.example          VITE_SUPABASE_* + VITE_API_BASE
│   └── src/
│       ├── App.jsx           Route table, incl. redirects from the old .html URLs
│       ├── lib/              supabaseClient · db · emailClient
│       ├── session/          SessionProvider — one session fetch for the app
│       ├── components/       ProtectedRoute · PortalShell · AuthCard · Msg
│       ├── styles/           portal.css · documents.css (scoped under .docgen)
│       └── pages/
│           ├── Welcome · Login · Signup
│           ├── client/Dashboard
│           └── admin/
│               ├── Dashboard · Users · Email
│               └── documents/   the generator (see the note below)
├── backend/                  SMTP send + real-time IMAP inbox. See backend/README.md.
├── database/
│   ├── SCHEMA.md             Data model + security notes (read this)
│   ├── supabase-schema.sql   Tables, RLS policies, invite RPCs
│   └── *.seed.json           Reference shapes
└── .github/workflows/        Daily keep-alive ping (Supabase pauses after 7 idle days)
```

### A note on `src/pages/admin/documents/`

The generator is still driven imperatively — `documentsController.js` owns the
DOM inside `DocumentMarkup.jsx`, which renders once and is never re-rendered.
That is deliberate: the page addresses ~180 element ids directly, autosaves by
walking `.editor input[id]` and reading `el.value`, and paginates by measuring
live element heights against an A4 page. Converting all of that to React state
is a separate piece of work; the header comments in both files spell out the
invariants to respect until then.

## Deploying

`render.yaml` describes both services; Render creates both from it. **Read the
header comment in that file first** — the frontend needs the backend's public
URL baked in at build time, and Render only assigns that at creation, so the
first deploy takes two passes.

After the frontend moves to a new origin, three things must be updated or the
portal will look broken in ways that give no error message:

1. **`ALLOWED_ORIGINS`** on the backend — exact-match, comma-separated, and it
   gates the Socket.IO handshake as well as the REST calls. It fails *open*
   when empty, so never blank it to "fix" a CORS error.
2. **Supabase → Authentication → URL Configuration** — Site URL and Redirect
   URLs, or confirmation and password-reset links keep pointing at the old
   domain.
3. **Tell the admins.** `localStorage` is per-origin, so a domain change signs
   everyone out and clears their saved API key *and any autosaved document
   draft, including uploaded signature images*. Ask them to finish or export
   anything in progress first.

## Security notes

- The Supabase key shipped in the frontend bundle is the publishable/anon key.
  It is safe to expose; the RLS policies in `database/supabase-schema.sql` are
  what actually protect the data. The `service_role` key must never be put in
  `frontend/.env` or `render.yaml` — Vite would inline it into a public file.
- The backend API key is intentionally *not* a build-time variable, for the
  same reason. It stays in each admin's browser.
- HTML email bodies are rendered as received on the Email page, exactly as the
  old page did. That trusts whatever lands in the mailbox — worth revisiting
  before widening who can send to it.
- Read `database/SCHEMA.md` for the data model and its security notes.
