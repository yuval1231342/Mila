# Mila – AI platform (v0.1 foundation)

Next.js 14 + TypeScript + Tailwind + PostgreSQL. Own session auth (bcrypt, hashed tokens in DB).

## Install
```bash
cp .env.example .env      # fill values; see below
npm install
npm run migrate           # applies db/schema.sql
node scripts/seed-legal.mjs   # DRAFT skeleton legal docs (not legal text)
npm run dev
```
Make a super admin: register normally, then `UPDATE users SET role='super_admin' WHERE email='you@x.com';`
Enable a model: `INSERT INTO ai_models(id,provider,model,label,min_plan,enabled) VALUES ('anthropic:<model-id>','anthropic','<model-id>','Label','free',true);`
and set `DEFAULT_MODEL` to the same id. Required env: `DATABASE_URL, SESSION_SECRET, APP_URL, MIN_AGE`, plus at least one AI key.

## Verified in this session (real run, local Postgres 16)
- `next build` passes (fonts use a system stack, no external download); tests ran against `next start` (production mode).
- `tsc --noEmit` clean; schema applies; pages /, /login, /register, /legal, /legal/terms, /accessibility render (200).
- 8/8 integration tests pass (`npm test` against a running server): CSRF origin check, cross-user conversation isolation (read+delete), 401 when signed out, chat refuses (503) when model/provider unconfigured, privacy request recorded, consent withdrawal, cancel without subscription.

## NOT verified / NOT built (be honest before launch)
**Never run:** real calls to Anthropic/OpenAI/Google (streaming code is written, untested with live keys); phone/real-device checks; accessibility audit (no axe/manual screen-reader test); load/security testing.
**Not built:** email verification & password reset, 2FA for admins, Google OAuth, profile/settings/history/explore/help/contact pages, avatar, device list & "log out everywhere", account deletion flow, file upload + scanning + parsing, CODE mode (editor, preview, sandbox), IMAGE mode, Stripe/Israeli payments + webhooks + invoices, subscription purchase & billing pages, refund flow, admin management forms (users, plans, models, legal doc editor/versioning UI, incidents, copyright complaints form, DPO module, data-transfer registry UI), re-acceptance prompt on material legal change, country-specific terms layer, SEO (sitemap/robots/metadata per page), bot protection, retention/deletion jobs, backups, tests for most compliance items (accessibility, cookie-before-consent, etc.).
Schema tables for most of these already exist (db/schema.sql) so they can be built on top.
**Cookie banner:** stores choice in localStorage; no analytics/marketing scripts exist in the code, and any added later must check `hasCookieConsent()`.
**Legal:** every document is an empty draft skeleton. Nothing here is legal advice or a compliance claim. Section 18 (current-law research with official sources) has not been done.

## Notes
- In production, registration is refused until legal documents are PUBLISHED (state='published'); there is no admin editor yet, so after a lawyer approves the text:
  `UPDATE legal_document_versions SET state='published', published_at=now(), effective_at=now() WHERE ...;`
- Rate limits are real (register 10/hour/IP). When re-running tests, clear them first: `TRUNCATE rate_limits;` (test DB only).
- Fixed this round: build failure (invalid export from a page file), external font download dependency, invalid dummy bcrypt hash in login.
