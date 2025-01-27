import { BaseController } from "./base/base.controller";
import { TonProofService } from "../services/ton-proof.service";
import { TonApiService } from "../services/ton-api.service";
import {
	type AuthToken,
	createAuthToken,
	createPayloadToken,
	decodeAuthToken,
	verifyToken,
} from "../lib/jwt";
import Logger from "@app/logger";
import { z } from "zod";
import { CHAIN } from "@tonconnect/ui";
import { Address } from "@ton/ton";

const logger = Logger.createLogger({ prefix: "TonController" });

const checkProofSchema = z
	.object({
		address: z.string(),
		network: z.nativeEnum(CHAIN),
		public_key: z.string(),
		proof: z.object({
			timestamp: z.number(),
			domain: z.object({
				lengthBytes: z.number(),
				value: z.string(),
			}),
			signature: z.string(),
			payload: z.string(),
			state_init: z.string(),
		}),
	})
	.strict();

export class TonController extends BaseController {
	private readonly tonProofService: TonProofService;
	private readonly maxRetries = 3;
	private readonly retryDelay = 1000; // ms

	constructor() {
		super({
			basePath: "/ton",
			description: "TON Blockchain Authentication Controller",
			version: "1",
		});

		this.tonProofService = new TonProofService();
		this.setupRoutes();
		this.setupMiddlewares();
	}

	private async withRetry<T>(operation: () => T): Promise<T> {
		let lastError: Error | null = null;

		for (let i = 0; i < this.maxRetries; i++) {
			try {
				return await Promise.resolve(operation());
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));
				if (i < this.maxRetries - 1) {
					await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
				}
			}
		}

		if (lastError) {
			throw lastError;
		}
		throw new Error("Operation failed after retries");
	}

	private setupRoutes(): void {
		this.registerRoute({
			path: "/auth/generate-payload",
			method: "GET",
			handler: async () => {
				try {
					const payload = await this.withRetry(() =>
						this.tonProofService.generatePayload(),
					);

					const payloadToken = await createPayloadToken({ payload });

					logger.debug("Generated auth payload token", {
						payload,
						token: payloadToken,
						timestamp: new Date().toISOString(),
					});

					return {
						success: true,
						data: payloadToken,
					};
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					logger.error("Failed to generate auth payload", { errorMessage });

					return {
						success: false,
						error: {
							code: "BAD_REQUEST",
							message: "Failed to generate authentication payload",
							trace: error,
						},
					};
				}
			},
			description: "Generates authentication payload token for TON Connect",
			tags: ["auth", "ton-connect"],
		});

		this.registerRoute({
			path: "/auth/check-proof",
			method: "POST",
			validator: checkProofSchema,
			handler: async (input) => {
				try {
					const client = TonApiService.create(input.network);
					const isValid = await this.withRetry(() =>
						this.tonProofService.checkProof(input, (address) =>
							client.getWalletPublicKey(address),
						),
					);

					if (!isValid) {
						return {
							success: false,
							error: {
								code: "BAD_REQUEST",
								message: "Invalid proof",
							},
						};
					}

					if (!(await verifyToken(input.proof.payload))) {
						return {
							success: false,
							error: {
								code: "BAD_REQUEST",
								message: "Invalid token",
							},
						};
					}

					const token = await createAuthToken({
						address: input.address,
						network: input.network,
					});

					return { token };
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					logger.error("Failed to check proof", { errorMessage });

					return {
						success: false,
						error: {
							code: "BAD_REQUEST",
							message: "Failed to verify proof",
							trace: errorMessage,
						},
					};
				}
			},
			description: "Verifies TON Connect proof and issues access token",
			tags: ["auth", "ton-connect"],
		});

		this.registerRoute({
			path: "/auth/get-account-info",
			method: "GET",
			handler: async (_, headers) => {
				try {
					logger.info("Getting account info");
					const token = headers?.authorization?.replace("Bearer ", "");
					logger.info("Token", token);
					if (!token || !(await verifyToken(token))) {
						logger.error("Invalid token");
						return {
							success: false,
							error: {
								code: "UNAUTHORIZED",
								message: "Unauthorized",
							},
						};
					}

					const payload = decodeAuthToken(token) as AuthToken;
					if (!payload?.address || !payload?.network) {
						logger.error("Invalid token");
						return {
							success: false,
							error: {
								code: "UNAUTHORIZED",
								message: "Invalid token",
							},
						};
					}

					const client = TonApiService.create(payload.network);
					const accountInfo = await this.withRetry(() =>
						client.getAccountInfo(payload.address),
					);

					logger.info("Account info", accountInfo);

					return {
						...accountInfo,
						address: Address.parse(payload.address).toString(),
					};
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					logger.error("Failed to get account info", { errorMessage });

					return {
						success: false,
						error: {
							code: "BAD_REQUEST",
							message: "Failed to get account info",
							trace: errorMessage,
						},
					};
				}
			},
			description: "Gets account info for authenticated user",
			tags: ["auth", "ton-connect"],
		});
	}

	private setupMiddlewares(): void {
		this.use(async (input) => {
			logger.debug("Request received", {
				timestamp: new Date().toISOString(),
				input,
			});
		});
	}
}
