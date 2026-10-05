// Straight-line distance, not real routing — no Google Maps/routing API key
// is wired up yet (same "needs a real account" situation as Stripe). Good
// enough to demo a live-updating ETA; swap for a real Distance Matrix call
// when that's worth the API cost. See racyeit.md step 6 decision log entry.
const EARTH_RADIUS_KM = 6371;
const ASSUMED_SPEED_KMH = 30;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function estimateEtaMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / ASSUMED_SPEED_KMH) * 60));
}
