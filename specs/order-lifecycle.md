# Order Status Lifecycle

Every stop (`Order`) moves through a small state machine. A merchant drives
most transitions; the customer or an automatic trigger can also move it.

## Current behavior

Allowed transitions (`apps/backend/src/orders/orders.service.ts`,
`ALLOWED_TRANSITIONS`):

```
pending   → preparing, cancelled
preparing → ready, cancelled
ready     → collected, no_show
collected / no_show / cancelled → (terminal)
```

- `PATCH /orders/:id/status` — merchant-only, validates the transition.
- Automatic `pending → preparing`: triggered by live ETA dropping to/below
  the order's prep time (see live-eta-location.md), or by a Stripe payment
  succeeding (`syncPaymentStatus`).
- `ready → collected` can also happen via the dual handover confirmation
  (see handover-confirmation.md) — customer tap or merchant code/scan — not
  just the merchant's manual "Mark collected" button (which still exists as
  a no-verification override, intentionally not removed).
- A `Race` auto-completes (`status: 'completed'`) the moment every one of its
  `Order`s reaches a terminal status —
  `OrdersService.completeRaceIfAllStopsDone`, checked after every status
  change regardless of which path triggered it.

## Known gaps / out of scope

- No grace-period timer for no-show (racyeit.md: "~15–20 min past ETA" is
  the product intent; today a merchant can mark no-show manually at any
  point once an order is `ready`, with no automatic timer).
- No refund logic tied to `cancelled`/`no_show` — payment status isn't
  reversed automatically.
