export const PAYMENT_STATUSES = [
  "CREATED",
  "INITIATED",
  "REDIRECT_REQUIRED",
  "PROCESSING",
  "APPROVED",
  "FAILED"
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  redirectUrl?: string;
  providerReference?: string;
  failureReason?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  amount: number;
  currency: string;
}

export interface InitiatePaymentResult {
  redirectUrl: string;
  providerReference: string;
}

export type PaymentTransitionEvent =
  | { type: "payment.created"; occurredAt: string; paymentId: string; amount: number; currency: string }
  | { type: "payment.initiated"; occurredAt: string }
  | {
      type: "payment.redirect_required";
      occurredAt: string;
      redirectUrl: string;
      providerReference: string;
    }
  | { type: "payment.processing"; occurredAt: string; providerReference?: string }
  | { type: "payment.approved"; occurredAt: string; providerReference?: string }
  | { type: "payment.failed"; occurredAt: string; providerReference?: string; failureReason?: string };

export interface PaymentStateChange {
  payment: Payment;
  changed: boolean;
}

