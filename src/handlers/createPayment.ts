import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { paymentService } from "./dependencies";
import { handleError, json } from "../shared/http";
import { parseJsonBody, readIdempotencyKey } from "../shared/parsing";
import { validateCreatePaymentInput } from "../shared/validation";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const input = validateCreatePaymentInput(parseJsonBody(event));
    const idempotencyKey = readIdempotencyKey(event);
    const result = await paymentService.createPayment(input, idempotencyKey);

    return json(result.replayed ? 200 : 201, result.payment);
  } catch (error) {
    return handleError(error);
  }
};

