"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { Race } from "@/lib/types";
import { RaceTrack } from "@/components/RaceTrack";
import { LocationShare } from "@/components/LocationShare";
import { HandoverCard } from "@/components/HandoverCard";
import { EnableNotifications } from "@/components/EnableNotifications";

const POLL_INTERVAL_MS = 8000;

export default function RaceTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const warning = searchParams.get("warning");
  const { getToken } = useAuth();
  const [race, setRace] = useState<Race | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      const result = await apiFetch<Race>(`/races/${id}`, token);
      setRace(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (error) return <p className="px-6 py-8 text-sm text-red-flag">{error}</p>;
  if (!race) return <p className="px-6 py-8 text-sm text-checkpoint-grey">Loading your Race...</p>;

  const grandTotal = race.orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    0,
  );

  return (
    <div className="px-6 py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {race.status === "completed" ? "Race complete" : "Your Race"}
      </h1>
      <p className="text-sm text-checkpoint-grey">
        {race.orders.length} stop{race.orders.length > 1 ? "s" : ""}
        {race.timeBudgetMinutes ? ` · done in ${race.timeBudgetMinutes} min` : ""}
      </p>

      {warning && (
        <p className="mt-4 rounded-2xl bg-amber-flag/10 px-4 py-2 text-sm text-track-ink">{warning}</p>
      )}

      {race.status !== "completed" && (
        <div className="mt-4 flex flex-col gap-3">
          <LocationShare raceId={race.id} />
          <EnableNotifications />
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-checkpoint-grey/20 bg-surface-white px-5 py-5 shadow-sm">
        <RaceTrack orders={race.orders} />
      </div>

      {race.orders
        .filter((o) => o.status === "ready")
        .map((order) => (
          <div key={order.id} className="mt-4">
            <HandoverCard order={order} onConfirmed={load} />
          </div>
        ))}

      <div className="mt-6 flex flex-col gap-3">
        {race.orders.map((order) => (
          <div
            key={order.id}
            className="rounded-2xl border border-checkpoint-grey/20 bg-surface-white px-5 py-4 shadow-sm"
          >
            <p className="font-semibold">
              Stop {order.stopSequence}: {order.merchant.businessName}
            </p>
            <p className="text-xs text-checkpoint-grey">{order.merchant.address}</p>
            <ul className="mt-2 text-sm">
              {order.items.map((item) => (
                <li key={item.productId} className="flex justify-between">
                  <span>
                    {item.quantity} &times; {item.name}
                  </span>
                  <span className="font-mono">A${(item.unitPrice * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            {order.payment && (
              <p className="mt-1 font-mono text-xs text-checkpoint-grey">
                {order.payment.status === "succeeded" ? "Paid" : "Demo — no charge made"}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between font-semibold">
        <span>Race total</span>
        <span className="font-mono">A${grandTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
