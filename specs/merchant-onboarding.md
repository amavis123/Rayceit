# Merchant Onboarding, Stripe Connect, Catalog

A merchant signs in, creates a shop profile, optionally connects Stripe, and
manages their own product catalog. One merchant profile per Clerk user (MVP
limit — no multi-location/multi-staff support).

## Current behavior

- `POST /merchants` creates a shop profile for the signed-in user
  (businessName, category, address — lat/lng default to 0,0, no geocoding
  yet). `GET /merchants/me` / `PATCH /merchants/me` read/update it.
  `apps/merchant` shows an onboarding form when no profile exists yet.
- Stripe Connect (Express accounts, `country: 'AU'`, `default_currency:
  'aud'`): `POST /merchants/me/stripe/onboarding-link` creates the account +
  onboarding link; `GET /merchants/me/stripe/status` polls
  `charges_enabled`. Shown as a dashboard banner until connected.
  `STRIPE_SECRET_KEY` is still a placeholder — untested with a real account.
- Catalog CRUD at `/products` (create/update/delete, scoped to the caller's
  own merchant) and `GET /products/mine` for the merchant's own list. Each
  product has `prepTimeMinutes`, used later for ETA/prep-trigger logic.

## Known gaps / out of scope

- No merchant staff accounts / roles — one owner Clerk user per shop.
- No merchant-side address geocoding — lat/lng must be set manually (see the
  `Test Cafe` 0,0 → manual-fix incident in racyeit.md). Real launch needs
  this fixed before a merchant's location is usable for ETA.
- Real Stripe onboarding is unverified end to end (see payments-stripe.md).
