"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { urlBase64ToUint8Array } from "@raceit/shared";
import { apiFetch } from "@/lib/api";

type Status = "idle" | "enabling" | "enabled" | "unsupported" | "denied" | "error";

export function EnableNotifications() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    setStatus("enabling");
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const token = await getToken();
      const { publicKey } = await apiFetch<{ publicKey: string }>("/push/vapid-public-key", null);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      await apiFetch("/push/subscribe", token, {
        method: "POST",
        body: JSON.stringify(subscription.toJSON()),
      });

      setStatus("enabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  if (status === "enabled") {
    return <p className="text-sm text-checkpoint-grey">Notifications enabled for this device.</p>;
  }

  return (
    <div>
      <button
        onClick={enable}
        disabled={status === "enabling"}
        className="rounded-sm border border-checkpoint-grey/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {status === "enabling" ? "Enabling..." : "Enable notifications"}
      </button>
      {status === "unsupported" && (
        <p className="mt-1 text-sm text-checkpoint-grey">This browser doesn&apos;t support notifications.</p>
      )}
      {status === "denied" && (
        <p className="mt-1 text-sm text-checkpoint-grey">
          Notifications were blocked — enable them in your browser settings to turn this on.
        </p>
      )}
      {status === "error" && error && <p className="mt-1 text-sm text-red-flag">{error}</p>}
    </div>
  );
}
