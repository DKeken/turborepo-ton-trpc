import { ErrorResponse } from "../controllers/_types";

/**
 * Error codes for API responses
 */
export enum ErrorCode {
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
}

/**
 * Standard API error class
 */
export class ApiError extends Error {
  constructor(
    public readonly code: ErrorCode | string,
    message: string,
    public readonly details?: unknown,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Convert the error to a standard API error response
   * @param includeTrace - Whether to include the stack trace in the response
   * @returns The standardized API error response
   */
  public toResponse(includeTrace = false): ErrorResponse {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined && { details: this.details }),
        ...(includeTrace && { trace: this.stack }),
      },
    };
  }

  /**
   * Create a bad request error
   * @param message - The error message
   * @param details - Additional error details
   * @returns A new ApiError instance
   */
  public static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(ErrorCode.BAD_REQUEST, message, details, 400);
  }

  /**
   * Create an unauthorized error
   * @param message - The error message
   * @param details - Additional error details
   * @returns A new ApiError instance
   */
  public static unauthorized(message: string, details?: unknown): ApiError {
    return new ApiError(ErrorCode.UNAUTHORIZED, message, details, 401);
  }

  /**
   * Create a forbidden error
   * @param message - The error message
   * @param details - Additional error details
   * @returns A new ApiError instance
   */
  public static forbidden(message: string, details?: unknown): ApiError {
    return new ApiError(ErrorCode.FORBIDDEN, message, details, 403);
  }

  /**
   * Create a not found error
   * @param message - The error message
   * @param details - Additional error details
   * @returns A new ApiError instance
   */
  public static notFound(message: string, details?: unknown): ApiError {
    return new ApiError(ErrorCode.NOT_FOUND, message, details, 404);
  }

  /**
   * Create a validation error
   * @param message - The error message
   * @param details - Additional error details
   * @returns A new ApiError instance
   */
  public static validationError(message: string, details?: unknown): ApiError {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, details, 400);
  }

  /**
   * Create an internal server error
   * @param message - The error message
   * @param details - Additional error details
   * @returns A new ApiError instance
   */
  public static internalServerError(
    message: string,
    details?: unknown
  ): ApiError {
    return new ApiError(ErrorCode.INTERNAL_SERVER_ERROR, message, details, 500);
  }

  /**
   * Create an API error from an unknown error
   * @param error - The unknown error
   * @returns A new ApiError instance
   */
  public static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    const message = error instanceof Error ? error.message : String(error);
    return ApiError.internalServerError(
      "An unexpected error occurred",
      message
    );
  }
}
