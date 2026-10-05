"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch, ApiError } from "@/lib/api";
import type { Merchant } from "@/lib/types";
import { MerchantOnboardingForm } from "./MerchantOnboardingForm";
import { StripeConnectBanner } from "./StripeConnectBanner";
import { ProductCatalog } from "./ProductCatalog";
import { OrderQueue } from "./OrderQueue";
import { EnableNotifications } from "./EnableNotifications";

export function MerchantDashboard() {
  const { getToken, isLoaded } = useAuth();
  const [merchant, setMerchant] = useState<Merchant | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const token = await getToken();
      const result = await apiFetch<Merchant>("/merchants/me", token);
      setMerchant(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setMerchant(null);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    }
  }

  useEffect(() => {
    if (isLoaded) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  if (error) {
    return <p className="px-6 py-8 text-sm text-red-flag">{error}</p>;
  }

  if (merchant === undefined) {
    return <p className="px-6 py-8 text-sm text-checkpoint-grey">Loading...</p>;
  }

  if (merchant === null) {
    return <MerchantOnboardingForm onCreated={setMerchant} />;
  }

  return (
    <div>
      {!merchant.stripeOnboardingComplete && <StripeConnectBanner />}
      <div className="px-6 pt-6">
        <EnableNotifications />
      </div>
      <OrderQueue />
      <div className="border-t border-checkpoint-grey/20">
        <ProductCatalog />
      </div>
    </div>
  );
}
