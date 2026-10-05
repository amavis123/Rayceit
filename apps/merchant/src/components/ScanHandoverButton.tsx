"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { useAuth } from "@clerk/nextjs";
import { apiFetch } from "@/lib/api";

const SCAN_INTERVAL_MS = 300;

export function ScanHandoverButton({ onConfirmed }: { onConfirmed: () => void }) {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Point the camera at the customer's QR code");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const confirmingRef = useRef(false);

  async function openScanner() {
    setError(null);
    setOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      intervalRef.current = setInterval(scanFrame, SCAN_INTERVAL_MS);
    } catch {
      setError("Couldn't access the camera. You can enter the code manually on the order card instead.");
    }
  }

  function closeScanner() {
    setOpen(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function scanFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA || confirmingRef.current) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      const [orderId, confirmationCode] = code.data.split(":");
      if (orderId && confirmationCode) {
        confirmingRef.current = true;
        confirm(orderId, confirmationCode);
      }
    }
  }

  async function confirm(orderId: string, code: string) {
    setStatus("Confirming...");
    try {
      const token = await getToken();
      await apiFetch(`/orders/${orderId}/confirm-handover`, token, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setStatus("Confirmed!");
      onConfirmed();
      setTimeout(closeScanner, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code didn't match an order ready for pickup");
      confirmingRef.current = false;
      setStatus("Point the camera at the customer's QR code");
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <>
      <button
        onClick={openScanner}
        className="rounded-sm bg-track-ink px-3 py-1.5 text-sm font-semibold text-surface-white"
      >
        Scan to confirm pickup
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-track-ink/90 px-6">
          <video ref={videoRef} className="w-full max-w-sm rounded-sm" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          <p className="text-sm font-semibold text-startline-white">{status}</p>
          {error && <p className="text-sm text-red-flag">{error}</p>}
          <button
            onClick={closeScanner}
            className="rounded-sm border border-startline-white px-4 py-2 text-sm font-semibold text-startline-white"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
