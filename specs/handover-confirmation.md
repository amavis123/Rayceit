# Handover Confirmation (QR + Code)

Dual pickup confirmation per racyeit.md Section 3: a QR code and a 6-digit
code, either side can confirm — not a requirement that both happen.

## Current behavior

- `Order.confirmationCode` — random 6-digit code generated at order
  creation.
- `POST /orders/:id/confirm-pickup` (customer, no code needed — they're
  already authenticated as the order's owner) and
  `POST /orders/:id/confirm-handover` (merchant, requires the code to
  match). Both just trigger the existing `ready → collected` transition
  (see order-lifecycle.md) — whichever happens first wins.
- Customer: `HandoverCard.tsx` appears on the race timeline once a stop is
  `ready` — a real client-generated QR code (`qrcode` package, encodes
  `orderId:confirmationCode`) plus the code as large text, plus a "Confirm
  pickup" button.
- Merchant: two confirmation paths on a `ready` order — manual 6-digit entry
  (always available) and a real camera QR scanner (`jsqr` decoding live
  video via `getUserMedia`, global "Scan to confirm pickup" button that
  auto-detects which order from the scanned code). The pre-existing "Mark
  collected" button still works too as a no-verification override.

## Known gaps / out of scope

- "Dual" is implemented as *either* side confirms, not both required — an
  interpretation call (the source material didn't specify), flagged in case
  it turns out to matter.
- Camera scanning was built but not verified by an actual camera scan in
  testing (no physical camera available) — the manual-entry path exercises
  the same backend endpoint and code-matching logic the scanner calls, so
  the verification gap is narrow, but worth a real-device test.
