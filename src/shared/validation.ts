import { ProviderWebhookEvent, PROVIDER_EVENT_TYPES } from "../domain/events/types";
import { CreatePaymentInput } from "../domain/payment/types";
import { BadRequestError } from "./errors";

export function validateCreatePaymentInput(input: unknown): CreatePaymentInput {
  if (!input || typeof input !== "object") {
    throw new BadRequestError("Body must be an object");
  }

  const { amount, currency } = input as Record<string, unknown>;

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    throw new BadRequestError("amount must be a positive number");
  }

  if (typeof currency !== "string" || currency.trim().length !== 3) {
    throw new BadRequestError("currency must be a 3-letter code");
  }

  return {
    amount,
    currency: currency.toUpperCase()
  };
}

export function validateWebhookEvent(input: unknown): ProviderWebhookEvent {
  if (!input || typeof input !== "object") {
    throw new BadRequestError("Body must be an object");
  }

  const event = input as Record<string, unknown>;

  if (typeof event.eventId !== "string" || event.eventId.trim().length === 0) {
    throw new BadRequestError("eventId is required");
  }

  if (typeof event.paymentId !== "string" || event.paymentId.trim().length === 0) {
    throw new BadRequestError("paymentId is required");
  }

  if (typeof event.occurredAt !== "string" || Number.isNaN(Date.parse(event.occurredAt))) {
    throw new BadRequestError("occurredAt must be an ISO timestamp");
  }

  if (typeof event.type !== "string" || !PROVIDER_EVENT_TYPES.includes(event.type as ProviderWebhookEvent["type"])) {
    throw new BadRequestError("Unsupported provider event type");
  }

  if (event.failureReason !== undefined && typeof event.failureReason !== "string") {
    throw new BadRequestError("failureReason must be a string");
  }

  if (event.providerReference !== undefined && typeof event.providerReference !== "string") {
    throw new BadRequestError("providerReference must be a string");
  }

  return {
    eventId: event.eventId,
    paymentId: event.paymentId,
    occurredAt: event.occurredAt,
    type: event.type as ProviderWebhookEvent["type"],
    failureReason: event.failureReason as string | undefined,
    providerReference: event.providerReference as string | undefined
  };
}

