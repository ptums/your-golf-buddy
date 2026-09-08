# Identity & Accounts

Your Golf Buddy has **no accounts and no third-party auth**. Earlier experiments
with Clerk (`hybrid-auth.md`) and a local JWT system (`authentication.md`) were
both abandoned — those docs have been removed. This is the current design.

## Anonymous local profile

On first visit the web app asks for a **username** and **date of birth**, then
creates a single local profile:

- Stored in a dedicated IndexedDB database `GolfBuddyProfiles`
  (`apps/web/lib/profile-db.ts`).
- Shape: `{ id: uuid, username, dobHash, createdAt, lastActiveAt }`. The DOB is
  stored **only as a hash** (`dobHash`) — the raw date is never persisted.
- The `id` and `username` are mirrored into `localStorage`
  (`golf_buddy_profile_id`, `golf_buddy_username`) for quick reads.

`apps/web/app/page.tsx` routes to `/games` when a profile exists, otherwise to
`/profile-registration`.

## How data is scoped

All round data (`courses`, `games`, `scores`) is tagged with `profileId` and
lives in a second IndexedDB database, `ScoreCardNotes` (`apps/web/lib/db.ts`).

## How sync uses it

When cloud sync is enabled, the client sends its profile UUID as
`Authorization: Bearer <profileId>` on every request to
[`services/profile-sync`](../services/profile-sync). The service treats that
UUID as a **capability token** — 122 bits of entropy, so knowing it is the only
way to touch that profile's rows — validates it, rate-limits per token, and
scopes every read and write to it. No accounts, no passwords.

The trade-offs of the capability model:

- If the UUID leaks (a shared device, a screenshot, logs), that data is exposed.
- There's no recovery: lose the UUID and the server data is unreachable. The web
  app should let the user view and re-enter their profile key.
- `POST /sync/delete` hard-removes all server rows for the token.

## If real accounts are ever needed

Put an identity provider (passkeys, email magic links, Cloudflare Access) in
front, map the authenticated user to a stable id, and use that as `profile_id`.
The schema already scopes everything by `profile_id`, so the data model doesn't
change.
