import { PaymentService } from "../application/paymentService";
import { config } from "../infrastructure/config";
import { DynamoIdempotencyRepository } from "../repositories/dynamoIdempotencyRepository";
import { DynamoPaymentRepository } from "../repositories/dynamoPaymentRepository";

const paymentRepository = new DynamoPaymentRepository(config.paymentsTableName);
const idempotencyRepository = new DynamoIdempotencyRepository(config.idempotencyTableName);

export const paymentService = new PaymentService(paymentRepository, idempotencyRepository);

