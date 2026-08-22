# BIMDEC Document System — Data Model

This folder documents the data this system keeps on registered users and
invitations. It's the reference copy of the structure — the running app
(this is a static, front-end-only prototype) keeps the *live* copy of this
data in the visitor's browser storage (`localStorage`, key `BIMDEC_DB`),
seeded and managed by `/assets/js/db.js`.

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

## Security note — read before deploying this for real

This is a static prototype with no server, so there is no real database
and no real authentication:

- `db.js` stores everything in the browser's `localStorage`, which is
  readable and editable by anyone with access to that browser's devtools.
- Passwords are only lightly obfuscated in `db.js`, not hashed with a
  proper algorithm (bcrypt/argon2) and a per-user salt.
- There is no server-side session, so nothing here actually restricts
  access to real documents — it only gates the *front-end screens*.

Before this goes live with real client data, replace `db.js` with calls
to a real backend that:
1. Owns the user and invite tables in an actual database (e.g.
   Postgres/MySQL), not `localStorage`.
2. Hashes passwords server-side and never stores them in plain text.
3. Issues a signed, server-validated session (e.g. HTTP-only cookie or
   JWT) after login.
4. Checks the caller's role/session on every request that returns a
   client's documents — not just at the login screen.

The `users.seed.json` / `invites.seed.json` shape in this folder is a
reasonable starting point for that backend's table design.
