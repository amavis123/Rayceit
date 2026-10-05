# Multi-Stop Races

The core differentiator: a customer can chain stops at multiple merchants
into one trip ("Race"), not just order from one shop. A single-stop order is
just a Race with one stop — there is no separate code path.

## Current behavior

- Customer-side race builder: `apps/customer/src/lib/race.tsx`
  (`RaceProvider`/`useRace`) — adding an item from a new merchant adds a new
  stop rather than replacing the cart. Reviewed/started at `/race`.
- `POST /races` (`apps/backend/src/races`) creates one `Race` row plus one
  `Order` per stop, in sequence (`stopSequence`), via the shared
  `OrdersService.createStopOrder` helper — the same code single-stop
  creation uses.
- Optional `timeBudgetMinutes` ("done in N minutes"): if the rough estimate
  (each stop's slowest item's prep time + a flat 5 min buffer, summed across
  stops) exceeds the budget, the response includes a `timeBudgetWarning` —
  **non-blocking**, creation still succeeds. (Resolves the open question in
  racyeit.md Section 8: warn, don't block.)
- `GET /races/:id` returns every stop with merchant/items/payment — drives
  the customer-facing timeline page (`/races/[id]`), which renders "The
  Track" (`RaceTrack.tsx`): filled/pulsing/hollow checkpoints per Section 6's
  signature visual.

## Known gaps / out of scope

- **Combined payment across multiple Stripe-connected merchants is not
  solved.** Each stop attempts its own independent Stripe Checkout Session;
  there's no UI to walk a customer through multiple sequential Stripe
  redirects for one race. Doesn't matter today (no seeded merchant has
  Stripe connected) but needs real design before it matters.
- No re-routing/re-sequencing if a merchant runs late, and no "best order"
  route optimization — the race executes stops in the order the customer
  built them (explicit MVP decisions, see racyeit.md Section 3).
