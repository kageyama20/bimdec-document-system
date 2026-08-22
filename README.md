# BIMDEC — Document System

A client/admin portal in front of the BIMDEC document generator (proposal,
billing invoice, and acknowledgement receipt templates).

## Getting started

Open `index.html` in a browser (or serve the folder with any static file
server). No build step or server-side install is required.

1. **Welcome page** (`index.html`) — entry point with Client / Admin login options.
2. **Sign in** (`login.html`) — use the bootstrap admin account to get started:
   - Email: `admin@bimphilippines.org`
   - Password: `BIMDEC-Admin-2026`
   - Change this password's account details from a real backend before
     using this with real client data — see the security note in
     `database/SCHEMA.md`.
3. From the **Admin Portal** (`admin/dashboard.html`), you can still generate
   invite codes for new admins or clients under "Invite a new user" — but
   this is **not required right now**: see the note below.
4. **Invite-code gating is temporarily switched off.** `signup.html` no
   longer requires a code — anyone who reaches the signup page picks
   "Admin" or "Client" and creates an account directly. Turn this back on
   before sharing the link publicly (see "Re-enabling invites" below).
5. Locked out of the bootstrap admin account? Use "Reset demo data & try
   again" on `login.html` — it clears this browser's local copy of the
   simulated database (`localStorage`) and restores the original bootstrap
   admin login. Note this only resets *that browser*; it doesn't affect
   what other visitors' browsers have stored.
5. Admins open **Documents** (`admin/documents.html`) to prepare proposals,
   invoices, and receipts — this is the original document generator, with
   client-specific sample data (names, dates, project details, invoice/
   receipt numbers, amounts, and fee line items) cleared out. The firm's
   letterhead, payment channel details, and the boilerplate Terms &
   Conditions / Revision Policy / Payment Schedule text are unchanged.
6. **Users & Invitations** (`admin/users.html`) — dedicated page for
   inviting new admins/clients, tracking open invite codes, and viewing
   everyone currently registered. (This used to live inline on the
   dashboard; it now has its own page, linked from the top nav.)
7. **Email** (`admin/email.html`) — a real emailing system: send mail
   through your own SMTP account, and read replies as they arrive in
   real time. This talks to a small backend service in `/backend` — see
   `backend/README.md` to deploy it (Netlify alone can't hold an open
   IMAP connection or keep a mail password safe). Until that backend is
   deployed and connected (Email page → Connection settings), sending
   and reading mail will show a "not connected" message.
8. From **Documents**, each of the three templates now has a
   **"Send this to email"** box under the print button — it renders the
   current preview to a PDF in the browser and emails it as an
   attachment through the same backend service.

## Folder structure

```
BIMDEC-Document-System/
├── index.html              Welcome page — entry point
├── login.html               Client / Admin sign-in
├── signup.html               Invitation-only account creation
├── admin/
│   ├── dashboard.html        Admin home — stats + links into the sections below
│   ├── documents.html        The document generator (Proposal / Invoice / Receipt),
│   │                         each with a "Send this to email" box
│   ├── users.html            Registered users, invitations, invite-a-new-user
│   └── email.html            Emailing System — compose/send + real-time inbox
├── client/
│   └── dashboard.html        Client home — profile, documents issued to them
├── assets/
│   ├── css/portal.css        Shared styling for login/signup/dashboards
│   ├── js/db.js              Simulated database + auth (see security note)
│   ├── js/emailClient.js     Frontend helper that talks to /backend's API
│   └── logo.png               BIMDEC logo, reused across login/signup/portals
├── database/
│   ├── SCHEMA.md              Data model + security notes (read this)
│   ├── users.seed.json        Reference shape for the users table
│   └── invites.seed.json      Reference shape for the invites table
└── backend/                  Small always-on Node service: SMTP send +
                               real-time IMAP inbox. See backend/README.md —
                               this is NOT hosted on Netlify (deploy it to
                               Render or Railway and connect it from the
                               Email page).
```

## Important: this is a front-end prototype

There is no server here. `assets/js/db.js` simulates a database using the
browser's `localStorage`, seeded with one bootstrap admin account and one
example admin invite code. That's enough to demo the full flow —
welcome → login → invite → signup → portal — but it is **not secure**
and **not multi-device**: each browser has its own separate copy of the
data, and anyone with devtools access to that browser can read or edit it.

Read `database/SCHEMA.md` for what a real backend would need to replace
`db.js` with before this handles real client accounts or documents.

## Re-enabling invites

Signup is currently open (no code required) so you can get back into an
admin account and start using the portal. To restore invitation-only
signup later:
1. In `signup.html`, put back the invite-code step before the profile
   form (an earlier version of this file gates the form behind
   `DB.validateInvite(code)` — regenerate that step, or ask for it).
2. Keep `assets/js/db.js`'s `createUser()` as-is — it already accepts
   either an `invite` object or a plain `role`, so it works either way.
