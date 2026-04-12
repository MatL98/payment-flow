import test from "node:test";
import assert from "node:assert/strict";
import { reducePayment } from "../src/domain/payment/stateMachine";
import { Payment } from "../src/domain/payment/types";

function buildPayment(status: Payment["status"]): Payment {
  return {
    id: "pay_123",
    amount: 1000,
    currency: "USD",
    status,
    version: 2,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

test("creates a payment from the created event", () => {
  const result = reducePayment(null, {
    type: "payment.created",
    paymentId: "pay_123",
    amount: 1000,
    currency: "USD",
    occurredAt: "2026-01-01T00:00:00.000Z"
  });

  assert.equal(result.payment.status, "CREATED");
  assert.equal(result.changed, true);
});

test("moves from created to initiated to redirect required", () => {
  const created = buildPayment("CREATED");
  const initiated = reducePayment(created, {
    type: "payment.initiated",
    occurredAt: "2026-01-01T00:01:00.000Z"
  });
  const redirected = reducePayment(initiated.payment, {
    type: "payment.redirect_required",
    occurredAt: "2026-01-01T00:02:00.000Z",
    providerReference: "prov_1",
    redirectUrl: "https://provider.example.test"
  });

  assert.equal(initiated.payment.status, "INITIATED");
  assert.equal(redirected.payment.status, "REDIRECT_REQUIRED");
  assert.equal(redirected.payment.providerReference, "prov_1");
});

test("allows approved to arrive before processing", () => {
  const redirected = buildPayment("REDIRECT_REQUIRED");
  const approved = reducePayment(redirected, {
    type: "payment.approved",
    occurredAt: "2026-01-01T00:03:00.000Z",
    providerReference: "prov_1"
  });
  const lateProcessing = reducePayment(approved.payment, {
    type: "payment.processing",
    occurredAt: "2026-01-01T00:04:00.000Z",
    providerReference: "prov_1"
  });

  assert.equal(approved.payment.status, "APPROVED");
  assert.equal(lateProcessing.payment.status, "APPROVED");
  assert.equal(lateProcessing.changed, false);
});

test("does not regress approved payments to failed", () => {
  const approved = buildPayment("APPROVED");
  const result = reducePayment(approved, {
    type: "payment.failed",
    occurredAt: "2026-01-01T00:05:00.000Z",
    failureReason: "issuer_declined"
  });

  assert.equal(result.payment.status, "APPROVED");
  assert.equal(result.changed, false);
});
