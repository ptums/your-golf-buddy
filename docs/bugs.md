# Bugs

## Web

- Mobile: fix orange button component
- Sync alert bug — the "sync complete" notification sometimes fires on a no-op sync

## PWA

- Weird delete & home list functionality

## Mobile

_(not started)_

## Sync contract (web ⇄ profile-sync)

Carried over from the Laravel version — **not** regressions from the TypeScript
rewrite. The rewrite matches the previous behaviour on purpose.

- `apps/web/lib/cloud-sync.ts` `applyChanges()` calls `db.courses.bulkPut()` with
  raw server rows: string UUID `id` into Dexie's numeric autoincrement keyspace,
  snake_case fields the local schema doesn't use. Pulled rows don't merge cleanly
  into local state.
- The client never sends its cursors up on the very first sync, and
  `collectSyncData()` sends whole tables every push rather than a delta.
- Fixing these means normalising the client ⇄ server shape (the `@ygb/shared`
  zod schemas are the place to do it) and teaching `applyChanges` to reconcile
  by `external_id`.
