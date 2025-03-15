import { bootstrap } from "./bootstrap";
import { AppRouter } from "./_config/trpc";
import Logger from "@app/logger";

// Create a logger for unhandled errors
const logger = Logger.createLogger({ prefix: "Unhandled" });

// Export the AppRouter type for client usage
export type { AppRouter };

// Bootstrap the application
bootstrap().catch((error) => {
  logger.error("Unhandled error during bootstrap:", error);
  process.exit(1);
});
