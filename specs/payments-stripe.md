# Payments (Stripe Connect)

RACE IT processes payment in-app and pays merchants out via Stripe Connect
(Express accounts), not pay-at-counter. Commission rate is configurable, not
hardcoded.

## Current behavior

- Checkout: `OrdersService.createStopOrder` attempts a Stripe Checkout
  Session only if the stop's merchant has a connected, onboarded Stripe
  account (`stripeConnectAccountId` set and `stripeOnboardingComplete`).
  Commission is computed via `COMMISSION_RATE` env var (default 10%, **not
  a final number** — racyeit.md Section 7 leaves the actual rate
  undecided), passed to Stripe as `application_fee_amount` with
  `transfer_data.destination` set to the merchant's connected account.
- **Demo mode:** if a merchant hasn't connected Stripe, the order is still
  created (so the whole browse → order flow stays clickable) and the
  customer sees an honest "demo placeholder, no charge was made" message
  instead of being blocked — see racyeit.md's step 3 decision log entry on
  this deliberate simplification.
- `apps/backend/src/stripe/stripe.service.ts`: Express accounts are created
  with `country: 'AU'`, `default_currency: 'aud'` (founder confirmed
  Australia launch, AUD pricing throughout).
- `POST /orders/:id/sync-payment` reconciles a Stripe PaymentIntent's real
  status against our `Payment.status` after a checkout redirect.

## Known gaps / out of scope

- `STRIPE_SECRET_KEY` is a placeholder — **none of this has been tested
  against a real Stripe account.** The founder explicitly deferred Stripe
  account setup; this is the single biggest "is this actually going to
  work" unknown in the whole build.
- Combined payment across a multi-stop race with 2+ Stripe-connected
  merchants is unsolved — see multi-stop-races.md.
- No refund flow.
