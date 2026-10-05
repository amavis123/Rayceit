"use client";

import Link from "next/link";
import { useRace } from "@/lib/race";

export function RaceBadge() {
  const { itemCount } = useRace();

  if (itemCount === 0) return null;

  return (
    <Link
      href="/race"
      className="rounded-full bg-track-ink px-3 py-1.5 text-sm font-semibold text-startline-white"
    >
      Race ({itemCount})
    </Link>
  );
}
