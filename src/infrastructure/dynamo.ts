import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const runningInSamLocal = process.env.AWS_SAM_LOCAL === "true";
const dynamoEndpoint = process.env.DYNAMODB_ENDPOINT ?? (runningInSamLocal ? "http://host.docker.internal:8000" : undefined);

console.info("DynamoDB client configuration", {
  runningInSamLocal,
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: dynamoEndpoint ?? "aws-managed"
});

const client = new DynamoDBClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: dynamoEndpoint,
  credentials: dynamoEndpoint
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "local",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "local"
      }
    : undefined
});

export const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true
  }
});
