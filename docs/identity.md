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

When cloud sync is enabled, the profile (including its client-generated UUID) is
pushed to [`services/profile-sync`](../services/profile-sync), which keys every
row by `profile_id`. The service is single-user and unauthenticated — it trusts
the client's profile id. See its README for the security caveats.

## If real auth is ever needed

Add it at the edge in front of `services/profile-sync` (a bearer token check in
the Hono app, or Cloudflare Access) and carry a real user id instead of the
anonymous profile UUID. The sync schema already scopes everything by
`profile_id`, so the data model would not need to change.
