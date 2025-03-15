import { db } from "@app/database/db";
import Logger from "@app/logger";
import type { CreateBunContextOptions } from "trpc-bun-adapter";
import { getAccessToken } from "./auth/token";
import { fetchAccountInfo } from "./auth/account";
import { getUserByAddress } from "./auth/user";
import type { Context } from "./auth/types";

// Create a logger for the context
const logger = Logger.createLogger({ prefix: "Context" });

/**
 * Create the context for tRPC requests
 * @param opts - The context options
 * @returns The context object
 */
export const createContext = async (
  opts: CreateBunContextOptions
): Promise<Context> => {
  // Extract access token from request headers
  const accessToken = getAccessToken(opts.req.headers);

  logger.debug("Creating context for request", {
    hasAccessToken: !!accessToken,
    path: opts.req.url,
  });

  let accountInfo = null;
  let user = null;

  if (accessToken) {
    // Fetch account info
    accountInfo = await fetchAccountInfo(accessToken);

    if (accountInfo?.address) {
      // Get user by address
      user = await getUserByAddress(accountInfo.address);

      if (user) {
        logger.debug("User context created", {
          address: accountInfo.address,
          userId: user.id,
        });
      } else {
        logger.debug("No user found for address", {
          address: accountInfo.address,
        });
      }
    }
  }

  return {
    db,
    user,
    wallet: accountInfo,
  };
};
