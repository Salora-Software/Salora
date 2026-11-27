<!--
  PRODUCTION MIGRATION RUNBOOK
  ============================================================================
  PRE-FLIGHT (do these first)
  - Update `.env` and `wrangler.jsonc` so the `prod` environment points at the
    REAL production D1 database. It currently points at `salora-migrate-test`
    (id 8d216c04-0f72-4f32-a614-2302798af42c) — confirm that is the database
    you actually want to change.
  - Fix the D1 migration bookkeeping BEFORE using `wrangler d1 migrations apply`
    (see "Migration history" at the bottom). Until then, use the manual fallback
    in step 3.
  - Take a backup (step 0). Never run data changes without one.
  ============================================================================
-->

# Production migration runbook

## TL;DR for this release (auth/session performance)

Run these in order. **Step 2 is only needed if `0007`/`0008` have not been
applied yet** — skip it if prod is already on the latest table definitions.

1. **Backup** (step 0)
2. **Dedupe `user.email`** (step 1) — required before the unique index
3. **Apply `0009_pale_scream.sql`** (step 3)
4. **Verify indexes** (step 4)
5. _(optional)_ delete expired sessions (step 5)
6. **Deploy the worker + watch logs** (step 6)

The indexes are non-destructive and fast to create (tables are only a few
thousand rows). No downtime is expected.

## 0. Backup production first

```bash
cd packages/database
mkdir -p backups
npx wrangler d1 export DB --remote --env prod \
  --output=./backups/prod-$(date +%Y%m%d-%H%M%S).sql
```

## 1. Dedupe duplicate `user.email` rows (do this FIRST)

Migration `0009_pale_scream.sql` and the updated schema add `user_email_unique`.
Production currently contains duplicate `user.email` values (e.g.
`nathaliaperquin@gmail.com` appears 5 times), so **anything that creates the
unique index (including `bun db:push`) will fail** until those rows are merged.

Preview the duplicates (read-only):

```bash
npx wrangler d1 execute DB --remote --env prod --command \
  'SELECT email, COUNT(*) AS n FROM "user" GROUP BY email HAVING n > 1 ORDER BY n DESC;'
```

Review `./scripts/dedupe-user-emails.sql`. It keeps **one** user per email
(preferring a user that has an `account` or `member` row, otherwise the oldest),
repoints `session`, `account`, `member`, `customer`, `invitation`, `booking` and
`note` rows to the kept user, then deletes the duplicates. It also includes a
preview SELECT and a final "duplicates remaining" SELECT, so a `--file` run
prints before/after counts.

Apply it:

```bash
npx wrangler d1 execute DB --remote --env prod --file=./scripts/dedupe-user-emails.sql
```

> D1 does **not** allow `BEGIN`/`COMMIT` (or temp tables) in `d1 execute`.
> The script avoids them and relies on D1 applying the uploaded file atomically:
> if it fails, the database is rolled back and you can safely retry.
>
> If you see `state.storage.transaction()` / `BEGIN TRANSACTION`, you are
> running an older copy of the script — use the current
> `scripts/dedupe-user-emails.sql`.

Confirm nothing is left (should return `remaining = 0`):

```bash
npx wrangler d1 execute DB --remote --env prod --command \
  'SELECT COUNT(*) AS remaining FROM (SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1);'
```

> If you do **not** want to dedupe, remove the `user_email_unique` index from
> `src/db/schema.ts` **and** `0009_pale_scream.sql` (otherwise `bun db:push` will
> recreate it). Every other index is non-destructive and safe.

## 2. Apply pending table changes (0007 / 0008 — only if needed)

**Skip this step if `0007`/`0008` are already applied.** This is the previous
release's flow, kept for completeness:

```bash
cd packages/database
npx wrangler d1 execute DB --remote --env prod --file=./safe-migration.sql
bun db:push
```

> `bun db:push` compares the live schema and may also create the new indexes from
> step 3 (and the unique email index from step 1). That is fine now that the
> duplicates are gone. Verify with step 4.

## 3. Apply the performance indexes (0009) if not already created

**Preferred** — once migration bookkeeping is fixed (see bottom), so that `0009`
is the only pending migration:

```bash
npx wrangler d1 migrations apply DB --remote --env prod
```

**Fallback** — bookkeeping not fixed yet. Run the SQL directly, then record it so
a later `migrations apply` does not try to run it again:

```bash
npx wrangler d1 execute DB --remote --env prod --file=./drizzle/0009_pale_scream.sql

npx wrangler d1 execute DB --remote --env prod --command \
  "INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0009_pale_scream.sql');"
```

> `0009_pale_scream.sql` uses `CREATE ... INDEX IF NOT EXISTS`, so it can be
> re-run safely if a previous run failed partway (e.g. because step 1 was not
> done yet). It is non-destructive: no rows are modified.

## 4. Verify the indexes exist

```bash
npx wrangler d1 execute DB --remote --env prod --command \
  "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_autoindex%' ORDER BY tbl_name;"
```

Expected (plus the pre-existing `communication_setting_org_type_idx`):

| Table         | Index                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------- |
| session       | `session_token_unique` (unique), `session_userId_idx`                                     |
| user          | `user_email_unique` (unique)                                                              |
| account       | `account_userId_idx`                                                                      |
| verification  | `verification_identifier_idx`                                                             |
| member        | `member_organizationId_userId_unique` (unique)                                            |
| customer      | `customer_organizationId_idx`, `customer_email_organizationId_idx`, `customer_userId_idx` |
| booking       | `booking_customerId_idx`, `booking_organizationId_idx`                                    |
| calendar_item | `calendar_item_organizationId_type_idx`                                                   |
| note          | `note_customerId_idx`                                                                     |
| organization  | `organization_slug_idx`                                                                   |

> `customer_email_organizationId_idx` is intentionally **non-unique**: production
> already has duplicate customer emails within the same organization, so a unique
> index would fail. It still gives the same lookup speed.

## 5. Optional: delete expired sessions

Production has many expired sessions (only a few are live). This is safe and
idempotent:

```bash
npx wrangler d1 execute DB --remote --env prod --file=./scripts/cleanup-expired-sessions.sql
```

## 6. Deploy the worker and watch the logs

```bash
cd /root/Salora
bun run deploy          # build + deploy prod  (or: bun run deploy:ci)

npx wrangler tail salora-frontend --env prod --format pretty
```

Then open `/customers`, paginate, and search. Watch for
`INTERNAL_SERVER_ERROR` / `FAILED_TO_GET_SESSION` / D1 errors. After the indexes
and auth changes they should be gone; if a D1 error still appears, the message in
`wrangler tail` is now the real cause (better-auth only wraps it).

## Migration history — read before step 3

Production's `d1_migrations` table currently records only `0000_right_tusk.sql`,
while the repo chain is `0000` … `0009`. Running
`wrangler d1 migrations apply` in that state will try to re-apply `0001`–`0008`
and fail. Reconcile the bookkeeping (mark already-applied migrations as applied)
before using it; otherwise stay on the fallback in step 3 and record only
`0009_pale_scream.sql`.

Check the current state with:

```bash
npx wrangler d1 execute DB --remote --env prod --command \
  "SELECT id, name, applied_at FROM d1_migrations ORDER BY id;"
```

> The repo has been migrated with both `d1_migrations` (wrangler) and
> `__drizzle_migrations` (drizzle-kit) at different times. Prefer `d1_migrations`
> as the source of truth for `wrangler d1 migrations apply`.

## Troubleshooting

- **`UNIQUE constraint failed: user.email`** when creating indexes → step 1 was
  skipped or did not finish. Run the dedupe script, then re-run step 3 (safe to
  retry thanks to `IF NOT EXISTS`).
- **`index ... already exists`** → the statement was already applied; the current
  script uses `IF NOT EXISTS`, so this should not happen anymore.
- **`BEGIN TRANSACTION` / `state.storage.transaction()`** → older dedupe script;
  use the current one (it has no explicit transaction).
- **"This process may take some time…" prompt** → D1 briefly makes the database
  read-only while applying the batch. Expect a few seconds; retry if interrupted.

## Rollback

```bash
# Indexes are non-destructive and can be dropped individually:
npx wrangler d1 execute DB --remote --env prod --command "DROP INDEX IF EXISTS user_email_unique;"

# If dedupe/session cleanup changed data, restore the step 0 backup.
# Worker rollback:
npx wrangler rollback --env prod
```
