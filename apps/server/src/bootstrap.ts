import { startServer } from "./server/server";
import { initializeApp } from "./_config/app";
import { ApiError } from "./errors/api-error";
import Logger from "@app/logger";

// Create a logger for bootstrap errors
const bootstrapLogger = Logger.createLogger({ prefix: "Bootstrap" });

/**
 * Bootstrap the application
 */
export async function bootstrap(): Promise<void> {
  try {
    // Initialize the application
    const { router, controllers, config } = initializeApp();
    const { logger, serverConfig } = config;

    // Start the server
    await startServer(router, controllers, logger, serverConfig);
  } catch (error) {
    const apiError = ApiError.fromError(error);
    bootstrapLogger.error("Failed to bootstrap application:", apiError);
    process.exit(1);
  }
}
