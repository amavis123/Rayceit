# Implementation Plan

Generated 2026-10-03. Source of truth for what's built: `specs/*.md`. Source
of truth for the full decision history/why: `racyeit.md`. This file is
disposable — regenerate it (redo the gap analysis against `specs/*` vs the
actual code) whenever it feels stale rather than hand-patching it forever.

## Status

All 8 original build-order steps (racyeit.md Section 10) are implemented and
individually spec'd in `specs/*.md`. The MVP is demoable end to end:
merchant onboarding → catalog → customer browsing → multi-stop Race → live
ETA → QR/code handover → push notifications. What's below is what's left,
in priority order.

## Priority 1 — Verify the two unproven pieces

- [ ] **Real Stripe test.** Founder creates a real Stripe account, drops test
      keys into `apps/backend/.env` (`STRIPE_SECRET_KEY`), then walk one full
      checkout end to end: merchant connects via "Connect with Stripe",
      customer places an order, confirm the Checkout Session actually
      redirects and `sync-payment` reconciles correctly. See
      `specs/payments-stripe.md`.
- [ ] **Real push notification test.** On an actual phone/browser (not the
      sandboxed test browser used during development), click "Enable
      notifications" in both apps, confirm the subscribe call succeeds, then
      trigger a real notification (mark an order ready; get a customer
      within 10 min via location sharing) and confirm it actually appears.
      See `specs/push-notifications.md`.

## Priority 2 — Known simplifications worth closing before a real launch

- [ ] Filter `GET /catalog/merchants` to Stripe-connected merchants only, so
      customers can't find a shop that can't take payment
      (`specs/catalog-browsing.md`).
- [ ] Add merchant address geocoding (address → lat/lng) — onboarding
      currently defaults to 0,0 and needs a manual fix, which already bit us
      once with the seed "Test Cafe" (`specs/merchant-onboarding.md`).
- [ ] Design combined payment for a multi-stop race where 2+ stops are at
      different Stripe-connected merchants — today each stop gets an
      independent checkout attempt, no multi-redirect UI exists
      (`specs/multi-stop-races.md`).
- [ ] Replace the straight-line/flat-30km/h ETA estimate with a real routing
      API (Google Distance Matrix or similar) once that cost is justified
      (`specs/live-eta-location.md`).
- [ ] Decide the actual commission rate (currently a 10% placeholder via
      `COMMISSION_RATE`) — racyeit.md Section 7, still explicitly open.
- [ ] No-show grace-period timer (~15–20 min past ETA) — today a merchant
      can mark no-show manually at any time once `ready`, no auto-timer
      (`specs/order-lifecycle.md`).

## Priority 3 — Fast-follow roadmap (racyeit.md Section 9, not yet started)

- [ ] Automatic re-routing/re-sequencing when a merchant runs late
- [ ] Route optimization (best stop order, not just customer's chosen order)
- [ ] Delegate/assistant ordering
- [ ] Prescription pickup support (chemist vertical)
- [ ] Native iOS/Android apps (background location, more reliable push)
- [ ] Merchant analytics dashboard
- [ ] Ratings/reviews, loyalty features
- [ ] Apple sign-in (needs a paid Apple Developer account — founder deferred)

## Open commercial/product questions (racyeit.md Section 8)

Not implementation tasks — decisions needed from the founder:

- Which city/suburb/strip to pilot in, once merchant conversations start
- How merchant density gets bootstrapped before the Race feature has
  anything to chain together
- The actual onboarding pitch/incentive for non-cafe merchants (chemist,
  dry cleaner) to take on curb-running labor
- Legal/parking constraints for curbside handoff, per-location
- What happens operationally to a no-show order for non-perishables
  (restock, hold, dispose)
