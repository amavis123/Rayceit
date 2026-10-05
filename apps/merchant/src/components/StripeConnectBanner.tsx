"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

export function StripeConnectBanner() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const { url } = await apiFetch<{ url: string }>(
        "/merchants/me/stripe/onboarding-link",
        token,
        { method: "POST" },
      );
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} (this usually means Stripe test keys aren't set up yet)`
          : "Something went wrong",
      );
      setLoading(false);
    }
  }

  return (
    <div className="mx-6 mt-6 rounded-sm border border-amber-flag bg-amber-flag/10 px-4 py-3">
      <p className="text-sm font-semibold">Connect Stripe to get paid</p>
      <p className="mt-1 text-sm text-checkpoint-grey">
        You need to connect a Stripe account before customers can pay you.
      </p>
      {error && <p className="mt-2 text-sm text-red-flag">{error}</p>}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="mt-3 rounded-sm bg-track-ink px-4 py-2 text-sm font-semibold text-surface-white disabled:opacity-50"
      >
        {loading ? "Redirecting..." : "Connect with Stripe"}
      </button>
    </div>
  );
}
