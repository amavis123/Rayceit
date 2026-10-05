# AGENTS.md

Operational guide only — how to build/run this project. Status, progress,
and what-to-build-next live in `IMPLEMENTATION_PLAN.md`. Full decision
history/why lives in `racyeit.md`. Current-state specs live in `specs/*.md`.

## Build & Run

Monorepo: pnpm workspaces + Turborepo. Three apps: `apps/customer` (:3002),
`apps/merchant` (:3003), `apps/backend` (:3001, NestJS + Prisma).

```bash
pnpm install                              # from repo root, once
cd apps/backend && npx prisma dev         # starts local Postgres (no install, no account)
# copy the DATABASE_URL it prints into apps/backend/.env
cd apps/backend && npx prisma generate && npx prisma db push
pnpm --filter backend run start:dev       # or customer / merchant
```

Each app needs its own `.env` / `.env.local` — copy from the `.env.example`
/ `.env.local.example` in that app's folder.

## Validation

- Build (per app): `pnpm run build` inside `apps/customer`, `apps/merchant`,
  or `apps/backend`.
- No automated test suite exists yet — `build` passing is the only
  backpressure today. Treat a clean `pnpm run build` as necessary, not
  sufficient; verify behavior in the browser for anything user-facing.
- Prisma schema changes: `npx prisma db push` (don't use `migrate dev` —
  the `prisma dev` shadow database gets into a stale state easily; `db push`
  sidesteps it). Adding a required column needs existing rows cleared or
  backfilled first.

## Operational Notes

- Third-party accounts already set up: Clerk (real keys, both apps), a local
  `prisma dev` Postgres. **Not** set up: Stripe (`STRIPE_SECRET_KEY` is a
  placeholder — founder's call to defer), real push notifications untested.
  See `IMPLEMENTATION_PLAN.md` Priority 1.
- Prisma 7 requires a driver adapter (`@prisma/adapter-pg`) passed to
  `PrismaClient` — a bare `new PrismaClient()` throws. Datasource `url`
  lives in `prisma.config.ts`, not in `schema.prisma`.
- Clerk's Next.js SDK is on "Core 3": `<SignedIn>`/`<SignedOut>`/`<Protect>`
  are removed, throw at runtime if used. Use `<Show when="signed-in">` /
  `<Show when="signed-out">` instead.
- `@clerk/backend@3.22.0`'s declared types for `verifyToken()` don't match
  its runtime return shape (types say `{data, errors}`, runtime returns the
  payload directly). `ClerkAuthGuard` handles both shapes defensively —
  don't "fix" it back to trusting the types without testing a real sign-in.
- Next.js 16 renamed `middleware.ts` → `proxy.ts` (function name `middleware`
  → `proxy`).
- Always verify auth-touching backend changes by actually signing in as a
  live test user in the browser — a clean build/boot does not catch a
  types-vs-runtime mismatch like the one above.

## Codebase Patterns

- Order creation has exactly one code path: `OrdersService.createStopOrder`,
  called once per stop by `RacesService.createRace`. A single-stop order is
  a one-stop Race — don't reintroduce a separate "simple order" path.
- Status changes always go through `OrdersService.applyStatusChange`, which
  also checks race auto-completion and fires push notifications. Don't
  update `Order.status` via Prisma directly from a new call site.
