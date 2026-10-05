"use client";

import { use, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Merchant, Product } from "@/lib/types";
import { useRace } from "@/lib/race";

export default function MerchantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { addItem, stops } = useRace();
  const stop = stops.find((s) => s.merchantId === id);

  useEffect(() => {
    (async () => {
      try {
        const [m, p] = await Promise.all([
          apiFetch<Merchant>(`/catalog/merchants/${id}`, null),
          apiFetch<Product[]>(`/catalog/merchants/${id}/products`, null),
        ]);
        setMerchant(m);
        setProducts(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    })();
  }, [id]);

  function quantityFor(productId: string) {
    return stop?.items.find((i) => i.productId === productId)?.quantity ?? 0;
  }

  if (error) return <p className="px-6 py-8 text-sm text-red-flag">{error}</p>;
  if (!merchant) return <p className="px-6 py-8 text-sm text-checkpoint-grey">Loading...</p>;

  return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-4">
        {merchant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={merchant.logoUrl}
            alt={`${merchant.businessName} logo`}
            className="h-16 w-16 shrink-0 rounded-full object-contain bg-surface-white shadow-sm"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-white font-display text-2xl font-bold text-checkpoint-grey shadow-sm">
            {merchant.businessName.charAt(0)}
          </div>
        )}
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{merchant.businessName}</h1>
          <p className="text-sm text-checkpoint-grey">
            {merchant.category} &middot; {merchant.address}
          </p>
        </div>
      </div>

      {stops.length > 0 && !stop && (
        <p className="mt-4 rounded-2xl bg-amber-flag/10 px-4 py-2 text-sm text-track-ink">
          Adding something here will add {merchant.businessName} as another stop on your Race.
        </p>
      )}

      {products.length === 0 && (
        <p className="mt-6 text-checkpoint-grey">No items on the menu yet.</p>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {products.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-2xl border border-checkpoint-grey/20 bg-surface-white px-5 py-4 shadow-sm"
          >
            <div>
              <p className="font-semibold">{p.name}</p>
              {p.description && <p className="text-sm text-checkpoint-grey">{p.description}</p>}
              <p className="text-sm text-checkpoint-grey">
                A${p.price} &middot; ~{p.prepTimeMinutes} min
              </p>
            </div>
            <button
              onClick={() => addItem(id, merchant.businessName, p)}
              className="rounded-full bg-track-green px-4 py-2 text-sm font-semibold text-track-ink"
            >
              Add{quantityFor(p.id) > 0 ? ` (${quantityFor(p.id)})` : ""}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
