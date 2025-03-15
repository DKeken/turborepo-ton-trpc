import { container } from "../__di/container";
import { TYPES } from "../__di/types";
import { TonController } from "./ton.controller";
import { IController } from "./_types";
import { ApiError } from "../errors/api-error";
import Logger from "@app/logger";

/**
 * Initialize and get all controllers from the container
 * @returns Object containing all controllers
 */
export function getControllers(): Record<string, IController> {
  try {
    const logger = container.get<Logger>(TYPES.LOGGER);

    const controllers = {
      ton: container.get<TonController>(TYPES.TON_CONTROLLER),
    };

    // Log each controller that was successfully initialized
    Object.entries(controllers).forEach(([name, controller]) => {
      logger.info(`Controller initialized: ${name}`, {
        controller: name,
        type: controller.constructor.name,
      });
    });

    logger.info("All controllers initialized successfully", {
      controllers: Object.keys(controllers),
      count: Object.keys(controllers).length,
    });

    return controllers;
  } catch (error) {
    // We can't use the container logger here if container initialization failed
    const logger = Logger.createLogger({ prefix: "Controllers" });
    const apiError = ApiError.fromError(error);
    logger.error("Failed to initialize controllers:", apiError);
    throw apiError;
  }
}
