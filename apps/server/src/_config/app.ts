import Logger from "@app/logger";
import { getControllers } from "../controllers";
import { createRouter } from "./trpc";
import { ServerConfig } from "../server/server";
import { env } from "./env";
import { initializeAuth } from "../auth";
import { configureContainer } from "@/__di/container";

/**
 * Application configuration
 */
export interface AppConfig {
  logger: Logger;
  serverConfig: ServerConfig;
}

/**
 * Initialize the application
 * @returns Application configuration
 */
export function initializeApp(): {
  router: ReturnType<typeof createRouter>;
  controllers: ReturnType<typeof getControllers>;
  config: AppConfig;
} {
  // Create logger
  const logger = Logger.createLogger({ prefix: "App" });

  // Server configuration
  const serverConfig: ServerConfig = {
    port: env.PORT,
    host: env.HOST,
  };

  // Initialize the DI container
  configureContainer();

  // Initialize auth services
  initializeAuth();

  // Create tRPC router
  const router = createRouter();

  // Get controllers from the container
  const controllers = getControllers();

  return {
    router,
    controllers,
    config: {
      logger,
      serverConfig,
    },
  };
}
