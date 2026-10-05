"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductForm } from "./ProductForm";

export function ProductCatalog() {
  const { getToken } = useAuth();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  async function load() {
    try {
      const token = await getToken();
      const list = await apiFetch<Product[]>("/products/mine", token);
      setProducts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Remove this product?")) return;
    const token = await getToken();
    await apiFetch(`/products/${id}`, token, { method: "DELETE" });
    load();
  }

  return (
    <div className="px-6 py-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold tracking-tight">Your catalog</h2>
        <button
          onClick={() => setEditing("new")}
          className="rounded-sm bg-track-green px-3 py-1.5 text-sm font-semibold text-track-ink"
        >
          + Add product
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-flag">{error}</p>}

      {products === null && !error && (
        <p className="mt-4 text-sm text-checkpoint-grey">Loading...</p>
      )}

      {products?.length === 0 && (
        <p className="mt-4 text-sm text-checkpoint-grey">
          No products yet. Add your first one to start building your catalog.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-2">
        {products?.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-sm border border-checkpoint-grey/20 px-4 py-3"
          >
            <div>
              <p className="font-semibold">
                {p.name}
                {!p.isActive && (
                  <span className="ml-2 text-xs font-normal text-checkpoint-grey">
                    (inactive)
                  </span>
                )}
              </p>
              <p className="text-sm text-checkpoint-grey">
                A${p.price} &middot; {p.prepTimeMinutes} min prep
              </p>
            </div>
            <div className="flex gap-3 text-sm font-semibold">
              <button onClick={() => setEditing(p)} className="text-track-ink underline">
                Edit
              </button>
              <button onClick={() => handleDelete(p.id)} className="text-red-flag underline">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {editing && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
