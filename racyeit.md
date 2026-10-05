# RAYCE IT — Project Memory

**Last updated:** 2026-10-03
**Status:** All 8 build steps from Section 10 are done. Steps 1–7 are fully live-tested end to end; step 8 (push notifications) is built and wired correctly but only partially verifiable — see its decision log entry. Database is seeded with real Church Street, Brighton businesses for demoing. This file is the single source of truth for product, technical, design, and commercial decisions — hand it to Claude Code at the start of any session so it can pick up where things left off.

## How to use this file

This is a living document, not a one-time spec. As decisions get made — in conversation with Claude, in conversation with Claude Code, or by the founder independently — this file should be updated, not replaced:

1. **Add new entries to the Decision Log** (dated, newest at the top) rather than silently editing old ones. If a decision reverses an earlier one, say so explicitly in the new entry ("Supersedes 2026-10-03 entry on X") rather than deleting the old line.
2. **Keep the reference sections below (Scope, Data Model, Tech Stack, Design System, Commercial Model) in sync** with the latest decision log entries — when a decision log entry changes the MVP scope, update the Scope table too, don't just leave it buried in the log.
3. **Open Questions is a parking lot, not a to-do list** — move an item out of it into the relevant section once it's actually decided, with a decision log entry recording when and what was decided.
4. Claude Code: read this whole file before starting any build or planning work in this repo. If something here is ambiguous or you need a product/design decision to proceed, stop and ask rather than guessing and silently encoding an assumption.

---

## 1. Vision

RAYCE IT gives any local business a "drive-through experience" without needing physical drive-through infrastructure. A customer browses a merchant's product catalog in the app, pays in-app, and drives to the merchant. The merchant sees the customer's live ETA and preps the order to be handed off curbside — no parking, no walking in.

The core differentiator is the **"Race"**: a customer can plan multiple pickups into one trip — coffee, dry cleaning, chemist, lunch on the way to a meeting — and the app sequences the stops, tracks live ETA to each in turn, and notifies each merchant individually as the customer approaches.

Two distinct products share one backend: a **customer app** (trip-planning, on-the-move, map-forward) and a **merchant dashboard** (glanceable counter/kitchen tool). They should look and feel different even though they're one company.

---

## 2. Decision Log

### 2026-10-03 — Step 8 build: web push notifications
Built real Web Push (the open browser standard — VAPID keys, not a paid push service) for both frontends: customer gets notified when their stop turns "ready", merchant gets notified when a customer is "approaching" (ETA ≤ 10 min, only once per stop — guarded by a new `Order.approachingNotifiedAt` field so it doesn't fire on every 15s location ping).

**What's new:**
- VAPID keypair generated locally (`npx web-push generate-vapid-keys` — a one-time, free, no-account keypair for the Web Push protocol itself, not a third-party service like Stripe/Clerk/Maps). Stored in `apps/backend/.env`.
- `PushModule`: `GET /push/vapid-public-key` (public), `POST /push/subscribe` (auth). `PushSubscription` model added to the schema, one row per browser/device.
- Service workers (`public/sw.js`, identical in both apps) handle the `push` and `notificationclick` events. An explicit opt-in "Enable notifications" button in both apps — same pattern as geolocation's "Start sharing" button, not an unprompted permission popup.
- `PushService.sendToUser()` never throws — a failed push can't break the order-status update or location-ping request that triggered it. Expired subscriptions (404/410 from the push service) get cleaned up automatically as they're hit.

**Verification is partial — worth knowing exactly what was and wasn't confirmed:** this automated test browser hard-denies the Notification permission prompt at the sandbox level (`Notification.permission` reads `"denied"` with no way to grant it — there's no real human to click "Allow" on the OS-level dialog). Confirmed working: the VAPID public-key endpoint responds, the service worker file is valid and registers successfully in a real browser, and the "Enable notifications" UI correctly detects and reports the denied-permission state rather than failing silently. **Not verified:** the actual subscribe round-trip (browser → backend → `PushSubscription` row) and actual push delivery (an OS notification appearing). Please test this one yourself on a real device/browser before relying on it — it's the one piece of the whole build that couldn't be fully proven end to end in this session.

### 2026-10-03 — Step 7 build: QR handover confirmation
Built and live-tested the dual pickup-confirmation mechanism from Section 3: a QR code plus a human-readable 6-digit code, either side can confirm.

**What's new:**
- `Order.confirmationCode` — a random 6-digit code generated at order creation, used by both confirmation paths.
- `POST /orders/:id/confirm-pickup` (customer) and `POST /orders/:id/confirm-handover` (merchant, requires the code) — both are just the existing `ready → collected` transition triggered from a different side, reusing the same `applyStatusChange` path (and therefore the same race-auto-complete logic) rather than being a separate state machine. **Interpretation call:** "dual" means either action alone confirms pickup, not that both are required sequentially — the spec didn't say explicitly, and requiring both would add real complexity for no clear demo benefit. Revisit if that turns out to matter.
- Customer: a `HandoverCard` appears on the race timeline the moment a stop goes "ready" — shows a real client-generated QR code (`qrcode` package, encodes `orderId:confirmationCode`) plus the code as large text, and a "Confirm pickup" button.
- Merchant: two ways to confirm on a "ready" order — manual 6-digit code entry (always available, no camera needed) and a real camera-based QR scanner (`jsqr` decoding live video frames via `getUserMedia`, global "Scan to confirm pickup" button that auto-detects which order from the scanned code). The existing "Mark collected" button still works too as a no-verification manual override — kept for staff flexibility, not removed.
- Verified live end to end: walked an order to "ready", read the real QR-adjacent 6-digit code off the customer's screen, typed it into the merchant's manual entry field, confirmed the order flipped to "Collected" and the race to "complete" on both sides. (Camera scanning itself wasn't verified this way — no physical camera to point at a screen in this environment — but the manual-entry path exercises the same backend endpoint and code-matching logic the scanner calls.)

### 2026-10-03 — Step 6 build: live location + ETA
Built and live-tested real location sharing: the customer app uses the actual browser Geolocation API (not simulated data), and the backend turns that into a live ETA both sides can see.

**What's new:**
- `POST /races/:id/location-pings` (`RacesService.recordLocationPing`): records a real GPS ping, finds whichever stop is next (first non-terminal order by sequence), and computes distance to that merchant with the haversine formula — straight-line distance, not real road routing. No Google Maps/Distance Matrix API key is wired up (same "needs a real account" situation as Stripe) — assumes a flat 30 km/h average speed instead. Good enough to demo a live-updating number; swap for a real routing API once that's worth the cost. See `apps/backend/src/races/geo.ts`.
- Implements the Section 3 "prep trigger" exactly as specified: when the computed ETA drops to at or below the order's own prep time (snapshotted per item at order-creation time, alongside name/price), the order auto-advances `pending → preparing` with no merchant click needed.
- Customer: `LocationShare` component on the race timeline page — explicit "Start sharing" button (not an unprompted permission popup on page load), pings every 15s while the page stays open, shows "Arriving in ~X min". Confirms racyeit.md's known limitation in practice: this only works while the tab is open and foregrounded, by design (no background tracking in the MVP — that's a fast-follow, native-app territory).
- Merchant: order queue shows "Customer ~X min away" in amber on whichever order has a live ETA, reusing the existing 8s polling rather than adding a dedicated real-time channel — see the step 5 entry's precedent for reusing polling over building WebSockets at this stage.
- Verified live end to end with real (overridden/simulated, not hardcoded) GPS coordinates: started at ~3km from a merchant → saw "Arriving in ~6 min" on customer side and "Customer ~6 min away" on merchant side, matching the 30 km/h assumption exactly; moved to ~0.5km away → ETA dropped to ~1 min, which is under Flat White's 3-minute prep time, and the order auto-flipped to "Preparing" on both sides with no manual action.

### 2026-10-03 — Step 5 build: multi-stop Races
Built and live-tested the core differentiator: a customer can now add stops from multiple merchants into one Race, not just order from one shop at a time.

**What's new:**
- Backend refactor: order *creation* moved from `POST /orders` to `POST /races` (new `RacesModule`). A single-stop trip is just a one-stop Race — Section 5's rule — so there's exactly one creation code path now, not two. `OrdersService.createStopOrder()` is the shared per-stop logic both single- and multi-stop callers go through. `OrdersController` keeps read/update endpoints (`GET /orders/:id`, `PATCH /orders/:id/status`, etc.) since those operate on individual stops regardless of how the race was built.
- `GET /races/:id` returns every stop with its merchant, items, and payment — the customer-facing race-complete view.
- **Resolved the Section 8 open question** "should an unrealistic time budget block race creation or just warn?" → **warn, don't block.** `POST /races` compares a rough per-stop estimate (each stop's slowest item's prep time + a flat 5-minute buffer) against the customer's optional "done by" minutes and returns a `timeBudgetWarning` string when it looks tight, but still creates the race. No real drive-time model yet — that's step 6.
- A Race now auto-completes (`status: 'completed'`, `completedAt` set) the moment every one of its stops reaches a terminal status (collected/no_show/cancelled) — checked inside `OrdersService.updateStatusForMerchant`.
- Customer-side cart became a proper race builder (`src/lib/race.tsx`, renamed from the old single-merchant `cart.tsx`): adding an item from a new shop adds a new stop rather than replacing the cart. The `/cart` route is gone, replaced by `/race` (build/review) and `/races/[id]` (live timeline).
- Built "The Track" — the brand's signature visual (Section 6): a vertical checkpoint-and-line showing each stop filled/pulsing/hollow by status. Lives in `src/components/RaceTrack.tsx`, reused wherever a race's progress needs showing.
- **Known simplification, flagged on purpose:** combined payment "split per-merchant via Stripe Connect" for a multi-stop race is not really solved yet — each stop still gets its own independent Stripe Checkout Session attempt (reusing the single-stop logic), there's no UI to walk a customer through multiple sequential Stripe redirects for one race. Doesn't matter today since no seeded merchant has Stripe connected (100% demo mode), but will need real design work once Stripe testing starts and a race has 2+ Stripe-connected stops.
- Verified live: built a real 2-stop race (Pantry → Laundry Box, both real Church St merchants), set a deliberately-tight 5-minute time budget, confirmed the warning fired ("stops need roughly 23 min, your budget is 5 min"), and confirmed the Track correctly showed stop 1 as current/pulsing and stop 2 as upcoming/hollow.

### 2026-10-03 — Merchant order queue + real Church Street, Brighton demo data
Built the merchant order queue (part of step 4's lifecycle state machine) and seeded the database with three real local businesses for demo purposes.

**Order queue:**
- `GET /orders/mine` (merchant-scoped) and `PATCH /orders/:id/status` with a small allowed-transition map: `pending → preparing → ready → collected`, with `cancelled` available from pending/preparing and `no_show` from ready. No grace-period timers yet (that needs live ETA, step 6) — a merchant can act on any order at any valid stage manually.
- Merchant dashboard now shows "Incoming orders" above the catalog, flat/bordered cards with a left-edge colour stripe per Section 6 (amber = new/preparing, green = ready, Pit Complete green = collected, red = no-show), polling every 8 seconds. Polling, not WebSockets — fine for a demo, worth swapping for real-time later (step 6 territory anyway).
- Verified live: placed an order as a customer, watched it appear in the merchant queue, walked it through pending → preparing → ready with the right buttons and colours at each stage.

**Real demo data — Church Street, Brighton VIC 3186:** researched and seeded three real local businesses spanning the three target verticals, with real menus/prices and real logos pulled from their own websites (hotlinked, not re-hosted):
- **Pantry** (cafe), 1 Church St — 10 menu items from their actual published menu PDF, real logo.
- **Laundry Box Dry Cleaners** (dry cleaner), 109 Church St — 8 services from their real pricing page, real logo.
- **National Pharmacies** (chemist), 2 Church St — 5 real OTC supplement products with real prices from their online store; no logo found (their site blocks automated fetching) — shows the generic initial-letter fallback instead.
- Added `Merchant.logoUrl` (nullable) to the schema and display it in the customer app (merchant list + shop detail pages), with a circular initial-letter fallback when absent.
- Seeded via `apps/backend/prisma/seed.mjs` (plain Node/ESM script using the Prisma client directly, re-runnable without duplicating data) — not the Prisma CLI's built-in seed hook, kept simple since this was a one-off populate, not a repeatable fixture.
- **Worth knowing:** these are demo mockups, not real partnerships — none of these businesses have agreed to anything or created real RACE IT accounts (their "owner" Users have fake `seed_*` Clerk IDs that can't actually sign in). Useful for showing a business owner "here's what your shop would look like," not for presenting publicly as though they've joined. Also: dry cleaning's real turnaround (same/next day) doesn't naturally fit the "curbside wait while customer drives over" model prep times imply — used short placeholder prep times for schema consistency, but this vertical may need a different mental model before a real launch (flagging next to the existing chemist/dry-cleaner labor-cost risk in Section 2's known risks).

### 2026-10-03 — Product priority: build toward a demo, not a finished product
Founder's explicit framing: the near-term goal is something demoable to both merchants and customers, to gauge interest from both sides of the marketplace — not a production-grade build. "We will likely make huge technical changes to the solution later down the track."

**How this is shaping build decisions:**
- Orders can be placed and the full browse → cart → order flow works even when a merchant hasn't connected Stripe yet — the order is created as a "demo placeholder" with a clear message instead of blocking on payment setup. See the step 3 entry below.
- Favor "works end to end today" over architectural purity when the two trade off. Flag the simplification in this log rather than silently cutting corners, so it's easy to find and fix later.
- Founder also explicitly deferred setting up a real Stripe account ("save stripe for later") — Stripe Connect code is built and ready but untested with real keys, same as noted in step 2.

### 2026-10-03 — Step 3 build: customer browsing, cart, and ordering
Built and live-tested the customer-facing flow (build order Section 10, step 3): browse shops → view a shop's menu → add to cart → place order.

**What's new:**
- Public, unauthenticated browsing: `GET /catalog/merchants`, `/catalog/merchants/:id`, `/catalog/merchants/:id/products` — no sign-in wall to look at shops/menus, matching common ordering-app UX. Not filtered to only `status: 'active'` (i.e. Stripe-connected) merchants — every merchant profile shows up, so the demo is browsable before any merchant has connected Stripe. **Revisit before a real launch** so customers can't find shops that can't actually take payment.
- Cart is customer-side only (React context, no server persistence, single-merchant at a time — adding from a different shop starts a fresh cart). No multi-stop "Race" yet — that's step 5.
- `POST /orders` creates a `Race` (one `Order` in it, per the single-stop-is-a-one-order-race rule in Section 5) and a `Payment` row every time, regardless of Stripe status. If the merchant has completed Stripe onboarding, a real Stripe Checkout Session (AUD, with the configurable commission as `application_fee_amount`, default 10% via `COMMISSION_RATE` env var — not a final number) is created and the customer is redirected to it. If not, the order is still created and the customer sees an honest "demo placeholder, no charge was made" confirmation instead of being blocked. This is the step 3 "orders work today even without Stripe" decision referenced above.
- Verified live: browsed to the "Test Cafe" merchant created in step 2 testing, added the "Flat White" product to cart, placed the order, got the demo-mode confirmation screen with correct line items and AUD total.

### 2026-10-03 — Step 2 build: merchant onboarding, Stripe Connect, catalog CRUD
Built and live-tested the full merchant-side flow (build order Section 10, step 2): sign up → create shop profile → connect Stripe → add/edit/delete products.

**What's new:**
- Local Postgres running via `npx prisma dev` (no install, no account — see Section 10 notes below). Backend `.env` points at it; first migration applied.
- `Merchant` now has an `ownerId` linking it to a `User` row, auto-created on first authenticated request from that person's Clerk ID (fetches name/email from Clerk's API the first time only).
- New backend endpoints: `GET/POST/PATCH /merchants(/me)`, `POST /merchants/me/stripe/onboarding-link`, `GET /merchants/me/stripe/status`, and full CRUD on `/products`, all scoped so a merchant can only ever touch their own data.
- Merchant dashboard UI: shop-creation form, a Stripe "connect to get paid" banner (shown until onboarding completes), and a product list with add/edit/delete — flat/bordered per Section 6.
- Stripe Connect Express accounts are created with `country: 'AU'` and `default_currency: 'aud'` — see the Commercial Model update below (Australia launch, AUD pricing throughout).

**Real bug found and fixed (worth knowing about):** `@clerk/backend`'s `verifyToken()` has published TypeScript types claiming it returns `{ data, errors }`, but the installed version (3.22.0) actually returns the decoded token payload directly on success and throws on failure. Code written against the documented shape silently rejected every valid login ("Invalid session token") because `result.data` was always `undefined`. Fixed in `apps/backend/src/auth/clerk-auth.guard.ts` by reading `result.sub` directly (with a fallback to `result.data?.sub` in case a future Clerk release reverts to the documented shape) wrapped in a try/catch. Caught by actually signing up as a live test user in the browser, not just by type-checking or boot-testing — worth remembering that this class of bug (types lie about runtime shape) only shows up when you exercise the real flow.
- Verified Clerk's `+clerk_test@` email suffix + fixed code `424242` for testing sign-up without a real inbox or Google popup (Clerk dev-instance feature, see https://clerk.com/docs/testing/overview).

### 2026-10-03 — Clerk fully connected, live-tested
Ran the Clerk CLI end to end: installed it, signed in as the founder, and linked both `apps/customer` and `apps/merchant` to the real "Rayceit" Clerk application (`app_3KBQgfwdWgpMwCXtIXgBLJX1u8k`) — real `pk_test_...`/`sk_test_...` keys are now in both apps' `.env.local`. This replaces the earlier placeholder-key state.

- Clerk's init added real `/sign-in` and `/sign-up` pages (previously just a modal button with no dedicated route) and a `/__clerk/:path*` matcher entry in both `proxy.ts` files.
- Founder turned off password-based sign-in in the Clerk dashboard (User & Authentication → Email, Phone, Username) to match the "social login only, no email/password" decision. Google sign-in works; email falls back to a one-time code (not a password) rather than being removed entirely — acceptable since it's not a password and not phone OTP, the two things explicitly ruled out.
- Apple sign-in is intentionally deferred — it needs a paid ($99/yr) Apple Developer account the founder doesn't have yet. Turning it on later is a Clerk dashboard config change only, no code changes needed.
- Verified live in the browser: sign-up modal renders, Google button works, password field is confirmed gone after the dashboard change.

### 2026-10-03 — Step 1 build: project scaffolding and auth
Claude Code scaffolded the monorepo and wired up authentication (build order Section 10, step 1).

**Stack locked in (was "recommended, not yet locked"):**
- Monorepo: pnpm workspaces + Turborepo. `apps/customer` (port 3002), `apps/merchant` (port 3003), `apps/backend` (NestJS, port 3001), `packages/shared` (shared TypeScript types mirroring Section 5's data model).
- Auth: Clerk (not Firebase Auth/Auth0) — chosen for the tightest Next.js integration and least setup for Google/Apple social login. `clerkMiddleware()` wired in `proxy.ts` (not `middleware.ts` — Next.js 16 renamed the file convention) in both frontends; a `ClerkAuthGuard` in the backend verifies Clerk session tokens via `@clerk/backend`'s `verifyToken`.
- Backend framework: NestJS (not Express) — structured module/service/controller pattern.
- ORM: Prisma 7, with `packages/shared`'s types kept in sync with `apps/backend/prisma/schema.prisma` by hand.
- ESM throughout the backend (`"type": "module"`, NodeNext module resolution — local imports need explicit `.js` extensions even though source is `.ts`).

**Known footguns for future sessions (so they aren't rediscovered):**
- Prisma 7 changed config: the datasource `url` no longer lives in `schema.prisma` — it's set in `apps/backend/prisma.config.ts`, and `PrismaClient` must be constructed with an explicit driver adapter (`@prisma/adapter-pg`'s `PrismaPg`), not a bare `new PrismaClient()`.
- Clerk's Next.js SDK hit "Core 3" (released 2026-03-03): `<SignedIn>`/`<SignedOut>`/`<Protect>` are removed and throw at runtime. Use `<Show when="signed-in">` / `<Show when="signed-out">` instead. `<SignInButton>`/`<UserButton>` are unaffected.
- `@clerk/backend@3.22.0`'s published types reference a `@clerk/shared/types` export path that doesn't exist in the `@clerk/shared` version it resolves to — `verifyToken()`'s return type incorrectly resolves to `{}`. Worked around with a narrow type cast in `ClerkAuthGuard`; worth revisiting when Clerk ships a fix.
- Both frontends need their own Clerk app (publishable + secret key) created in the Clerk dashboard by the founder — this is an account-creation step Claude Code can't do on their behalf. Same for standing up a real Postgres database for `DATABASE_URL`.

**Scope of what was built:** monorepo skeleton, Tailwind v4 design tokens per Section 6 for both frontends (customer: Archivo/Inter/JetBrains Mono, rounded; merchant: Inter/JetBrains Mono, flat/bordered), Clerk-gated layout shells with placeholder home pages, and a Prisma schema covering all Section 5 entities. Catalog browsing, the race builder, and the merchant order queue (build steps 2–3) are not yet built — placeholder pages say so explicitly.

### 2026-10-03 — Initial scoping session
Founder worked through MVP scope, feature nuance, and a design system with Claude (chat), across several conversation threads. Summary of everything decided:

**Product/UX decisions:**
- Core user is always the customer themselves driving — no delegate/assistant ordering in MVP.
- Multi-stop "Race" is in MVP scope (not deferred) — this is the product's core differentiator and was initially scoped out, then explicitly added back in.
- Customer app and merchant dashboard must be two distinct UI/UX experiences (different IA, layout, visual language), not one interface with role-based permissions.
- Customer orders by browsing an in-app menu/catalog (Uber Eats style), not just sharing an ETA for an order placed elsewhere.
- Handover confirmation is dual: QR code scan by merchant staff AND customer taps "Confirm pickup" in-app.
- No-show policy: grace period (~15–20 min past ETA), then merchant can mark no-show. No automatic refund by default (perishables can't be resold), configurable per merchant for non-perishable verticals.
- Chemist/pharmacy vertical is OTC items only in MVP — prescription/script verification explicitly deferred (regulatory complexity).
- Mixed merchant verticals from day one (cafe, chemist, dry cleaner, etc.) — not launching single-vertical.
- Merchants self-serve their own catalog (products, prices, photos, prep time) — not built/maintained by the RAYCE IT team.
- v1 does not auto-reroute or re-optimize a race if a merchant runs late — it flags the delay informationally only. Also does not algorithmically choose the "best" stop order — it executes the order the customer built the race in.

**Technical decisions:**
- Customer-facing app is a mobile web app (PWA-style) — no native iOS/Android app store build for MVP. Chosen for build speed; known limitation: live location only works while the browser tab is open/foregrounded (browser Geolocation API), no background tracking.
- Auth: social login (Google/Apple), not email/password or phone OTP.
- Notifications: web push.
- Payments: in-app checkout, RAYCE IT processes payment (not pay-at-counter).
- Merchant payouts: Stripe Connect (Express accounts), automatic payouts — not manual settlement.
- Merchant order management: web dashboard (not native app, not pure SMS).
- Recommended stack (not yet locked in code): Next.js frontend (two distinct front-ends: `/customer` and `/merchant`), Node backend (NestJS/Express), PostgreSQL, Stripe Connect, Google Maps Platform (Distance Matrix/Directions, multi-waypoint) for ETA, browser Geolocation API, Web Push, Firebase Auth/Auth0/Clerk for social login, WebSockets or Pusher/Ably for real-time order/ETA updates.
- Data model needs a `Race` entity (customer trip) containing one or more `Order`s (one per stop), each `Order` carrying a `stop_sequence`. A single-stop trip is just a Race with one Order — no separate code path.

**Commercial decisions:**
- Revenue model (commission % vs customer fee vs both) is explicitly undecided — left as a configurable field in the data model so it can be tuned post-launch without a schema change.
- Launch geography is explicitly open — no fixed city/suburb chosen yet. Plan is to onboard wherever early merchants say yes, not pick geography first.

**Design decisions:**
- Full design system created — see Section 6 below and the companion `design.md` file. Key choices: near-black "Track Ink" + a single vivid teal-green "Track Green" accent used only for actionable/active elements, Archivo for display/headline type, Inter for body, JetBrains Mono for all live/counting data (ETAs, timers). Signature UI element is "The Track" — a checkpoint-and-line visual (filled = done, pulsing = current, hollow = upcoming) reused across the race-builder and live-tracking screens. Customer app uses generous rounded corners and soft shadows (map-forward, approachable); merchant dashboard uses tighter corners and flat, bordered cards with a color-coded left-edge status stripe instead of shadow (built for glare/kitchen-lighting legibility, near-zero training).
- A working mockup of both the customer race screen and the merchant order-queue dashboard was built and reviewed (see `design.md` for the full spec these were built from).

**Known risks flagged (not yet decisions, worth tracking):**
- Merchant labor cost/willingness is likely the biggest adoption risk, not the technology — walking an order to a curb is new, uncompensated-feeling work for non-cafe verticals (chemist, dry cleaner) especially.
- ETA accuracy across mixed traffic and multiple unrelated merchants will need buffer logic (e.g. showing a range, not a single number) to avoid cascading prep-timing frustration.
- Chicken-and-egg merchant density: the multi-stop "race" feature has nothing to chain together without several onboarded merchants in the same area — may force a de facto hyper-local launch even though geography was left deliberately open.
- Parking/curb legality for a quick curbside handoff is a per-location constraint that merchant onboarding will need to check, not something the product can control.

---

## 3. Current MVP Scope

| Decision | MVP Choice |
|---|---|
| Driver | Always the customer themselves (no delegate ordering in v1) |
| Stops per trip | Multi-stop supported — a "Race" contains 1+ stops, sequenced with live ETA tracking per stop |
| Customer vs merchant UI | Two distinct interfaces, not a shared UI with permission flags |
| Geography | No fixed launch city — onboard wherever early merchants agree |
| Ordering | In-app catalog browse + order (Uber-Eats style), not just ETA sharing |
| Payment | In-app checkout, RAYCE IT processes payment |
| Merchant payout | Stripe Connect (Express accounts), automatic payouts |
| Revenue model | Commission % and/or customer fee — configurable field, exact number TBD |
| Merchant order management | Lightweight web dashboard (browser-based, no native app) |
| Customer platform | Mobile web app (PWA-style), no native iOS/Android app store build |
| Verticals | Mixed from day one (cafes, chemist/pharmacy OTC, dry cleaners, etc.) |
| Catalog management | Merchants self-serve (add/edit their own products, prices, photos) |
| Customer location sharing | Live GPS tracking, merchant sees customer ETA on a live map |
| Prep trigger | Each product has a merchant-set prep time; system auto-notifies merchant to "start now" when customer's live ETA matches prep time |
| Handover confirmation | Dual — staff scans a QR code AND customer taps "Confirm pickup" in-app |
| No-show handling | Grace period (~15–20 min past ETA), then merchant can mark "no-show." No automatic refund by default, configurable per merchant/product |
| Chemist/pharmacy scope | OTC items only — no prescription/script verification |
| Auth | Social login (Google/Apple) |
| Notifications | Web push |

### Explicitly OUT of scope for MVP
- Delegate/assistant ordering on someone else's behalf
- Automatic re-routing/re-sequencing of a race if a merchant runs late (v1 flags the delay, doesn't auto-optimize)
- Route optimization across possible stop orderings (v1 uses the order the customer built, not an algorithmically "best" sequence)
- Prescription pickups requiring ID/script verification
- Native iOS/Android apps
- In-house payment ledger (using Stripe Connect instead)
- Loyalty/rewards, ratings/reviews, chat between customer and merchant

---

## 4. User Roles & Core Flows

**Customer** — browses merchants, builds a race (one or more stops), orders and pays at each stop, shares live location, gets sequenced ETAs, confirms pickup at each stop. Experience is trip-planning and on-the-move: map-forward, timeline of stops, minimal typing while driving/parked.

**Merchant** — manages catalog, receives orders (which may be part of a customer's larger race, but the merchant only cares about their own stop), sees live customer ETA, marks order stages, confirms handover, receives payouts. Experience is a fast counter/kitchen tool: glanceable order queue, big touch targets, minimal navigation depth.

**Admin (internal, minimal for MVP)** — onboards merchants, views orders/transactions for support, configures commission rates.

### Customer flow — single stop
1. Sign in via Google/Apple → browse merchants/catalogs → add items, pay in-app → order sent to merchant as "pending" → customer drives, app shares live location → live ETA calculated → merchant auto-notified to start prepping when ETA matches prep time → merchant marks "ready" → customer arrives, dual QR/in-app confirmation → order "collected," receipt in-app.

### Customer flow — building a Race (multi-stop)
1. Start a new Race instead of a single order → add stops one at a time (search/select each merchant, browse their catalog, add items) → pay for the whole race in one checkout (split per-merchant via Stripe Connect) → optionally set a "must be done by" time, app flags if the planned stops are realistic against it → confirm and start driving → app shows a running timeline (current stop, ETA, estimated arrival at remaining stops) → each merchant only sees their own stop → on completing each stop, ETAs recalculate for remaining stops and upcoming merchants are updated → if running behind, app flags the knock-on delay (informational only, no auto-rerouting) → race marked "complete" once every stop is collected, single combined receipt.

### Merchant flow
1. Sign up, complete Stripe Connect onboarding → build catalog (products, prices, photos, prep time) → dashboard shows incoming orders in real time (standalone or part of a race, treated identically) → live map/ETA shown once customer is en route to that merchant's stop specifically → auto-flag "start prepping now" when ETA = prep time → mark "ready for pickup" → dual QR/in-app confirmation at handover → can mark "no-show" after grace period → payouts settle automatically via Stripe Connect.

---

## 5. Data Model (initial entities)

- **User** (customer): id, name, email, auth_provider, created_at
- **Merchant**: id, business_name, category, address, geo_coordinates, stripe_connect_account_id, status
- **Product**: id, merchant_id, name, description, price, photo_url, prep_time_minutes, is_active
- **Race**: id, customer_id, status (planning/in_progress/completed/abandoned), time_budget_minutes (optional), started_at, completed_at
- **Order** (a single stop, always belongs to a Race — a single-stop trip is a Race with one Order): id, race_id, stop_sequence, customer_id, merchant_id, items, status (pending/preparing/ready/collected/no_show/cancelled), created_at, eta_at_order_time, current_eta, payment_id
- **Payment**: id, order_id, amount, commission_amount, merchant_payout_amount, stripe_payment_intent_id, stripe_transfer_id, status
- **LocationPing**: id, race_id, customer_id, lat, lng, timestamp

---

## 6. Design System (summary — full spec in companion `design.md`)

- **Colors:** Track Ink `#12151A` (primary/text), Checkpoint Grey `#6B7280` (secondary/metadata), Track Green `#16D9A6` (sole action/active-state accent — never decorative), Startline White `#F6F7F6` (customer app bg), Surface White `#FFFFFF` (cards, merchant dashboard bg), Amber Flag `#FFB020` (timing urgency), Red Flag `#E5484D` (no-show/errors), Pit Complete `#1FAE7A` (collected/done confirmations).
- **Type:** Archivo (display/headlines, kinetic urban-energy voice, customer app only), Inter (all body text and UI labels, both apps), JetBrains Mono (live/counting data only — ETAs, timers, order IDs).
- **Shape/elevation:** Customer app — generous rounded corners (`lg`/`full`), soft shadows, cards float over the map. Merchant dashboard — tighter corners (`sm`), flat/bordered cards with a color-coded left-edge status stripe instead of shadow (built for glare/kitchen-lighting legibility).
- **Signature element:** "The Track" — a checkpoint-and-line visual (filled green = done, pulsing = current, hollow grey = upcoming), reused on the race-builder and live-tracking screens. This is the one visual idea the brand should be remembered by.
- **Status vocabulary:** exactly three signal colors — green (ready/go), amber (urgency/prep-now), red (alert/no-show). No fourth accent color.
- **Full token file:** `design.md` (DESIGN.md format — YAML tokens + prose rationale, readable by Claude Code and other AI coding tools directly).
- **Inspiration references:** Uber (monochrome + tight type), Airbnb (rounded, map-forward cards), Wise (single disciplined "go" green), DoorDash/Uber Eats (status-chip conventions), Square POS (flat, glare-proof counter UI), Linear (restraint — one accent carries a product).

---

## 7. Commercial Model — mostly open

- Revenue: commission from merchant, flat customer fee, or both. **Not decided.** Build with a configurable rate field, don't hardcode.
- Launch country: **Australia** (decided 2026-10-03). Currency is AUD throughout — product prices, Stripe Connect accounts (created with `country: 'AU'`, `default_currency: 'aud'`). Exact city/suburb is still open — working assumption remains "wherever early merchants say yes" within Australia.
- Pricing to merchants (commission tiers, setup fees, etc.): not yet discussed.
- Funding/legal structure: not yet discussed in these sessions.

---

## 8. Open Questions / Parking Lot

- What commission or fee structure actually gets charged, and to whom?
- Which city/suburb/strip to pilot in, once merchant conversations start?
- How is merchant density bootstrapped in a launch area before the multi-stop race has anything to chain together?
- What's the actual onboarding pitch/incentive for non-cafe merchants (chemist, dry cleaner) to take on the curb-running labor?
- Legal/parking constraints for curbside handoff — per-location, not yet addressed systematically.
- What happens commercially/operationally to a no-show order for a non-perishable vertical (chemist OTC item, dry cleaning) — restock, hold, dispose?
- How should combined payment actually work when a race has 2+ stops at merchants who've each connected their own Stripe account? (Today each stop gets its own independent checkout attempt — see the step 5 decision log entry. Needs real design once Stripe testing starts.)

---

## 9. Fast-follow (post-MVP) roadmap

1. Automatic re-routing/re-sequencing of a race when a merchant runs late
2. Route optimization — suggesting the best stop order, not just executing the customer's chosen order
3. Delegate/assistant ordering
4. Prescription pickup support (chemist vertical)
5. Native iOS/Android apps (background location, more reliable push)
6. Merchant analytics dashboard
7. Ratings/reviews, loyalty features

---

## 10. Instructions for Claude Code

Read this whole file (and `design.md` if present in the same folder) before starting. Build the MVP as a full-stack web application, with the customer app and merchant dashboard as two distinct front-end experiences sharing one backend. Suggested order:

1. Project scaffolding (Next.js frontend with separate `/customer` and `/merchant` front-end apps + Node backend + Postgres) and auth (Google/Apple social login).
2. Merchant onboarding flow: sign up, Stripe Connect account linking, catalog management (CRUD for products with prep time). Build the merchant dashboard UI per Section 6 — glanceable order-queue tool, flat/bordered, status-stripe cards.
3. Customer flow: browse merchants/catalog, build a single-stop order, cart, Stripe checkout. Build the customer UI per Section 6 — map-forward, rounded, mobile-optimized.
4. Order lifecycle state machine: pending → preparing → ready → collected / no_show / cancelled.
5. Extend the customer flow to support Races: adding multiple stops, per-stop checkout with one combined payment split across merchants via Stripe Connect, and a race timeline view using "The Track" signature element.
6. Live location sharing + ETA calculation for the customer's current stop, with a real-time channel pushing ETA updates to whichever merchant is currently "up next."
7. QR-code generation per order for handover confirmation, plus a customer-side "Confirm pickup" action.
8. Web push notifications for order status changes, both customer (stop ready) and merchant (customer approaching) sides.

Build in the order above — each step should be independently testable before moving to the next. Steps 1–4 and 6–8 apply equally to a single-stop race (a race with one stop); step 5 is what extends the same system to handle multiple stops.

**Local dev environment notes (as of step 2):**
- Database: run `npx prisma dev` from `apps/backend` — starts a local Postgres with zero install and no account, prints a `DATABASE_URL` to put in `apps/backend/.env`. This is what's running today; see the step 2 decision log entry.
- Auth: both frontends are linked to a real Clerk app via the Clerk CLI (`clerk init`) — not placeholder keys. To test sign-up without a real inbox or clicking through a real Google popup, use an email like `name+clerk_test@domain.com` with verification code `424242` (Clerk's built-in dev-instance testing feature).
- Payments: `STRIPE_SECRET_KEY` is still a placeholder — Stripe Connect endpoints exist and are wired up (step 2) but need the founder to create a free Stripe account and drop in test keys before they're actually testable end to end, same pattern as Clerk.
- **Always verify auth-touching backend code by actually signing in as a live test user in the browser**, not just by type-checking or booting the server — step 2 shipped with Clerk auth completely broken (every login rejected) despite a clean build and clean boot, because `@clerk/backend`'s published types didn't match its runtime behavior. See the step 2 decision log entry for the fix.

If a product, design, or commercial decision is needed to proceed and isn't covered above or in the Decision Log, stop and ask rather than assuming — then add the answer back into this file's Decision Log once it's settled.
