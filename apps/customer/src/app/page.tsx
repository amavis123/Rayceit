import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="font-display text-4xl font-bold tracking-tight">
        Skip the walk in.
      </h1>
      <p className="max-w-md text-checkpoint-grey">
        Order ahead, plan your stops, and let us tell the merchant when
        you&apos;re close.
      </p>
      <Link
        href="/merchants"
        className="mt-2 rounded-full bg-track-green px-6 py-3 text-sm font-semibold text-track-ink"
      >
        Browse shops
      </Link>
    </div>
  );
}
