# BIMDEC Document System — Data Model

This folder documents the data this system keeps on registered users and
invitations. The live copy of this data lives in a Supabase (Postgres)
project — see `supabase-schema.sql` in this folder for the real table
definitions, access rules, and setup steps. `/assets/js/db.js` talks to
that project via `@supabase/supabase-js`.

`users.seed.json` and `invites.seed.json` in this folder show that same
shape so the schema has one clear source of truth, separate from the
application code.

## users

| field       | type    | notes                                              |
|-------------|---------|-----------------------------------------------------|
| id          | string  | generated on signup                                 |
| role        | string  | `"admin"` or `"client"` — set by the invite used    |
| fullName    | string  | from signup form                                    |
| email       | string  | used to log in; must be unique                      |
| password    | string  | **prototype only** — see security note below        |
| position    | string  | admin accounts only (job title)                     |
| company     | string  | client accounts only (company / organization)       |
| phone       | string  | optional                                             |
| createdAt   | string  | ISO timestamp                                       |
| invitedBy   | string  | the invite code used to register                    |

## invites

| field     | type          | notes                                          |
|-----------|---------------|-------------------------------------------------|
| code      | string        | shared with the invitee out of band             |
| role      | string        | `"admin"` or `"client"` — determines the account created |
| note      | string        | optional, admin-facing (e.g. which client it's for) |
| createdAt | string        | ISO timestamp                                    |
| usedBy    | string\|null  | email of the account that redeemed it, if any    |
| usedAt    | string\|null  | ISO timestamp of redemption, if any               |

Signup is **invitation-only**: `signup.html` requires a valid, unused
invite code before it will show the registration form. Admins generate
codes from the Admin Portal dashboard (`admin/dashboard.html`) and share
them directly with the person being invited.

## Security note

This now runs on Supabase, which handles the items a real backend needs:

1. `profiles` / `invites` live in a real Postgres database, not
   `localStorage`.
2. Passwords are hashed and managed by Supabase Auth — never stored in
   plain text anywhere in this app's code.
3. Login issues a real, server-validated session (JWT) via Supabase Auth.
4. Row-level security policies (in `supabase-schema.sql`) check the
   caller's role on every request — a client's Supabase session simply
   cannot read another client's profile row, and only an admin session
   can read the `invites` table or every profile.

The `users.seed.json` / `invites.seed.json` files in this folder still
describe the same shape, now implemented as real columns in
`supabase-schema.sql`.
