import Logger from "@app/logger";
import type { AccountInfo } from "@app/auth-config";
import { env } from "../_config/env";

// Create a logger for account operations
const logger = Logger.createLogger({ prefix: "Account" });

/**
 * Fetch account information using the access token
 * @param accessToken - The access token
 * @returns The account information or null if failed
 */
export async function fetchAccountInfo(
  accessToken: string
): Promise<AccountInfo | null> {
  try {
    const apiUrl = env.FRONTEND_URL.replace("3000", "3333");
    const response = await fetch(`${apiUrl}/ton/auth/get-account-info`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch account info: ${response.status}`);
    }

    return (await response.json()) as AccountInfo;
  } catch (error) {
    logger.error("Failed to fetch account info", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
