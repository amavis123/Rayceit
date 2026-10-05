"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useRace } from "@/lib/race";
import { apiFetch } from "@/lib/api";

interface CreateRaceResponse {
  race: { id: string };
  stops: { checkoutUrl: string | null }[];
  timeBudgetWarning: string | null;
}

export default function RacePage() {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const { stops, removeItem, removeStop, stopTotal, grandTotal, clear } = useRace();
  const [timeBudget, setTimeBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const result = await apiFetch<CreateRaceResponse>("/races", token, {
        method: "POST",
        body: JSON.stringify({
          stops: stops.map((s) => ({
            merchantId: s.merchantId,
            items: s.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          })),
          ...(timeBudget ? { timeBudgetMinutes: Number(timeBudget) } : {}),
        }),
      });
      clear();
      const firstCheckoutUrl = result.stops.find((s) => s.checkoutUrl)?.checkoutUrl;
      const warningParam = result.timeBudgetWarning
        ? `?warning=${encodeURIComponent(result.timeBudgetWarning)}`
        : "";
      if (firstCheckoutUrl) {
        window.location.href = firstCheckoutUrl;
      } else {
        router.push(`/races/${result.race.id}${warningParam}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  if (stops.length === 0) {
    return <p className="px-6 py-8 text-checkpoint-grey">Your Race is empty — browse a shop to add a stop.</p>;
  }

  return (
    <div className="px-6 py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Your Race</h1>
      <p className="mt-1 text-sm text-checkpoint-grey">
        {stops.length} stop{stops.length > 1 ? "s" : ""}, in the order you&apos;ll visit them.
      </p>

      <ol className="mt-6 flex flex-col gap-4">
        {stops.map((stop, index) => (
          <li
            key={stop.merchantId}
            className="rounded-2xl border border-checkpoint-grey/20 bg-surface-white px-5 py-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                Stop {index + 1}: {stop.merchantName}
              </span>
              <button
                onClick={() => removeStop(stop.merchantId)}
                className="text-sm text-red-flag underline"
              >
                Remove stop
              </button>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {stop.items.map((item) => (
                <li key={item.productId} className="flex items-center justify-between text-sm">
                  <span>
                    {item.quantity} &times; {item.name}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono">A${(item.unitPrice * item.quantity).toFixed(2)}</span>
                    <button
                      onClick={() => removeItem(stop.merchantId, item.productId)}
                      className="text-xs text-red-flag underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-right font-mono text-sm text-checkpoint-grey">
              Stop total: A${stopTotal(stop).toFixed(2)}
            </p>
          </li>
        ))}
      </ol>

      <label className="mt-6 flex flex-col gap-1 text-sm font-semibold">
        Done in (minutes) — optional
        <input
          type="number"
          min="1"
          value={timeBudget}
          onChange={(e) => setTimeBudget(e.target.value)}
          placeholder="e.g. 30"
          className="w-32 rounded-full border border-checkpoint-grey/40 px-3 py-2 text-sm font-normal"
        />
      </label>

      <div className="mt-6 flex items-center justify-between font-semibold">
        <span>Total</span>
        <span className="font-mono">A${grandTotal.toFixed(2)}</span>
      </div>

      {error && <p className="mt-4 text-sm text-red-flag">{error}</p>}
      {!isSignedIn && <p className="mt-4 text-sm text-checkpoint-grey">Sign in to start your Race.</p>}

      <button
        onClick={handleStart}
        disabled={submitting || !isSignedIn}
        className="mt-6 w-full rounded-full bg-track-green px-6 py-3 text-sm font-semibold text-track-ink disabled:opacity-50"
      >
        {submitting ? "Starting..." : "Start Race"}
      </button>
    </div>
  );
}
