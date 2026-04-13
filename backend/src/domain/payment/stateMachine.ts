import { Payment, PaymentStateChange, PaymentTransitionEvent } from "./types";

function applyChange(payment: Payment, patch: Partial<Payment>, occurredAt: string): PaymentStateChange {
  const next: Payment = {
    ...payment,
    ...patch,
    updatedAt: occurredAt,
    version: payment.version + 1
  };

  const changed = JSON.stringify(next) !== JSON.stringify(payment);

  return {
    payment: changed ? next : payment,
    changed
  };
}

export function reducePayment(current: Payment | null, event: PaymentTransitionEvent): PaymentStateChange {
  if (!current) {
    if (event.type !== "payment.created") {
      throw new Error(`Payment must be created before applying ${event.type}`);
    }

    return {
      changed: true,
      payment: {
        id: event.paymentId,
        amount: event.amount,
        currency: event.currency,
        status: "CREATED",
        version: 1,
        createdAt: event.occurredAt,
        updatedAt: event.occurredAt
      }
    };
  }

  switch (event.type) {
    case "payment.created":
      return { payment: current, changed: false };
    case "payment.initiated":
      if (current.status !== "CREATED") {
        return { payment: current, changed: false };
      }
      return applyChange(current, { status: "INITIATED" }, event.occurredAt);
    case "payment.redirect_required":
      if (current.status !== "INITIATED") {
        return { payment: current, changed: false };
      }
      return applyChange(
        current,
        {
          status: "REDIRECT_REQUIRED",
          redirectUrl: event.redirectUrl,
          providerReference: event.providerReference
        },
        event.occurredAt
      );
    case "payment.processing":
      if (current.status === "APPROVED" || current.status === "FAILED") {
        return { payment: current, changed: false };
      }
      return applyChange(
        current,
        {
          status: "PROCESSING",
          providerReference: event.providerReference ?? current.providerReference
        },
        event.occurredAt
      );
    case "payment.approved":
      if (current.status === "APPROVED") {
        return { payment: current, changed: false };
      }
      return applyChange(
        current,
        {
          status: "APPROVED",
          providerReference: event.providerReference ?? current.providerReference,
          failureReason: undefined
        },
        event.occurredAt
      );
    case "payment.failed":
      if (current.status === "APPROVED" || current.status === "FAILED") {
        return { payment: current, changed: false };
      }
      return applyChange(
        current,
        {
          status: "FAILED",
          providerReference: event.providerReference ?? current.providerReference,
          failureReason: event.failureReason ?? "Provider reported failure"
        },
        event.occurredAt
      );
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

