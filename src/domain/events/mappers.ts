import { ProviderWebhookEvent } from "./types";
import { PaymentTransitionEvent } from "../payment/types";

export function mapWebhookToPaymentEvent(event: ProviderWebhookEvent): PaymentTransitionEvent {
  switch (event.type) {
    case "payment.processing":
      return {
        type: "payment.processing",
        occurredAt: event.occurredAt,
        providerReference: event.providerReference
      };
    case "payment.approved":
      return {
        type: "payment.approved",
        occurredAt: event.occurredAt,
        providerReference: event.providerReference
      };
    case "payment.failed":
      return {
        type: "payment.failed",
        occurredAt: event.occurredAt,
        providerReference: event.providerReference,
        failureReason: event.failureReason
      };
  }
}

