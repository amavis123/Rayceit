"use client";

import { createContext, useContext, useState } from "react";
import type { Product } from "./types";

export interface RaceCartItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface RaceStop {
  merchantId: string;
  merchantName: string;
  items: RaceCartItem[];
}

interface RaceContextValue {
  stops: RaceStop[];
  addItem: (merchantId: string, merchantName: string, product: Product) => void;
  removeItem: (merchantId: string, productId: string) => void;
  removeStop: (merchantId: string) => void;
  clear: () => void;
  stopTotal: (stop: RaceStop) => number;
  grandTotal: number;
  itemCount: number;
}

const RaceContext = createContext<RaceContextValue | null>(null);

export function RaceProvider({ children }: { children: React.ReactNode }) {
  const [stops, setStops] = useState<RaceStop[]>([]);

  function addItem(merchantId: string, merchantName: string, product: Product) {
    setStops((prev) => {
      const stopIndex = prev.findIndex((s) => s.merchantId === merchantId);
      if (stopIndex === -1) {
        return [
          ...prev,
          {
            merchantId,
            merchantName,
            items: [{ productId: product.id, name: product.name, unitPrice: Number(product.price), quantity: 1 }],
          },
        ];
      }

      const stop = prev[stopIndex];
      const existingItem = stop.items.find((i) => i.productId === product.id);
      const items = existingItem
        ? stop.items.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [...stop.items, { productId: product.id, name: product.name, unitPrice: Number(product.price), quantity: 1 }];

      const next = [...prev];
      next[stopIndex] = { ...stop, items };
      return next;
    });
  }

  function removeItem(merchantId: string, productId: string) {
    setStops((prev) =>
      prev
        .map((s) =>
          s.merchantId === merchantId ? { ...s, items: s.items.filter((i) => i.productId !== productId) } : s,
        )
        .filter((s) => s.items.length > 0),
    );
  }

  function removeStop(merchantId: string) {
    setStops((prev) => prev.filter((s) => s.merchantId !== merchantId));
  }

  function clear() {
    setStops([]);
  }

  function stopTotal(stop: RaceStop) {
    return stop.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  }

  const grandTotal = stops.reduce((sum, s) => sum + stopTotal(s), 0);
  const itemCount = stops.reduce((sum, s) => sum + s.items.reduce((n, i) => n + i.quantity, 0), 0);

  return (
    <RaceContext.Provider
      value={{ stops, addItem, removeItem, removeStop, clear, stopTotal, grandTotal, itemCount }}
    >
      {children}
    </RaceContext.Provider>
  );
}

export function useRace() {
  const ctx = useContext(RaceContext);
  if (!ctx) {
    throw new Error("useRace must be used inside RaceProvider");
  }
  return ctx;
}
