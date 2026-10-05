# Web Push Notifications

Customer gets notified when their stop turns "ready"; merchant gets
notified when a customer is "approaching" (ETA ≤ 10 min, once per stop).

## Current behavior

- Real Web Push (the open browser standard — VAPID keypair, not a paid
  service). Keys generated locally (`npx web-push generate-vapid-keys`),
  stored in `apps/backend/.env`.
- `PushModule`: `GET /push/vapid-public-key` (public), `POST /push/subscribe`
  (auth). One `PushSubscription` row per browser/device.
- Identical service worker (`public/sw.js`) in both apps, handling `push`
  and `notificationclick`. Explicit opt-in "Enable notifications" button in
  both apps (same pattern as location sharing — no unprompted permission
  popup).
- Triggers: `OrdersService.applyStatusChange` sends to the customer when a
  stop becomes `ready`. `RacesService.recordLocationPing` sends to the
  merchant (via `Merchant.ownerId`) the first time ETA crosses the
  10-minute threshold for a stop, guarded by `Order.approachingNotifiedAt`
  so it only fires once.
- `PushService.sendToUser` never throws — a failed push can't break the
  order-status update or location-ping request that triggered it. Expired
  subscriptions (404/410) are cleaned up automatically.

## Known gaps / verification status

**Only partially verified.** The automated test browser used during
development hard-denies the Notification permission prompt at the sandbox
level — there's no real person to click "Allow" on the OS dialog. Confirmed
working: the public-key endpoint, service worker registration, and the
opt-in UI correctly detecting/reporting a denied-permission state. **Not
confirmed:** the actual subscribe round-trip and actual push delivery (an
OS notification appearing). Needs a real-device test before relying on it.
