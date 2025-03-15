import { HttpMethod } from "@/controllers/_types";
import { ApiError } from "@/errors/api-error";
import Logger from "@app/logger";
import { IController } from "@/controllers/_types";
import {
  createErrorResponse,
  createJsonResponse,
  createNotFoundResponse,
} from "@/utils/response";

/**
 * Handle controller requests
 * @param req - The request object
 * @param controllers - The controllers object
 * @param logger - The logger instance
 * @returns Response object
 */
export async function handleControllerRequest(
  req: Request,
  controllers: Record<string, IController>,
  logger: Logger
): Promise<Response> {
  const url = new URL(req.url);

  // Log all available controllers and their paths
  logger.info("Available controllers:", {
    controllers: Object.keys(controllers),
  });

  for (const [prefix, controller] of Object.entries(controllers)) {
    if (url.pathname.startsWith(`/${prefix}`)) {
      try {
        const path = url.pathname.replace(`/${prefix}`, "");
        const input = req.method === "GET" ? {} : await req.json();

        logger.info("Handling request", {
          controller: prefix,
          path,
          fullPath: url.pathname,
          method: req.method,
          input,
        });

        const result = await controller.handleRequest(
          path,
          req.method as HttpMethod,
          input,
          Object.fromEntries(req.headers.entries())
        );

        logger.info("Request handled successfully", {
          controller: prefix,
          path,
          fullPath: url.pathname,
          method: req.method,
        });

        return createJsonResponse(result, 200, req);
      } catch (error: unknown) {
        const apiError = ApiError.fromError(error);
        logger.error("Controller error:", apiError);

        return createErrorResponse(apiError, true, req);
      }
    }
  }

  return createNotFoundResponse("Route not found", req);
}
