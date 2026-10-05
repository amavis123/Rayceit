import { Show } from "@clerk/nextjs";
import { MerchantDashboard } from "@/components/MerchantDashboard";

export default function Home() {
  return (
    <>
      <Show when="signed-in">
        <MerchantDashboard />
      </Show>
      <Show when="signed-out">
        <div className="flex flex-col gap-4 px-6 py-16">
          <h1 className="text-2xl font-bold tracking-tight">Order queue</h1>
          <p className="max-w-md text-checkpoint-grey">
            Sign in to set up your shop and manage your catalog.
          </p>
        </div>
      </Show>
    </>
  );
}
