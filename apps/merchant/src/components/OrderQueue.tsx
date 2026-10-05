"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { Order, OrderStatus } from "@/lib/types";
import { ScanHandoverButton } from "./ScanHandoverButton";

const STATUS_STRIPE: Record<OrderStatus, string> = {
  pending: "border-l-amber-flag",
  preparing: "border-l-amber-flag",
  ready: "border-l-track-green",
  collected: "border-l-pit-complete",
  no_show: "border-l-red-flag",
  cancelled: "border-l-checkpoint-grey",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "New",
  preparing: "Preparing",
  ready: "Ready for pickup",
  collected: "Collected",
  no_show: "No-show",
  cancelled: "Cancelled",
};

const NEXT_ACTIONS: Partial<Record<OrderStatus, { label: string; next: OrderStatus }[]>> = {
  pending: [
    { label: "Start preparing", next: "preparing" },
    { label: "Cancel", next: "cancelled" },
  ],
  preparing: [
    { label: "Mark ready", next: "ready" },
    { label: "Cancel", next: "cancelled" },
  ],
  ready: [
    { label: "Mark collected", next: "collected" },
    { label: "No-show", next: "no_show" },
  ],
};

const POLL_INTERVAL_MS = 8000;

function minutesAway(currentEta: string | null): number | null {
  if (!currentEta) return null;
  const diffMs = new Date(currentEta).getTime() - Date.now();
  if (diffMs <= 0) return null;
  return Math.round(diffMs / 60000);
}

export function OrderQueue() {
  const { getToken } = useAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [codeError, setCodeError] = useState<string | null>(null);

  async function load() {
    try {
      const token = await getToken();
      const list = await apiFetch<Order[]>("/orders/mine", token);
      setOrders(list);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function advance(orderId: string, next: OrderStatus) {
    setUpdatingId(orderId);
    try {
      const token = await getToken();
      await apiFetch(`/orders/${orderId}/status`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmWithCode(orderId: string) {
    setUpdatingId(orderId);
    setCodeError(null);
    try {
      const token = await getToken();
      await apiFetch(`/orders/${orderId}/confirm-handover`, token, {
        method: "POST",
        body: JSON.stringify({ code: codeInputs[orderId] ?? "" }),
      });
      await load();
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Incoming orders</h2>
        <ScanHandoverButton onConfirmed={load} />
      </div>
      {codeError && <p className="mt-2 text-sm text-red-flag">{codeError}</p>}

      {error && <p className="mt-4 text-sm text-red-flag">{error}</p>}
      {orders === null && !error && (
        <p className="mt-4 text-sm text-checkpoint-grey">Loading...</p>
      )}
      {orders?.length === 0 && (
        <p className="mt-4 text-sm text-checkpoint-grey">
          No orders yet — they&apos;ll show up here the moment a customer orders from you.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {orders?.map((order) => (
          <li
            key={order.id}
            className={`rounded-sm border border-checkpoint-grey/20 border-l-4 bg-surface-white px-4 py-3 ${STATUS_STRIPE[order.status]}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{STATUS_LABEL[order.status]}</span>
              <span className="font-mono text-xs text-checkpoint-grey">
                {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>

            {minutesAway(order.currentEta) !== null && (
              <p className="mt-1 text-sm font-semibold text-amber-flag">
                Customer ~{minutesAway(order.currentEta)} min away
              </p>
            )}

            <ul className="mt-2 text-sm">
              {order.items.map((item) => (
                <li key={item.productId}>
                  {item.quantity} &times; {item.name}
                </li>
              ))}
            </ul>

            {order.payment && (
              <p className="mt-1 font-mono text-xs text-checkpoint-grey">
                A${order.payment.amount} &middot; {order.payment.status === "succeeded" ? "paid" : "unpaid"}
              </p>
            )}

            {order.status === "ready" && (
              <div className="mt-3 flex gap-2">
                <input
                  value={codeInputs[order.id] ?? ""}
                  onChange={(e) => setCodeInputs((prev) => ({ ...prev, [order.id]: e.target.value }))}
                  placeholder="6-digit code"
                  maxLength={6}
                  className="w-28 rounded-sm border border-checkpoint-grey/40 px-2 py-1.5 text-xs font-mono"
                />
                <button
                  onClick={() => confirmWithCode(order.id)}
                  disabled={updatingId === order.id || (codeInputs[order.id] ?? "").length !== 6}
                  className="rounded-sm bg-track-green px-3 py-1.5 text-xs font-semibold text-track-ink disabled:opacity-50"
                >
                  Confirm with code
                </button>
              </div>
            )}

            {NEXT_ACTIONS[order.status] && (
              <div className="mt-2 flex gap-2">
                {NEXT_ACTIONS[order.status]!.map((action) => (
                  <button
                    key={action.next}
                    onClick={() => advance(order.id, action.next)}
                    disabled={updatingId === order.id}
                    className="rounded-sm bg-track-ink px-3 py-1.5 text-xs font-semibold text-surface-white disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
