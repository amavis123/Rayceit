"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function StripeCompletePage() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<"checking" | "done" | "incomplete">("checking");

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const result = await apiFetch<{ chargesEnabled: boolean }>(
        "/merchants/me/stripe/status",
        token,
      );
      setStatus(result.chargesEnabled ? "done" : "incomplete");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="px-6 py-16 text-center">
      {status === "checking" && <p>Checking your Stripe status...</p>}
      {status === "done" && <p className="font-semibold text-pit-complete">You&apos;re connected! You can now take payments.</p>}
      {status === "incomplete" && (
        <p>
          Stripe setup isn&apos;t finished yet. Head back to your dashboard to continue.
        </p>
      )}
      <Link href="/" className="mt-4 inline-block underline">
        Back to dashboard
      </Link>
    </div>
  );
}
