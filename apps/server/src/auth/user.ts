import Logger from "@app/logger";
import type { User } from "@app/database";
import { UsersService } from "../services/users/users.service";
import { container } from "../__di/container";
import { TYPES } from "../__di/types";

// Create a logger for user operations
const logger = Logger.createLogger({ prefix: "User" });

/**
 * Get user by address using the UsersService from DI container
 * @param address - The wallet address
 * @returns The user object or null if failed
 */
export async function getUserByAddress(address: string): Promise<User | null> {
  try {
    // Try to get the UsersService from the DI container
    let usersService: UsersService;

    try {
      // Try to get from container
      usersService = container.get<UsersService>(TYPES.USER_SERVICE);
    } catch {
      // If not registered, get the singleton instance
      usersService = UsersService.getInstance();
      logger.warn(
        "UsersService not found in container, using singleton instance"
      );
    }

    // Try to find existing user
    return await usersService.findByAddress(address);
  } catch (error) {
    logger.info("User not found or error occurred", {
      address,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
