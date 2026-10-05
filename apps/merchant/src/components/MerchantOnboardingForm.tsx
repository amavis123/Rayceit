"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";
import type { Merchant } from "@/lib/types";

const CATEGORIES = ["Cafe", "Chemist", "Dry cleaner", "Restaurant", "Other"];

export function MerchantOnboardingForm({ onCreated }: { onCreated: (merchant: Merchant) => void }) {
  const { getToken } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const merchant = await apiFetch<Merchant>("/merchants", token, {
        method: "POST",
        body: JSON.stringify({ businessName, category, address, lat: 0, lng: 0 }),
      });
      onCreated(merchant);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Set up your shop</h1>
      <p className="mt-1 text-sm text-checkpoint-grey">
        This creates your merchant profile. You can add products next.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Business name
          <input
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="rounded-sm border border-checkpoint-grey/40 px-3 py-2 text-sm font-normal"
            placeholder="Corner Cafe"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-sm border border-checkpoint-grey/40 px-3 py-2 text-sm font-normal"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          Address
          <input
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="rounded-sm border border-checkpoint-grey/40 px-3 py-2 text-sm font-normal"
            placeholder="123 Main St"
          />
        </label>

        {error && <p className="text-sm text-red-flag">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-sm bg-track-green px-4 py-2 text-sm font-semibold text-track-ink disabled:opacity-50"
        >
          {submitting ? "Creating..." : "Create shop profile"}
        </button>
      </form>
    </div>
  );
}
