import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamo } from "../infrastructure/dynamo";
import { IdempotencyRecord, IdempotencyRepository } from "./idempotencyRepository";

interface StoredIdempotencyRecord extends IdempotencyRecord {
  pk: string;
}

function toPk(scope: string, key: string): string {
  return `${scope}#${key}`;
}

export class DynamoIdempotencyRepository implements IdempotencyRepository {
  constructor(private readonly tableName: string) {}

  async get(scope: string, key: string): Promise<IdempotencyRecord | null> {
    const result = await dynamo.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk: toPk(scope, key) }
      })
    );

    if (!result.Item) {
      return null;
    }

    const item = result.Item as StoredIdempotencyRecord;

    return {
      key: item.key,
      scope: item.scope,
      paymentId: item.paymentId,
      createdAt: item.createdAt
    };
  }

  async put(record: IdempotencyRecord): Promise<boolean> {
    try {
      await dynamo.send(
        new PutCommand({
          TableName: this.tableName,
          Item: {
            pk: toPk(record.scope, record.key),
            ...record
          },
          ConditionExpression: "attribute_not_exists(pk)"
        })
      );

      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return false;
      }

      throw error;
    }
  }
}
