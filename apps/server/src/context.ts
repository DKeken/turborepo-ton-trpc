import { db } from "@app/database";
import Logger from "@app/logger";
import type { CreateBunContextOptions } from "trpc-bun-adapter";
import { UsersService } from "./services/users.service";
import type { AccountInfo } from "@app/auth-config";

const logger = Logger.createLogger({ prefix: "context" });
const usersService = UsersService.getInstance();

export const createContext = async (opts: CreateBunContextOptions) => {
	const cookies = opts.req.headers.get("cookie");
	const accessToken = cookies
		?.split(";")
		.find((c) => c.trim().startsWith("accessToken="))
		?.split("=")[1];

	logger.info("Creating context for request", {
		accessToken,
	});

	let accountInfo = null;
	let user = null;

	if (accessToken) {
		try {
			const response = await fetch(
				"http://localhost:3333/ton/auth/get-account-info",
				{
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				},
			);
			accountInfo = (await response.json()) as AccountInfo;
			logger.info("Got account info", { accountInfo });

			if (accountInfo?.address) {
				try {
					user = await usersService.findByAddress(accountInfo.address);
					logger.info("Found existing user", { user });
				} catch (error) {
					try {
						// Create new user if doesn't exist
						user = await usersService.create({
							address: accountInfo.address,
							name: accountInfo.address,
						});
						logger.info("Created new user", { user });
					} catch (err: unknown) {
						// Handle duplicate key error specifically
						if (
							err &&
							typeof err === "object" &&
							"code" in err &&
							err.code === "23505"
						) {
							// If user already exists, try to fetch again
							user = await usersService.findByAddress(accountInfo.address);
							logger.info("Retrieved user after creation conflict", { user });
						} else {
							throw err;
						}
					}
				}
			}
		} catch (error) {
			logger.error("Failed to get account info or create user", { error });
		}
	}

	return {
		db,
		user,
		wallet: accountInfo,
	};
};

export type Context = Awaited<ReturnType<typeof createContext>>;
