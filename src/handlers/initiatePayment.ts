import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { paymentService } from "./dependencies";
import { handleError, json } from "../shared/http";
import { readIdempotencyKey, requirePathParameter } from "../shared/parsing";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const paymentId = requirePathParameter(event, "id");
    const idempotencyKey = readIdempotencyKey(event);
    const result = await paymentService.initiatePayment(paymentId, idempotencyKey);

    return json(200, result.payment);
  } catch (error) {
    return handleError(error);
  }
};

