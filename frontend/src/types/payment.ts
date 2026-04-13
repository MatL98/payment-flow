export type PaymentStatus =
  | "CREATED"
  | "INITIATED"
  | "REDIRECT_REQUIRED"
  | "PROCESSING"
  | "APPROVED"
  | "FAILED";

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

export type WebhookEventType = "payment.processing" | "payment.approved" | "payment.failed";

