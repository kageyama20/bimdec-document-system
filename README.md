# BIMDEC — Document System

A client/admin portal in front of the BIMDEC document generator (proposal,
billing invoice, and acknowledgement receipt templates).

## Getting started

This now runs on a real backend database (Supabase — free tier). Before
opening any page, do the one-time setup:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, open **SQL Editor** → New query → paste in
   the contents of `database/supabase-schema.sql` → Run. This creates the
   `profiles` and `invites` tables plus the access rules.
3. **Authentication → Providers → Email** → turn **off** "Confirm email"
   (this is an internal staff/client tool, not a public signup form —
   accounts should be usable immediately after signup). You can turn it
   back on later if you want email verification.
4. **Project Settings → API** → copy the **Project URL** and **anon
   public** key into `assets/js/supabase-config.js` (never put the
   `service_role` key here — only `anon`).
5. Deploy/redeploy the site (e.g. push to the connected Netlify site).

Then:

1. **Welcome page** (`index.html`) — entry point with Client / Admin login options.
2. **Create the first account** on `signup.html` using the bootstrap
   invite code `ADMIN-BOOTSTRAP-0001` (seeded by `supabase-schema.sql`)
   — this becomes your real first admin account.
3. From the **Admin Portal** (`admin/dashboard.html`), generate invite
   codes for new admins or clients under "Invite a new user" — every
   further signup requires one of these codes.
4. Admins open **Documents** (`admin/documents.html`) to prepare proposals,
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
│   ├── js/db.js              Database + auth layer (Supabase-backed)
│   ├── js/supabase-config.js Your Supabase project URL + anon key
│   ├── js/emailClient.js     Frontend helper that talks to /backend's API
│   └── logo.png               BIMDEC logo, reused across login/signup/portals
├── database/
│   ├── supabase-schema.sql    Run this once in Supabase's SQL Editor
│   ├── SCHEMA.md              Data model notes
│   ├── users.seed.json        Reference shape for the users table
│   └── invites.seed.json      Reference shape for the invites table
└── backend/                  Small always-on Node service: SMTP send +
                               real-time IMAP inbox. See backend/README.md —
                               this is NOT hosted on Netlify (deploy it to
                               Render or Railway and connect it from the
                               Email page).
```

## Database

Real accounts and data now live in Supabase (Postgres, free tier) —
`assets/js/db.js` talks to it via `@supabase/supabase-js`. Login uses
Supabase Auth (proper password hashing and sessions), and the
`profiles` / `invites` tables are protected by row-level security so
clients can only see their own data and only admins can see everyone's.
See `database/supabase-schema.sql` for the setup steps and
`database/SCHEMA.md` for the data model.

## Invite-gating

Signup is invitation-only again: `signup.html` requires a valid, unused
invite code (checked via `DB.validateInvite()`) before it shows the
account form, and `DB.createUser()` marks the code used on success. Admins
generate new codes from `admin/users.html`. The one-time bootstrap code
`ADMIN-BOOTSTRAP-0001` (seeded by `supabase-schema.sql`) exists only to
create your very first admin account — after that, generate fresh codes
per person instead of reusing it.
