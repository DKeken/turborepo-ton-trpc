import { createBunServeHandler } from "trpc-bun-adapter";
import { AppRouter } from "@/index";
import { createContext } from "@/context";
import { handleControllerRequest } from "./request-handler";
import { IController } from "@/controllers/_types";
import Logger from "@app/logger";
import { redis } from "@/lib/redis";
import { ApiError } from "@/errors/api-error";
import { createErrorResponse } from "@/utils/response";
import { corsHeaders, handleCorsPreflightRequest } from "@/_config/cors";
import { env } from "@/_config/env";

/**
 * Server configuration
 */
export interface ServerConfig {
  port?: number;
  host?: string;
}

/**
 * Default server configuration
 */
const DEFAULT_CONFIG: ServerConfig = {
  port: 3333,
  host: "0.0.0.0",
};

/**
 * Extended CORS headers type with optional origin
 */
type DynamicCorsHeaders = typeof corsHeaders & {
  "Access-Control-Allow-Origin"?: string;
};

/**
 * Start the server
 * @param router - The tRPC router
 * @param controllers - The controllers
 * @param logger - The logger instance
 * @param config - Server configuration
 */
export async function startServer(
  router: AppRouter,
  controllers: Record<string, IController>,
  logger: Logger,
  config: ServerConfig = DEFAULT_CONFIG
): Promise<void> {
  try {
    // Clear Redis cache on startup
    await redis.flushall();

    const { port, host } = { ...DEFAULT_CONFIG, ...config };

    Bun.serve(
      createBunServeHandler(
        {
          createContext,
          endpoint: "/trpc",
          responseMeta(opts: {
            ctx?: {
              req?: { headers?: { get?: (key: string) => string | null } };
            };
          }) {
            // Get the origin from the request headers if available
            const origin = opts?.ctx?.req?.headers?.get?.("origin") || null;

            // Create dynamic CORS headers
            const dynamicCorsHeaders: DynamicCorsHeaders = {
              ...corsHeaders,
            };

            // Set the appropriate origin
            if (origin) {
              const allowedOrigins = [
                "http://localhost:3000",
                "https://localhost:3000",
                env.FRONTEND_URL,
              ].filter(Boolean);

              if (allowedOrigins.includes(origin)) {
                dynamicCorsHeaders["Access-Control-Allow-Origin"] = origin;
              } else {
                dynamicCorsHeaders["Access-Control-Allow-Origin"] =
                  env.FRONTEND_URL || "*";
              }
            }

            return {
              status: 200,
              headers: dynamicCorsHeaders,
            };
          },
          router,
          onError({ error }: { error: Error }) {
            const apiError = ApiError.fromError(error);
            logger.error("tRPC error:", apiError);
            return { code: apiError.code, message: apiError.message };
          },
        },
        {
          port,
          hostname: host,
          async fetch(req) {
            try {
              // Handle CORS preflight requests
              const corsResponse = handleCorsPreflightRequest(req);
              if (corsResponse) {
                return corsResponse;
              }

              // Handle controller requests
              return handleControllerRequest(req, controllers, logger);
            } catch (error) {
              const apiError = ApiError.fromError(error);
              logger.error("Server error:", apiError);

              return createErrorResponse(apiError, true, req);
            }
          },
        }
      )
    );

    logger.info(`Server started on ${host}:${port}`);
  } catch (error) {
    const apiError = ApiError.fromError(error);
    logger.error("Failed to start server:", apiError);
    throw apiError;
  }
}
