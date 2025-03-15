import Logger from "@app/logger";

// Create a logger for token operations
const logger = Logger.createLogger({ prefix: "Token" });

/**
 * Extract access token from cookies
 * @param cookies - The cookies string
 * @returns The access token or null if not found
 */
export function extractAccessToken(cookies: string | null): string | null {
  if (!cookies) return null;

  const accessTokenCookie = cookies
    .split(";")
    .find((c) => c.trim().startsWith("accessToken="));

  return accessTokenCookie?.split("=")[1] || null;
}

/**
 * Extract access token from authorization header
 * @param authHeader - The authorization header
 * @returns The access token or null if not found
 */
export function extractTokenFromHeader(
  authHeader: string | null
): string | null {
  if (!authHeader) return null;

  // Check if it's a Bearer token
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Get access token from request
 * @param headers - The request headers
 * @returns The access token or null if not found
 */
export function getAccessToken(headers: Headers): string | null {
  // Try to get token from cookie
  const cookies = headers.get("cookie");
  const tokenFromCookie = extractAccessToken(cookies);

  if (tokenFromCookie) {
    return tokenFromCookie;
  }

  // Try to get token from Authorization header
  const authHeader = headers.get("authorization");
  return extractTokenFromHeader(authHeader);
}
