# Public Catalog Browsing

A customer can see every merchant and their menu without signing in. Signing
in is only required to actually order.

## Current behavior

- `GET /catalog/merchants`, `/catalog/merchants/:id`,
  `/catalog/merchants/:id/products` — no auth guard, public.
- `apps/customer`: `/merchants` (list), `/merchants/[id]` (shop detail +
  menu + add-to-stop). Shows merchant `logoUrl` (circular, falls back to an
  initial letter) and each product's price/prep time.
- Listing is **not** filtered to `status: 'active'` (i.e. Stripe-connected)
  merchants — every merchant profile shows up, so the catalog is browsable
  and demoable before any merchant has connected payments.

## Known gaps / out of scope

- **Before a real launch:** filter `GET /catalog/merchants` to only
  Stripe-connected merchants, so customers can't find a shop that can't
  actually take their money. Deliberately left open for the demo stage — see
  racyeit.md's step 3 decision log entry.
- No search, filtering, or distance-based sorting — just a flat list.
