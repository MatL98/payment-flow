import { Payment } from "../domain/payment/types";

export interface PaymentRepository {
  getById(id: string): Promise<Payment | null>;
  put(payment: Payment): Promise<void>;
  update(payment: Payment, expectedVersion: number): Promise<void>;
}

