import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { paymentService } from "./dependencies";
import { handleError, json } from "../shared/http";
import { requirePathParameter } from "../shared/parsing";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const paymentId = requirePathParameter(event, "id");
    const payment = await paymentService.getPayment(paymentId);

    return json(200, payment);
  } catch (error) {
    return handleError(error);
  }
};

