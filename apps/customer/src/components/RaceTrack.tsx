import type { RaceStopOrder } from "@/lib/types";

const TERMINAL = ["collected", "no_show", "cancelled"];

type CheckpointState = "done" | "current" | "upcoming";

function stateFor(order: RaceStopOrder, firstNonTerminalId: string | undefined): CheckpointState {
  if (TERMINAL.includes(order.status)) return "done";
  if (order.id === firstNonTerminalId) return "current";
  return "upcoming";
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Waiting to start",
  preparing: "Being prepared",
  ready: "Ready for pickup",
  collected: "Collected",
  no_show: "Missed",
  cancelled: "Cancelled",
};

export function RaceTrack({ orders }: { orders: RaceStopOrder[] }) {
  const firstNonTerminal = orders.find((o) => !TERMINAL.includes(o.status));

  return (
    <div className="flex flex-col">
      {orders.map((order, index) => {
        const state = stateFor(order, firstNonTerminal?.id);
        const isLast = index === orders.length - 1;

        return (
          <div key={order.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-mono text-xs font-bold " +
                  (state === "done"
                    ? order.status === "collected"
                      ? "border-pit-complete bg-pit-complete text-startline-white"
                      : "border-red-flag bg-red-flag text-startline-white"
                    : state === "current"
                      ? "border-track-green bg-track-green text-track-ink animate-pulse"
                      : "border-checkpoint-grey/40 bg-startline-white text-checkpoint-grey")
                }
              >
                {order.stopSequence}
              </div>
              {!isLast && <div className="w-0.5 flex-1 bg-checkpoint-grey/20" />}
            </div>
            <div className={isLast ? "pb-0" : "pb-6"}>
              <p className="font-semibold">{order.merchant.businessName}</p>
              <p className="text-sm text-checkpoint-grey">{STATUS_LABEL[order.status] ?? order.status}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
