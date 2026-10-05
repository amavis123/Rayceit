# Live Location & ETA

While a customer has their race timeline page open, their real device
location (not simulated) can be shared, producing a live ETA to whichever
stop is next — shown to both the customer and that stop's merchant.

## Current behavior

- Customer: `LocationShare.tsx` — explicit opt-in "Start sharing" button
  (not an unprompted permission popup), uses the real browser Geolocation
  API, pings every 15s while the page is open. Only works foregrounded —
  known MVP limitation, no background tracking (that needs a native app).
- `POST /races/:id/location-pings` (`RacesService.recordLocationPing`):
  records the ping, finds the first non-terminal `Order` in the race, and
  estimates ETA via **straight-line (haversine) distance at an assumed 30
  km/h** — not real road routing. No Maps/Distance Matrix API key is wired
  up (would need a paid account, same situation as Stripe).
- Auto prep-trigger (racyeit.md Section 3): once ETA ≤ the order's own max
  item prep time, `pending → preparing` fires automatically, no merchant
  click needed.
- Merchant: order queue shows "Customer ~X min away" (amber) on whichever
  order has a live, non-stale `currentEta`.

## Known gaps / out of scope

- ETA accuracy: straight-line + flat speed assumption, not real traffic/road
  distance. Swap for a real routing API before trusting this for a real
  launch — see racyeit.md's known risks section on ETA buffering.
- No grace-period/no-show timer tied to ETA (see order-lifecycle.md).
