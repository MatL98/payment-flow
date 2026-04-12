import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { Payment } from "../domain/payment/types";
import { dynamo } from "../infrastructure/dynamo";
import { PaymentRepository } from "./paymentRepository";

export class VersionConflictError extends Error {
  constructor(message = "Payment version conflict") {
    super(message);
    this.name = "VersionConflictError";
  }
}

export class DynamoPaymentRepository implements PaymentRepository {
  constructor(private readonly tableName: string) {}

  async getById(id: string): Promise<Payment | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { id }
      })
    );

    return (result.Item as Payment | undefined) ?? null;
  }

  async put(payment: Payment): Promise<void> {
    await dynamo.send(
      new PutCommand({
        TableName: this.tableName,
        Item: payment,
        ConditionExpression: "attribute_not_exists(id)"
      })
    );
  }

  async update(payment: Payment, expectedVersion: number): Promise<void> {
    try {
      await dynamo.send(
        new PutCommand({
          TableName: this.tableName,
          Item: payment,
          ConditionExpression: "#version = :expectedVersion",
          ExpressionAttributeNames: {
            "#version": "version"
          },
          ExpressionAttributeValues: {
            ":expectedVersion": expectedVersion
          }
        })
      );
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new VersionConflictError();
      }

      throw error;
    }
  }
}

