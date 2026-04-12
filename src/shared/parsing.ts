import { APIGatewayProxyEventV2 } from "aws-lambda";
import { BadRequestError } from "./errors";

export function parseJsonBody<T>(event: APIGatewayProxyEventV2): T {
  if (!event.body) {
    throw new BadRequestError("Request body is required");
  }

  try {
    return JSON.parse(event.body) as T;
  } catch {
    throw new BadRequestError("Request body must be valid JSON");
  }
}

export function requirePathParameter(event: APIGatewayProxyEventV2, key: string): string {
  const value = event.pathParameters?.[key];

  if (!value) {
    throw new BadRequestError(`Missing path parameter ${key}`);
  }

  return value;
}

export function readIdempotencyKey(event: APIGatewayProxyEventV2): string | undefined {
  return event.headers["idempotency-key"] ?? event.headers["Idempotency-Key"];
}

