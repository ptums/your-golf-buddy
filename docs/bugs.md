# Bugs

## Web

- Mobile: fix orange button component

## PWA

- Weird delete & home list functionality

## Mobile

_(not started)_

## Sync (web ⇄ profile-sync)

### Fixed (Sept 2026)

Sync was completely non-functional — nothing ever reached the server.

- `performSync()` short-circuited on `/sync/state` returning `{inSync:true}`. A
  cursor-only comparison reports "in sync" whenever both sides look empty, so a
  client with local data and null cursors never pushed. Now it always pushes
  (idempotent upserts) then pulls.
- The "Sync completed" toast was stuck on — `golf_buddy_sync_status` stayed
  `"success"` and `SyncNotification` re-showed it every 2 s poll. Now it fires
  once per sync via a `golf_buddy_last_success` timestamp.
- `applyChanges()` did `db.courses.bulkPut(serverRows)` — UUID ids + snake_case
  into Dexie's numeric keyspace. Rewritten to map server rows to the local
  shape, keyed by `external_id` → local numeric id, with tombstone deletes.
- `/sync/pull` now includes `course_external_id` on games and
  `game_external_id` on scores so the client can resolve local ids.

### Still weak (needs a deliberate design pass, not urgent)

- Local Dexie `++id` autoincrement ids are not globally unique, so a *new* row
  created on device B can collide with an existing id on device A when pulled.
  True multi-device needs the server UUID as the canonical local key.
- `collectSyncData()` sends whole tables on every push rather than a delta —
  fine for one user, wasteful at scale.
- Recovery depends on the user saving their profile key (Settings shows it, and
  `/profile-registration` has a restore flow). Nothing recovers the data if they
  never copied the key — there's no email/password fallback by design.
