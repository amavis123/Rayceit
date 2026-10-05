"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { Order } from "@/lib/types";

export default function OrderCompletePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getToken } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        // If this order has a Stripe payment attached, confirm it actually
        // succeeded before declaring victory.
        const result = await apiFetch<Order>(`/orders/${id}/sync-payment`, token, { method: "POST" });
        setOrder(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="px-6 py-16 text-center text-sm text-red-flag">{error}</p>;
  if (!order) return <p className="px-6 py-16 text-center text-checkpoint-grey">Checking your order...</p>;

  const paid = order.payment?.status === "succeeded";

  return (
    <div className="px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {paid ? "Order placed!" : "Order received"}
      </h1>
      <p className="mt-2 text-checkpoint-grey">
        {paid
          ? "The shop has been notified and will start prepping when you're close."
          : "This shop hasn't connected payments yet, so this order is a demo placeholder — no charge was made."}
      </p>
      <div className="mt-6 rounded-2xl border border-checkpoint-grey/20 bg-surface-white px-5 py-4 text-left">
        {order.items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span>
              {item.quantity} &times; {item.name}
            </span>
            <span className="font-mono">A${(item.unitPrice * item.quantity).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <Link href={`/races/${order.raceId}`} className="mt-6 inline-block underline">
        View your Race
      </Link>
    </div>
  );
}
