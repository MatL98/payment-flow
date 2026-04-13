import { Payment, WebhookEventType } from "../types/payment";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export function createPayment(input: { amount: number; currency: string; idempotencyKey?: string }) {
  return request<Payment>("/payments", {
    method: "POST",
    headers: input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : undefined,
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency
    })
  });
}

export function initiatePayment(paymentId: string) {
  return request<Payment>(`/payments/${paymentId}/initiate`, {
    method: "POST"
  });
}

export function getPayment(paymentId: string) {
  return request<Payment>(`/payments/${paymentId}`);
}

export function sendWebhook(input: {
  paymentId: string;
  type: WebhookEventType;
  providerReference?: string;
  failureReason?: string;
}) {
  return request<{ payment: Payment }>(`/webhook`, {
    method: "POST",
    body: JSON.stringify({
      eventId: `evt-${input.type}-${Date.now()}`,
      paymentId: input.paymentId,
      type: input.type,
      providerReference: input.providerReference,
      failureReason: input.failureReason,
      occurredAt: new Date().toISOString()
    })
  });
}

