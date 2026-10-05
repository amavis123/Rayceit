export interface Merchant {
  id: string;
  businessName: string;
  category: string;
  address: string;
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

export interface Order {
  id: string;
  raceId: string;
  merchantId: string;
  items: OrderItem[];
  status: string;
  payment: { status: string; amount: string } | null;
}

export interface RaceStopOrder {
  id: string;
  stopSequence: number;
  merchantId: string;
  items: OrderItem[];
  status: string;
  confirmationCode: string;
  payment: { status: string; amount: string } | null;
  merchant: { businessName: string; address: string; category: string; logoUrl: string | null };
}

export interface Race {
  id: string;
  status: string;
  timeBudgetMinutes: number | null;
  startedAt: string | null;
  completedAt: string | null;
  orders: RaceStopOrder[];
}
