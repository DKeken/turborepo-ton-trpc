import Logger from "@app/logger";

// Create a logger for auth initialization
const logger = Logger.createLogger({ prefix: "Auth" });

/**
 * Initialize all auth services
 */
export function initializeAuth(): void {
  try {
    // The UsersService is already registered in the container configuration
    logger.info("Auth services initialized");
  } catch (error) {
    logger.error("Failed to initialize auth services", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// Export all auth modules
export * from "./types";
export * from "./token";
export * from "./account";
export * from "./user";
