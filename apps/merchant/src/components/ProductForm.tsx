"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { Product } from "@/lib/types";

export function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { getToken } = useAuth();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price ?? "");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    product?.prepTimeMinutes?.toString() ?? "5",
  );
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const body = {
        name,
        description,
        price: Number(price),
        prepTimeMinutes: Number(prepTimeMinutes),
        isActive,
      };
      if (product) {
        await apiFetch(`/products/${product.id}`, token, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await apiFetch("/products", token, {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-track-ink/40 px-4">
      <div className="w-full max-w-sm rounded-sm bg-surface-white p-6">
        <h3 className="text-lg font-bold">{product ? "Edit product" : "Add product"}</h3>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-sm border border-checkpoint-grey/40 px-3 py-2 text-sm font-normal"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-sm border border-checkpoint-grey/40 px-3 py-2 text-sm font-normal"
              rows={2}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Price (AUD)
            <input
              required
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-sm border border-checkpoint-grey/40 px-3 py-2 text-sm font-normal"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-semibold">
            Prep time (minutes)
            <input
              required
              type="number"
              min="0"
              max="240"
              value={prepTimeMinutes}
              onChange={(e) => setPrepTimeMinutes(e.target.value)}
              className="rounded-sm border border-checkpoint-grey/40 px-3 py-2 text-sm font-normal"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active (visible to customers)
          </label>

          {error && <p className="text-sm text-red-flag">{error}</p>}

          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-sm bg-track-green px-4 py-2 text-sm font-semibold text-track-ink disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-checkpoint-grey/40 px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
