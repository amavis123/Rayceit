"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

export default function StripeRefreshPage() {
  const { getToken } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const { url } = await apiFetch<{ url: string }>(
          "/merchants/me/stripe/onboarding-link",
          token,
          { method: "POST" },
        );
        window.location.href = url;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-6 py-16 text-center">
      {error ? <p className="text-red-flag">{error}</p> : <p>Getting a fresh link...</p>}
    </div>
  );
}
