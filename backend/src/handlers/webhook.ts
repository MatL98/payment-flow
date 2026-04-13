import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { paymentService } from "./dependencies";
import { handleError, json } from "../shared/http";
import { parseJsonBody } from "../shared/parsing";
import { validateWebhookEvent } from "../shared/validation";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const webhookEvent = validateWebhookEvent(parseJsonBody(event));
    const result = await paymentService.processWebhook(webhookEvent);

    return json(200, {
      duplicate: result.duplicate,
      changed: result.changed,
      payment: result.payment
    });
  } catch (error) {
    return handleError(error);
  }
};

