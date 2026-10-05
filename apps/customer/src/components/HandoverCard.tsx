"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { RaceStopOrder } from "@/lib/types";

export function HandoverCard({ order, onConfirmed }: { order: RaceStopOrder; onConfirmed: () => void }) {
  const { getToken } = useAuth();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    QRCode.toDataURL(`${order.id}:${order.confirmationCode}`, { margin: 1, width: 220 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [order.id, order.confirmationCode]);

  async function handleConfirm() {
    setConfirming(true);
    setError(null);
    try {
      const token = await getToken();
      await apiFetch(`/orders/${order.id}/confirm-pickup`, token, { method: "POST" });
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setConfirming(false);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-track-green bg-surface-white px-5 py-5 text-center shadow-sm">
      <p className="font-semibold">Ready for pickup at {order.merchant.businessName}</p>
      <p className="mt-1 text-sm text-checkpoint-grey">
        Show this to staff, or tap confirm once you have your order.
      </p>

      {qrDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qrDataUrl} alt="Pickup confirmation QR code" className="mx-auto mt-4 rounded-sm" />
      )}
      <p className="mt-2 font-mono text-2xl font-bold tracking-widest">{order.confirmationCode}</p>

      {error && <p className="mt-2 text-sm text-red-flag">{error}</p>}

      <button
        onClick={handleConfirm}
        disabled={confirming}
        className="mt-4 w-full rounded-full bg-track-green px-6 py-3 text-sm font-semibold text-track-ink disabled:opacity-50"
      >
        {confirming ? "Confirming..." : "Confirm pickup"}
      </button>
    </div>
  );
}
