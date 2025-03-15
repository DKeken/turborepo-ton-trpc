import { ApiError } from "../errors/api-error";
import { corsHeaders, getCorsOrigin } from "../_config/cors";

/**
 * Create a JSON response with proper headers
 * @param data - The data to send in the response
 * @param status - The HTTP status code
 * @param req - Optional request object for dynamic CORS headers
 * @returns A Response object
 */
export function createJsonResponse(
  data: unknown,
  status: number = 200,
  req?: Request
): Response {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...corsHeaders,
  };

  // Set dynamic origin if request is provided
  if (req) {
    const origin = req.headers.get("origin");
    if (origin) {
      headers["Access-Control-Allow-Origin"] = getCorsOrigin(origin);
    }
  }

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

/**
 * Create an error response from an ApiError
 * @param error - The error to convert to a response
 * @param includeTrace - Whether to include the stack trace
 * @param req - Optional request object for dynamic CORS headers
 * @returns A Response object
 */
export function createErrorResponse(
  error: unknown,
  includeTrace: boolean = true,
  req?: Request
): Response {
  const apiError = ApiError.fromError(error);
  return createJsonResponse(
    apiError.toResponse(includeTrace),
    apiError.status,
    req
  );
}

/**
 * Create a success response
 * @param data - The data to include in the response
 * @param req - Optional request object for dynamic CORS headers
 * @returns A Response object
 */
export function createSuccessResponse<T>(data: T, req?: Request): Response {
  return createJsonResponse(
    {
      success: true,
      data,
    },
    200,
    req
  );
}

/**
 * Create a not found response
 * @param message - The error message
 * @param req - Optional request object for dynamic CORS headers
 * @returns A Response object
 */
export function createNotFoundResponse(
  message: string = "Route not found",
  req?: Request
): Response {
  return createErrorResponse(ApiError.notFound(message), true, req);
}

/**
 * Create a bad request response
 * @param message - The error message
 * @param details - Additional error details
 * @param req - Optional request object for dynamic CORS headers
 * @returns A Response object
 */
export function createBadRequestResponse(
  message: string,
  details?: unknown,
  req?: Request
): Response {
  return createErrorResponse(ApiError.badRequest(message, details), true, req);
}

/**
 * Create an unauthorized response
 * @param message - The error message
 * @param req - Optional request object for dynamic CORS headers
 * @returns A Response object
 */
export function createUnauthorizedResponse(
  message: string = "Unauthorized",
  req?: Request
): Response {
  return createErrorResponse(ApiError.unauthorized(message), true, req);
}

/**
 * Create a server error response
 * @param message - The error message
 * @param error - The original error
 * @param req - Optional request object for dynamic CORS headers
 * @returns A Response object
 */
export function createServerErrorResponse(
  message: string = "Internal server error",
  error?: unknown,
  req?: Request
): Response {
  return createErrorResponse(
    ApiError.internalServerError(message, error),
    true,
    req
  );
}

/**
 * Create an options response for CORS preflight requests
 * @param customHeaders - Optional custom headers to include
 * @returns A Response object
 */
export function createOptionsResponse(
  customHeaders?: Record<string, string>
): Response {
  return new Response(null, {
    status: 200,
    headers: customHeaders || corsHeaders,
  });
}
