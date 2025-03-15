/* eslint-disable no-var -- globalThis replacement */
import Redis from "ioredis";
import Logger from "@app/logger";
import { env } from "@/_config/env";

const logger = Logger.createLogger({ prefix: "redis" });

declare global {
	var redisClient: Redis | undefined;
	var redisSubscriber: Redis | undefined;
}

// Separate instances for pub/sub and regular commands
let redisInstance: Redis | undefined;
let subscriberInstance: Redis | undefined;

if (!globalThis.redisClient || !globalThis.redisSubscriber) {
	const createClient = (isSubscriber = false) => {
		// Return existing instance if available
		if (!isSubscriber && redisInstance) {
			return redisInstance;
		}
		if (isSubscriber && subscriberInstance) {
			return subscriberInstance;
		}

		// Create new Redis instance with config
		const instance = new Redis(env.REDIS_URL, {
			password: env.REDIS_PASSWORD,
			retryStrategy: (times: number) => {
				const delay = Math.min(times * 1000, 5000);
				logger.info(
					`Retrying Redis connection in ${delay}ms... (Attempt ${times})`,
				);
				return delay;
			},
			maxRetriesPerRequest: 10,
			enableReadyCheck: true,
			autoResubscribe: isSubscriber, // Only enable auto-resubscribe for subscriber
			connectTimeout: 10000,
			keepAlive: 10000,
			lazyConnect: true,
			reconnectOnError: (err: Error) => {
				const targetError = "READONLY";
				if (err.message.includes(targetError)) {
					return true;
				}
				logger.error("Redis reconnection error:", err.message);
				return false;
			},
		});

		// Set up event handlers
		instance.on("error", (err) => {
			logger.error(
				`Redis ${isSubscriber ? "subscriber" : "client"} connection error:`,
				err.message,
			);
		});

		instance.on("connect", () => {
			logger.info(
				`Connected to Redis ${isSubscriber ? "subscriber" : "client"}`,
			);
		});

		instance.on("ready", () => {
			logger.info(`Redis ${isSubscriber ? "subscriber" : "client"} ready`);
		});

		instance.on("reconnecting", (params: { attempt: number }) => {
			logger.info(
				`Redis ${isSubscriber ? "subscriber" : "client"} reconnecting... Attempt ${params?.attempt || "unknown"}`,
			);
		});

		instance.on("end", () => {
			logger.info(
				`Redis ${isSubscriber ? "subscriber" : "client"} connection ended`,
			);
			if (isSubscriber) {
				subscriberInstance = undefined;
			} else {
				redisInstance = undefined;
			}
		});

		instance.on("wait", () => {
			logger.info(
				`Redis ${isSubscriber ? "subscriber" : "client"} waiting for connection`,
			);
		});

		// Store instance reference
		if (isSubscriber) {
			subscriberInstance = instance;
		} else {
			redisInstance = instance;
		}

		return instance;
	};

	// Create separate clients for pub/sub and regular commands
	globalThis.redisClient = createClient(false); // For regular Redis commands
	globalThis.redisSubscriber = createClient(true); // Dedicated subscriber instance
}

// Export the instances
export const redis = globalThis.redisClient;
export const subscriber = globalThis.redisSubscriber;
