import { createClerkClient } from '@clerk/backend';

export function getClerkClient() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}
