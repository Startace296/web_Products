export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found"): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string, details?: unknown): ApiError {
    return new ApiError(409, message, details);
  }

  static unprocessable(message: string, details?: unknown): ApiError {
    return new ApiError(422, message, details);
  }

  static tooManyRequests(message = "Too many requests, please try again later"): ApiError {
    return new ApiError(429, message);
  }

  // Unexpected/programmer errors — isOperational=false tells errorHandler to
  // hide the raw message from the client in production and log it instead.
  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, message, undefined, false);
  }
}
