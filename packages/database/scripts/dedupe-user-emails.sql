-- ============================================================================
-- MUST BE REVIEWED AND RUN MANUALLY BY THE USER **BEFORE** THE UNIQUE
-- `user_email_unique` INDEX (migration 0009_pale_scream.sql) CAN BE APPLIED.
--
-- Production currently contains duplicate `user.email` values (for example
-- nathaliaperquin@gmail.com appears 5 times). Creating the UNIQUE index will
-- fail until those duplicates are merged/removed.
--
-- Tables that reference `user.id` (verified in src/db/schema.ts):
--   session.userId, account.userId, member.userId, invitation.inviterId,
--   customer.userId, booking.userId, note.authorId
--
-- D1 NOTE: `wrangler d1 execute --file` does NOT allow `BEGIN`/`COMMIT` (or
-- SAVEPOINT), and temporary tables are not supported. Wrangler applies the
-- whole uploaded file atomically: if execution fails, the database is rolled
-- back, so this file is safe to retry.
--
-- This file is NOT executed automatically by anything in this repository.
-- Review it, run the preview query, then run the apply statements.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) PREVIEW (read-only): every row whose email is duplicated.
--
--    For a cleaner CLI preview, run this separately:
--      npx wrangler d1 execute DB --remote --env prod --command \
--        "SELECT \"user\".email, \"user\".id, datetime(\"user\".createdAt,'unixepoch') AS createdAtUtc FROM \"user\" WHERE email IN (SELECT email FROM \"user\" GROUP BY email HAVING COUNT(*)>1) ORDER BY email, createdAt;"
-- ----------------------------------------------------------------------------
SELECT
  u.email,
  u.id,
  u.createdAt,
  datetime(u.createdAt, 'unixepoch') AS createdAtUtc,
  (SELECT COUNT(*) FROM account a WHERE a.userId = u.id) AS accountRows,
  (SELECT COUNT(*) FROM member m WHERE m.userId = u.id) AS memberRows
FROM "user" u
WHERE u.email IN (
  SELECT email
  FROM "user"
  GROUP BY email
  HAVING COUNT(*) > 1
)
ORDER BY u.email, u.createdAt, u.id;

-- ----------------------------------------------------------------------------
-- 2) APPLY. For each duplicate email this keeps ONE user id:
--    - prefer a user that has an account or member row;
--    - otherwise (or on ties) keep the OLDEST row (tie-break by id).
--    It repoints all known references from duplicate ids to the kept id, then
--    deletes the duplicate `user` rows.
--
--    REVIEW THE PREVIEW ABOVE FIRST.
-- ----------------------------------------------------------------------------

-- session.userId
WITH ranked AS (
  SELECT
    u.id,
    u.email,
    ROW_NUMBER() OVER (
      PARTITION BY u.email
      ORDER BY
        CASE
          WHEN EXISTS (SELECT 1 FROM account a WHERE a.userId = u.id)
            OR EXISTS (SELECT 1 FROM member m WHERE m.userId = u.id)
          THEN 0
          ELSE 1
        END,
        u.createdAt ASC,
        u.id ASC
    ) AS rn
  FROM "user" u
  WHERE u.email IN (
    SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1
  )
),
keep AS (
  SELECT email, id AS keepId FROM ranked WHERE rn = 1
),
map AS (
  SELECT u.id AS dupId, k.keepId
  FROM "user" u
  JOIN keep k ON k.email = u.email
  WHERE u.id <> k.keepId
)
UPDATE session
SET userId = (SELECT m.keepId FROM map m WHERE m.dupId = session.userId)
WHERE userId IN (SELECT dupId FROM map);

-- account.userId
WITH ranked AS (
  SELECT
    u.id,
    u.email,
    ROW_NUMBER() OVER (
      PARTITION BY u.email
      ORDER BY
        CASE
          WHEN EXISTS (SELECT 1 FROM account a WHERE a.userId = u.id)
            OR EXISTS (SELECT 1 FROM member m WHERE m.userId = u.id)
          THEN 0
          ELSE 1
        END,
        u.createdAt ASC,
        u.id ASC
    ) AS rn
  FROM "user" u
  WHERE u.email IN (
    SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1
  )
),
keep AS (
  SELECT email, id AS keepId FROM ranked WHERE rn = 1
),
map AS (
  SELECT u.id AS dupId, k.keepId
  FROM "user" u
  JOIN keep k ON k.email = u.email
  WHERE u.id <> k.keepId
)
UPDATE account
SET userId = (SELECT m.keepId FROM map m WHERE m.dupId = account.userId)
WHERE userId IN (SELECT dupId FROM map);

-- member.userId
WITH ranked AS (
  SELECT
    u.id,
    u.email,
    ROW_NUMBER() OVER (
      PARTITION BY u.email
      ORDER BY
        CASE
          WHEN EXISTS (SELECT 1 FROM account a WHERE a.userId = u.id)
            OR EXISTS (SELECT 1 FROM member m WHERE m.userId = u.id)
          THEN 0
          ELSE 1
        END,
        u.createdAt ASC,
        u.id ASC
    ) AS rn
  FROM "user" u
  WHERE u.email IN (
    SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1
  )
),
keep AS (
  SELECT email, id AS keepId FROM ranked WHERE rn = 1
),
map AS (
  SELECT u.id AS dupId, k.keepId
  FROM "user" u
  JOIN keep k ON k.email = u.email
  WHERE u.id <> k.keepId
)
UPDATE member
SET userId = (SELECT m.keepId FROM map m WHERE m.dupId = member.userId)
WHERE userId IN (SELECT dupId FROM map);

-- customer.userId
WITH ranked AS (
  SELECT
    u.id,
    u.email,
    ROW_NUMBER() OVER (
      PARTITION BY u.email
      ORDER BY
        CASE
          WHEN EXISTS (SELECT 1 FROM account a WHERE a.userId = u.id)
            OR EXISTS (SELECT 1 FROM member m WHERE m.userId = u.id)
          THEN 0
          ELSE 1
        END,
        u.createdAt ASC,
        u.id ASC
    ) AS rn
  FROM "user" u
  WHERE u.email IN (
    SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1
  )
),
keep AS (
  SELECT email, id AS keepId FROM ranked WHERE rn = 1
),
map AS (
  SELECT u.id AS dupId, k.keepId
  FROM "user" u
  JOIN keep k ON k.email = u.email
  WHERE u.id <> k.keepId
)
UPDATE customer
SET userId = (SELECT m.keepId FROM map m WHERE m.dupId = customer.userId)
WHERE userId IN (SELECT dupId FROM map);

-- invitation.inviterId
WITH ranked AS (
  SELECT
    u.id,
    u.email,
    ROW_NUMBER() OVER (
      PARTITION BY u.email
      ORDER BY
        CASE
          WHEN EXISTS (SELECT 1 FROM account a WHERE a.userId = u.id)
            OR EXISTS (SELECT 1 FROM member m WHERE m.userId = u.id)
          THEN 0
          ELSE 1
        END,
        u.createdAt ASC,
        u.id ASC
    ) AS rn
  FROM "user" u
  WHERE u.email IN (
    SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1
  )
),
keep AS (
  SELECT email, id AS keepId FROM ranked WHERE rn = 1
),
map AS (
  SELECT u.id AS dupId, k.keepId
  FROM "user" u
  JOIN keep k ON k.email = u.email
  WHERE u.id <> k.keepId
)
UPDATE invitation
SET inviterId = (SELECT m.keepId FROM map m WHERE m.dupId = invitation.inviterId)
WHERE inviterId IN (SELECT dupId FROM map);

-- booking.userId
WITH ranked AS (
  SELECT
    u.id,
    u.email,
    ROW_NUMBER() OVER (
      PARTITION BY u.email
      ORDER BY
        CASE
          WHEN EXISTS (SELECT 1 FROM account a WHERE a.userId = u.id)
            OR EXISTS (SELECT 1 FROM member m WHERE m.userId = u.id)
          THEN 0
          ELSE 1
        END,
        u.createdAt ASC,
        u.id ASC
    ) AS rn
  FROM "user" u
  WHERE u.email IN (
    SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1
  )
),
keep AS (
  SELECT email, id AS keepId FROM ranked WHERE rn = 1
),
map AS (
  SELECT u.id AS dupId, k.keepId
  FROM "user" u
  JOIN keep k ON k.email = u.email
  WHERE u.id <> k.keepId
)
UPDATE booking
SET userId = (SELECT m.keepId FROM map m WHERE m.dupId = booking.userId)
WHERE userId IN (SELECT dupId FROM map);

-- note.authorId
WITH ranked AS (
  SELECT
    u.id,
    u.email,
    ROW_NUMBER() OVER (
      PARTITION BY u.email
      ORDER BY
        CASE
          WHEN EXISTS (SELECT 1 FROM account a WHERE a.userId = u.id)
            OR EXISTS (SELECT 1 FROM member m WHERE m.userId = u.id)
          THEN 0
          ELSE 1
        END,
        u.createdAt ASC,
        u.id ASC
    ) AS rn
  FROM "user" u
  WHERE u.email IN (
    SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1
  )
),
keep AS (
  SELECT email, id AS keepId FROM ranked WHERE rn = 1
),
map AS (
  SELECT u.id AS dupId, k.keepId
  FROM "user" u
  JOIN keep k ON k.email = u.email
  WHERE u.id <> k.keepId
)
UPDATE note
SET authorId = (SELECT m.keepId FROM map m WHERE m.dupId = note.authorId)
WHERE authorId IN (SELECT dupId FROM map);

-- Finally delete the duplicate `user` rows (one keeper per email remains).
WITH ranked AS (
  SELECT
    u.id,
    u.email,
    ROW_NUMBER() OVER (
      PARTITION BY u.email
      ORDER BY
        CASE
          WHEN EXISTS (SELECT 1 FROM account a WHERE a.userId = u.id)
            OR EXISTS (SELECT 1 FROM member m WHERE m.userId = u.id)
          THEN 0
          ELSE 1
        END,
        u.createdAt ASC,
        u.id ASC
    ) AS rn
  FROM "user" u
  WHERE u.email IN (
    SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1
  )
),
keep AS (
  SELECT email, id AS keepId FROM ranked WHERE rn = 1
)
DELETE FROM "user"
WHERE id IN (
  SELECT u.id
  FROM "user" u
  JOIN keep k ON k.email = u.email
  WHERE u.id <> k.keepId
);

-- ----------------------------------------------------------------------------
-- 3) VERIFY (read-only): should return 0.
-- ----------------------------------------------------------------------------
SELECT COUNT(*) AS remaining_duplicate_emails
FROM (
  SELECT email FROM "user" GROUP BY email HAVING COUNT(*) > 1
);
