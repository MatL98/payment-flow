import { randomUUID } from "node:crypto";
import { mapWebhookToPaymentEvent } from "../domain/events/mappers";
import { ProviderWebhookEvent } from "../domain/events/types";
import { simulateProviderInitiation } from "../domain/payment/providerSimulator";
import { reducePayment } from "../domain/payment/stateMachine";
import { CreatePaymentInput, Payment } from "../domain/payment/types";
import { IdempotencyRepository } from "../repositories/idempotencyRepository";
import { VersionConflictError } from "../repositories/dynamoPaymentRepository";
import { PaymentRepository } from "../repositories/paymentRepository";
import { BadRequestError, NotFoundError } from "../shared/errors";

export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly idempotencyRepository: IdempotencyRepository
  ) {}

  async createPayment(input: CreatePaymentInput, idempotencyKey?: string): Promise<{ payment: Payment; replayed: boolean }> {
    if (idempotencyKey) {
      const existingRecord = await this.idempotencyRepository.get("payment:create", idempotencyKey);

      if (existingRecord) {
        const existingPayment = await this.paymentRepository.getById(existingRecord.paymentId);

        if (!existingPayment) {
          throw new Error("Idempotency record exists without payment");
        }

        return {
          payment: existingPayment,
          replayed: true
        };
      }
    }

    const now = new Date().toISOString();
    const paymentId = randomUUID();
    const created = reducePayment(null, {
      type: "payment.created",
      occurredAt: now,
      paymentId,
      amount: input.amount,
      currency: input.currency
    });

    await this.paymentRepository.put(created.payment);

    if (idempotencyKey) {
      await this.idempotencyRepository.put({
        key: idempotencyKey,
        scope: "payment:create",
        paymentId,
        createdAt: now
      });
    }

    return {
      payment: created.payment,
      replayed: false
    };
  }

  async initiatePayment(paymentId: string, idempotencyKey?: string): Promise<{ payment: Payment; replayed: boolean }> {
    if (idempotencyKey) {
      const existingRecord = await this.idempotencyRepository.get("payment:initiate", idempotencyKey);

      if (existingRecord) {
        const existingPayment = await this.paymentRepository.getById(existingRecord.paymentId);

        if (!existingPayment) {
          throw new Error("Idempotency record exists without payment");
        }

        return {
          payment: existingPayment,
          replayed: true
        };
      }
    }

    const current = await this.paymentRepository.getById(paymentId);

    if (!current) {
      throw new NotFoundError("Payment not found");
    }

    const initiatedAt = new Date().toISOString();
    const initiated = reducePayment(current, {
      type: "payment.initiated",
      occurredAt: initiatedAt
    });

    if (!initiated.changed) {
      throw new BadRequestError(`Payment cannot be initiated from status ${current.status}`);
    }

    const providerResult = simulateProviderInitiation(initiated.payment);
    const redirected = reducePayment(initiated.payment, {
      type: "payment.redirect_required",
      occurredAt: new Date().toISOString(),
      redirectUrl: providerResult.redirectUrl,
      providerReference: providerResult.providerReference
    });

    await this.paymentRepository.update(redirected.payment, current.version);

    if (idempotencyKey) {
      await this.idempotencyRepository.put({
        key: idempotencyKey,
        scope: "payment:initiate",
        paymentId,
        createdAt: initiatedAt
      });
    }

    return {
      payment: redirected.payment,
      replayed: false
    };
  }

  async getPayment(paymentId: string): Promise<Payment> {
    const payment = await this.paymentRepository.getById(paymentId);

    if (!payment) {
      throw new NotFoundError("Payment not found");
    }

    return payment;
  }

  async processWebhook(event: ProviderWebhookEvent): Promise<{ payment: Payment; duplicate: boolean; changed: boolean }> {
    const stored = await this.idempotencyRepository.put({
      key: event.eventId,
      scope: "webhook:event",
      paymentId: event.paymentId,
      createdAt: new Date().toISOString()
    });

    if (!stored) {
      const existing = await this.paymentRepository.getById(event.paymentId);

      if (!existing) {
        throw new NotFoundError("Payment not found");
      }

      return {
        payment: existing,
        duplicate: true,
        changed: false
      };
    }

    const current = await this.paymentRepository.getById(event.paymentId);

    if (!current) {
      throw new NotFoundError("Payment not found");
    }

    const next = reducePayment(current, mapWebhookToPaymentEvent(event));

    if (!next.changed) {
      return {
        payment: current,
        duplicate: false,
        changed: false
      };
    }

    try {
      await this.paymentRepository.update(next.payment, current.version);
    } catch (error) {
      if (error instanceof VersionConflictError) {
        const latest = await this.paymentRepository.getById(event.paymentId);

        if (!latest) {
          throw new NotFoundError("Payment not found");
        }

        const retried = reducePayment(latest, mapWebhookToPaymentEvent(event));

        if (retried.changed) {
          await this.paymentRepository.update(retried.payment, latest.version);
          return {
            payment: retried.payment,
            duplicate: false,
            changed: true
          };
        }

        return {
          payment: latest,
          duplicate: false,
          changed: false
        };
      }

      throw error;
    }

    return {
      payment: next.payment,
      duplicate: false,
      changed: true
    };
  }
}
