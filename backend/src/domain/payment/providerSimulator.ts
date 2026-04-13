import { randomUUID } from "node:crypto";
import { InitiatePaymentResult, Payment } from "./types";

export function simulateProviderInitiation(payment: Payment): InitiatePaymentResult {
  const providerReference = `prov_${randomUUID()}`;
  const redirectUrl = `https://provider.example.test/checkout/${payment.id}?ref=${providerReference}`;

  return {
    redirectUrl,
    providerReference
  };
}
