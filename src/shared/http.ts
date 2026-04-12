import { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { AppError } from "./errors";

export function json(statusCode: number, body: unknown): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

export function handleError(error: unknown): APIGatewayProxyStructuredResultV2 {
  if (error instanceof AppError) {
    return json(error.statusCode, {
      error: error.code,
      message: error.message
    });
  }

  console.error("Unhandled error", error);

  return json(500, {
    error: "internal_server_error",
    message: "Unexpected error"
  });
}

