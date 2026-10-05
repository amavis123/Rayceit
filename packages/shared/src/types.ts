import type {
  AuthProvider,
  MerchantStatus,
  OrderStatus,
  PaymentStatus,
  RaceStatus,
} from "./enums";

// Mirrors racyeit.md Section 5 (Data Model). Keep in sync with
// apps/backend/prisma/schema.prisma — this is the shape the frontends
// consume over the API, not necessarily the exact DB row shape.

export interface User {
  id: string;
  name: string;
  email: string;
  authProvider: AuthProvider;
  createdAt: string;
}

export interface Merchant {
  id: string;
  businessName: string;
  category: string;
  address: string;
  geo: { lat: number; lng: number };
  stripeConnectAccountId: string | null;
  status: MerchantStatus;
  logoUrl: string | null;
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: number;
  photoUrl: string | null;
  prepTimeMinutes: number;
  isActive: boolean;
}

export interface Race {
  id: string;
  customerId: string;
  status: RaceStatus;
  timeBudgetMinutes: number | null;
  startedAt: string | null;
  completedAt: string | null;
  orders: Order[];
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  raceId: string;
  stopSequence: number;
  customerId: string;
  merchantId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  etaAtOrderTime: string | null;
  currentEta: string | null;
  paymentId: string | null;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  commissionAmount: number;
  merchantPayoutAmount: number;
  stripePaymentIntentId: string | null;
  stripeTransferId: string | null;
  status: PaymentStatus;
}

export interface LocationPing {
  id: string;
  raceId: string;
  customerId: string;
  lat: number;
  lng: number;
  timestamp: string;
}
