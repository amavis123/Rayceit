export interface Merchant {
  id: string;
  businessName: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  stripeConnectAccountId: string | null;
  stripeOnboardingComplete: boolean;
  status: string;
  logoUrl: string | null;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: string;
  photoUrl: string | null;
  prepTimeMinutes: number;
  isActive: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export type OrderStatus = "pending" | "preparing" | "ready" | "collected" | "no_show" | "cancelled";

export interface Order {
  id: string;
  raceId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  currentEta: string | null;
  payment: { status: string; amount: string } | null;
}
