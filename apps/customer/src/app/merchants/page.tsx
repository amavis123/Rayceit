import Link from "next/link";
import type { Merchant } from "@/lib/types";

async function getMerchants(): Promise<Merchant[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const res = await fetch(`${apiUrl}/catalog/merchants`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function MerchantsPage() {
  const merchants = await getMerchants();

  return (
    <div className="px-6 py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight">Shops near you</h1>

      {merchants.length === 0 && (
        <p className="mt-4 text-checkpoint-grey">No shops have joined yet — check back soon.</p>
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {merchants.map((m) => (
          <li key={m.id}>
            <Link
              href={`/merchants/${m.id}`}
              className="flex items-center gap-4 rounded-2xl border border-checkpoint-grey/20 bg-surface-white px-5 py-4 shadow-sm"
            >
              {m.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.logoUrl}
                  alt={`${m.businessName} logo`}
                  className="h-12 w-12 shrink-0 rounded-full object-contain bg-startline-white"
                />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-startline-white font-display text-lg font-bold text-checkpoint-grey">
                  {m.businessName.charAt(0)}
                </div>
              )}
              <div>
                <p className="font-semibold">{m.businessName}</p>
                <p className="text-sm text-checkpoint-grey">
                  {m.category} &middot; {m.address}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
