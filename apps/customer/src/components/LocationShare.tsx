"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

const PING_INTERVAL_MS = 15000;

interface PingResponse {
  etaMinutes: number | null;
  currentOrderId: string | null;
  autoStarted: boolean;
}

// Uses the browser's real Geolocation API — this is not simulated/fake data.
// Per racyeit.md's known limitation, this only works while this tab is open
// and in the foreground (no background tracking in the MVP).
export function LocationShare({ raceId, onEta }: { raceId: string; onEta?: (minutes: number | null) => void }) {
  const { getToken } = useAuth();
  const [sharing, setSharing] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function sendPing() {
    if (!("geolocation" in navigator)) {
      setError("This browser doesn't support location sharing.");
      setSharing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const token = await getToken();
          const result = await apiFetch<PingResponse>(`/races/${raceId}/location-pings`, token, {
            method: "POST",
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          });
          setEtaMinutes(result.etaMinutes);
          onEta?.(result.etaMinutes);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't update your location");
        }
      },
      (geoError) => {
        setError(geoError.message || "Couldn't get your location");
        setSharing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function start() {
    setError(null);
    setSharing(true);
    sendPing();
    intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);
  }

  function stop() {
    setSharing(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-checkpoint-grey/20 bg-surface-white px-5 py-4 shadow-sm">
      {!sharing ? (
        <>
          <p className="text-sm font-semibold">Share your location</p>
          <p className="mt-1 text-sm text-checkpoint-grey">
            Let the shop know how far away you are so they can time your order.
          </p>
          <button
            onClick={start}
            className="mt-3 rounded-full bg-track-green px-4 py-2 text-sm font-semibold text-track-ink"
          >
            Start sharing
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {etaMinutes !== null ? `Arriving in ~${etaMinutes} min` : "Finding your location..."}
            </p>
            <button onClick={stop} className="text-sm text-red-flag underline">
              Stop sharing
            </button>
          </div>
          <p className="mt-1 text-xs text-checkpoint-grey">
            Updating every {PING_INTERVAL_MS / 1000}s while this page is open.
          </p>
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-flag">{error}</p>}
    </div>
  );
}
