export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, "not_found");
  }
}

export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, "bad_request");
  }
}

