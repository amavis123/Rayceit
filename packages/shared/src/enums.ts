export const RaceStatus = {
  Planning: "planning",
  InProgress: "in_progress",
  Completed: "completed",
  Abandoned: "abandoned",
} as const;
export type RaceStatus = (typeof RaceStatus)[keyof typeof RaceStatus];

export const OrderStatus = {
  Pending: "pending",
  Preparing: "preparing",
  Ready: "ready",
  Collected: "collected",
  NoShow: "no_show",
  Cancelled: "cancelled",
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentStatus = {
  Pending: "pending",
  Succeeded: "succeeded",
  Failed: "failed",
  Refunded: "refunded",
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const MerchantStatus = {
  Onboarding: "onboarding",
  Active: "active",
  Paused: "paused",
  Disabled: "disabled",
} as const;
export type MerchantStatus = (typeof MerchantStatus)[keyof typeof MerchantStatus];

export const AuthProvider = {
  Google: "google",
  Apple: "apple",
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];
