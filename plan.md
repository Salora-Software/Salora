## Plan: Cloudflare Queue Email Pipeline

Build a Cloudflare Queue based email pipeline that keeps request-time TRPC mutations lightweight, uses organization SMTP first with fallback SMTP from env, and minimizes sensitive data in queue messages by passing IDs only. The implementation keeps your existing template and communication-setting model while replacing Redis/Bun worker flow with Worker-native producer/consumer logic.

**Steps**

1. Phase 1: Define shared queue contract and boundaries
2. Create a shared package/module for queue message types and validation schema (e.g. `EmailQueueMessageV1` with `jobId`, `organizationId`, `templateType`, `targetType`, `targetId`, `locale`, `initiatorUserId`, `createdAt`, `attempt`).
3. Add strict zod validation for inbound queue payload in the consumer; reject malformed messages early and throw typed errors for retryable vs non-retryable cases.
4. Keep message payload PII-minimized: include only IDs and template/event metadata; do not include rendered body or SMTP credentials in queue payload.
5. Phase 2: Add queue producer in frontend worker flow
6. Add a Queue binding in `apps/frontend/wrangler.jsonc` for producer usage (e.g. `EMAIL_QUEUE`) and map environment-specific queue names.
7. Refactor email-triggering procedures in `apps/frontend/src/lib/server/trpc/routers/v1/authenticated/communication/router.ts` so they enqueue jobs instead of sending directly (including current `sendTestEmail` path).
8. Introduce an `EmailDispatchService` abstraction in frontend server code that maps business events to queue messages and centralizes idempotency key generation (`jobId`/dedupe key).
9. Preserve current business checks (organization existence, communication settings presence) at enqueue time only where needed for user feedback; leave final send decisions to consumer.
10. Phase 3: Build Cloudflare Queue consumer worker
11. Convert `apps/email-worker` from Bun Redis loop to Cloudflare Worker queue consumer (`export default { async queue(batch, env, ctx) {} }`).
12. Add `apps/email-worker/wrangler.jsonc` with queue consumer binding, compatibility config, and required secrets for fallback SMTP.
13. For each queue message: resolve organization communication settings from DB, pick org SMTP if enabled/valid, otherwise use fallback SMTP env credentials.
14. Render template in consumer via `@salora/emails` (or template DB body when configured), then send using `@salora/mailer` transport path.
15. Implement deterministic provider selection order: org SMTP first; fallback SMTP second; fail message if both unavailable.
16. Phase 4: Simplify mailer package for Worker-native transport
17. Refactor `packages/mailer/src/index.ts` to separate concerns: remove Redis queue coupling from `Emailer`; keep transport-only API (`sendViaSmtpProviders` or similar).
18. Add a small adapter layer in `packages/mailer` to accept provider list and attempt index; return structured result (`sent`, `provider`, `errorCode`, `retryable`).
19. Keep retry policy owned by Queue semantics: consumer throws on retryable failures and explicitly handles non-retryable errors without endless retries.
20. Phase 5: Retry, fallback, and operational hardening
21. Configure Queue retry/backoff in Cloudflare with sane max retries; add Dead Letter Queue only if later needed (excluded from v1 implementation).
22. Add idempotency protection with a short-lived dedupe store (D1 table or KV key by `jobId`) to tolerate at-least-once delivery without duplicate sends.
23. Add structured logging fields across producer/consumer (`jobId`, `organizationId`, `templateType`, `providerUsed`, `attempt`, `outcome`) for production diagnosis.
24. Add timeouts and error classification for SMTP failures (auth, DNS/network, throttling) to improve retry decisions.
25. Phase 6: Rollout and migration
26. Introduce a feature flag/env switch in frontend to choose Redis legacy path vs Queue path during rollout.
27. Run dual-path staging validation (enqueue + send through queue) and remove legacy Redis worker usage after successful burn-in.
28. Decommission Redis email queue code in `apps/email-worker/index.ts` and queue-related Redis interfaces in `packages/mailer` once production cutover is stable.

**Relevant files**

- `/root/Salora/apps/frontend/src/lib/server/trpc/routers/v1/authenticated/communication/router.ts` — replace direct send orchestration with queue enqueue calls and keep validation/user-facing errors.
- `/root/Salora/apps/frontend/wrangler.jsonc` — add producer queue binding and environment mapping.
- `/root/Salora/apps/frontend/src/app.d.ts` (or worker env types file) — add typed `EMAIL_QUEUE` binding in runtime env.
- `/root/Salora/apps/email-worker/index.ts` — replace Bun Redis loop with Cloudflare Queue consumer handler.
- `/root/Salora/apps/email-worker/package.json` — switch scripts to Wrangler worker dev/deploy workflow.
- `/root/Salora/apps/email-worker/wrangler.jsonc` — new Worker config with queue consumer binding and secrets references.
- `/root/Salora/packages/mailer/src/index.ts` — remove queue producer dependency and keep pure SMTP failover transport logic.
- `/root/Salora/packages/emails/src/renderEmail.ts` — keep as rendering entrypoint and enforce template input validation usage.
- `/root/Salora/packages/database/src/db/schema.ts` — reuse `communication_setting` for org SMTP config; optionally add minimal dedupe table if D1 idempotency is chosen.
- `/root/Salora/packages/trpc-types/src/**` (or new shared package path) — shared queue event/message type contracts for producer and consumer.

**Verification**

1. Local dev: run frontend worker and email-worker consumer with Wrangler queue simulation; enqueue from `sendTestEmail` and verify consumer receives and sends.
2. Unit tests: validate queue message schema parsing, provider resolution order (org first, fallback second), and retryable/non-retryable classification.
3. Integration tests: enqueue with missing org SMTP and confirm fallback SMTP sends successfully.
4. Failure test: provide invalid org SMTP credentials and verify fallback path executes; if fallback fails, message retries according to queue policy.
5. Idempotency test: submit same `jobId` twice and verify only one email is sent.
6. Security check: inspect queue payload logs and confirm no SMTP passwords, raw body HTML, or unnecessary PII are included.
7. Production readiness check: verify structured logs include `jobId` and provider outcome for each attempt.

**Decisions**

- Included: Cloudflare Queue architecture, SMTP-first provider selection, fallback SMTP from env, minimized payload with ID-based lookup in consumer.
- Excluded: full audit-trail pipeline and mandatory DLQ analytics in v1, per your preference to avoid heavy audit requirements.
- Assumption: existing DB access from Worker environment is available for consumer-side lookup of organization communication settings and template data.
- Assumption: at-least-once semantics are acceptable when protected by idempotency key checks.

**Further Considerations**

1. Idempotency backend recommendation: D1 table for deterministic dedupe across regions and restarts; KV is acceptable for simpler setup with eventual consistency tradeoff.
2. Template source recommendation: keep DB-managed body/subject for current UX, but introduce a typed template registry for critical transactional emails over time.
3. Optional phase-2 hardening: add Dead Letter Queue and replay tooling after initial production stability is confirmed.
