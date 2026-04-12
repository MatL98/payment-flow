export const PROVIDER_EVENT_TYPES = [
  "payment.processing",
  "payment.approved",
  "payment.failed"
] as const;

export type ProviderEventType = (typeof PROVIDER_EVENT_TYPES)[number];

export interface ProviderWebhookEvent {
  eventId: string;
  type: ProviderEventType;
  paymentId: string;
  occurredAt: string;
  providerReference?: string;
  failureReason?: string;
}

