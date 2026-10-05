# Customer & Merchant Auth

Anyone — customer or merchant — signs in with Clerk (Google social login, or an
email one-time code as fallback). No email+password, no phone OTP. Both
`apps/customer` and `apps/merchant` link to the same Clerk application, so one
person's account works across both apps.

## Current behavior

- `ClerkProvider` wraps both app layouts; `proxy.ts` (Next.js 16 — not
  `middleware.ts`) runs `clerkMiddleware()` in both apps.
- Sign-in/sign-up are Clerk's own pages at `/sign-in`, `/sign-up` in each app.
- Backend verifies the Clerk session token per-request via `ClerkAuthGuard`
  (`apps/backend/src/auth/clerk-auth.guard.ts`), using `@clerk/backend`'s
  `verifyToken`.
- First authenticated request for a given Clerk user auto-creates a `User` row
  (`UsersService.findOrCreateByClerkId`), pulling name/email from Clerk's API.
  There's no separate "sign up" step in our own backend — identity exists the
  moment someone calls an authenticated endpoint.

## Known gaps / out of scope

- Apple sign-in is not configured (needs a paid Apple Developer account —
  founder's call to defer, see racyeit.md decision log).
- No delegate/assistant ordering — the signed-in person is always the one
  driving (explicit MVP decision).
