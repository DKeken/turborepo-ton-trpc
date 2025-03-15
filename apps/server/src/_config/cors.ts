import { createErrorResponse, createOptionsResponse } from "../utils/response";
import { env } from "./env";

/**
 * Get the appropriate CORS origin based on the request
 * @param requestOrigin - The origin from the request
 * @returns The appropriate Access-Control-Allow-Origin value
 */
export function getCorsOrigin(requestOrigin?: string): string {
  // Define allowed origins
  const allowedOrigins = [
    "http://localhost:3000",
    "https://localhost:3000",
    env.FRONTEND_URL,
  ].filter(Boolean);

  // If the request origin is in the allowed list, return it
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Otherwise return the configured frontend URL or wildcard
  return env.FRONTEND_URL || "*";
}

/**
 * CORS configuration for the server
 */
export const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

/**
 * Handle CORS preflight requests
 * @param req - The request object
 * @returns Response for OPTIONS requests or null for other methods
 */
export function handleCorsPreflightRequest(req: Request): Response | null {
  try {
    // Get the origin from the request
    const origin = req.headers.get("origin");

    // Create headers with dynamic origin
    const headers = {
      ...corsHeaders,
      "Access-Control-Allow-Origin": getCorsOrigin(origin || undefined),
    };

    if (req.method === "OPTIONS") {
      return createOptionsResponse(headers);
    }
    return null;
  } catch (error) {
    return createErrorResponse(error);
  }
}

/**
 * Apply CORS headers to a response
 * @param response - The response to apply CORS headers to
 * @param req - The original request
 * @returns The response with CORS headers
 */
export function applyCorsHeaders(response: Response, req: Request): Response {
  const headers = new Headers(response.headers);
  const origin = req.headers.get("origin");

  // Set dynamic origin
  headers.set(
    "Access-Control-Allow-Origin",
    getCorsOrigin(origin || undefined)
  );

  // Set other CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (key !== "Access-Control-Allow-Origin") {
      headers.set(key, value);
    }
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
