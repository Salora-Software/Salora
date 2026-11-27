-- Deletes sessions that have already expired.
--
-- In src/db/schema.ts, session.expiresAt is:
--   integer({ mode: "timestamp" }).notNull()
-- Drizzle's SQLite "timestamp" mode stores UNIX time in SECONDS, and the
-- common createdAt/updatedAt defaults use `unixepoch()`. So compare against
-- `unixepoch()` (seconds), NOT milliseconds or `unixepoch('subsec')`.
--
-- Safe to run repeatedly. Nothing in this repository executes this file
-- automatically; review and run it manually if/when desired.
DELETE FROM session
WHERE expiresAt < unixepoch();
