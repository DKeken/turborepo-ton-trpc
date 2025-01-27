import { TRPCError } from "@trpc/server";
import Logger from "@app/logger";
import type { z } from "zod";

const logger = Logger.createLogger({ prefix: "BaseController" });

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface RouteConfig<TInput, TOutput> {
	path: string;
	method: HttpMethod;
	handler: (input: TInput, headers?: Record<string, string>) => Promise<TOutput>;
	validator?: z.ZodType<TInput>;
	description?: string;
	tags?: string[];
}

export interface ControllerConfig {
	basePath: string;
	version?: string;
	description?: string;
}

export abstract class BaseController {
	protected readonly routes = new Map<string, RouteConfig<unknown, unknown>>();
	protected readonly middlewares: Array<(input: unknown) => Promise<void>> = [];

	constructor(protected readonly config: ControllerConfig) {
		logger.info(`Initialized ${this.constructor.name} controller`, {
			basePath: config.basePath,
			version: config.version,
		});
	}

	protected registerRoute<TInput, TOutput>(
		config: RouteConfig<TInput, TOutput>,
	): void {
		const fullPath = this.getFullPath(config.path);
		this.routes.set(fullPath, config as RouteConfig<unknown, unknown>);
		logger.debug(`Registered route: ${config.method} ${fullPath}`, {
			description: config.description,
			tags: config.tags,
		});
	}

	protected use(middleware: (input: unknown) => Promise<void>): void {
		this.middlewares.push(middleware);
	}

	protected getFullPath(path: string): string {
		const normalizedPath = path.startsWith("/") ? path : `/${path}`;
		const version = this.config.version ? `/v${this.config.version}` : "";
		return `${this.config.basePath}${version}${normalizedPath}`;
	}

	public async handleRequest(
		path: string,
		method: HttpMethod,
		input: unknown,
		headers?: Record<string, string>,
	): Promise<unknown> {
		const fullPath = this.getFullPath(path);
		const route = this.routes.get(fullPath);

		if (!route || route.method !== method) {
			throw new TRPCError({
				code: "NOT_FOUND",
				message: `Route ${method} ${path} not found`,
			});
		}

		return this.executeOperation(`${method} ${path}`, async () => {
			// Execute middlewares
			for (const middleware of this.middlewares) {
				await middleware(input);
			}

			// Validate input if validator exists
			let validatedInput = input;
			if (route.validator) {
				try {
					validatedInput = await route.validator.parseAsync(input);
				} catch (error) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Validation failed",
						cause: error,
					});
				}
			}

			const startTime = performance.now();
			const result = await route.handler(validatedInput, headers);
			const executionTime = performance.now() - startTime;

			logger.debug("Route execution completed", {
				path: fullPath,
				method,
				executionTime: `${executionTime}ms`,
			});

			return result;
		});
	}

	protected async executeOperation<T>(
		operation: string,
		handler: () => Promise<T>,
	): Promise<T> {
		try {
			logger.debug(`Starting ${operation}`);
			const result = await handler();
			logger.debug(`Completed ${operation}`);
			return result;
		} catch (error) {
			this.handleError(error, operation);
		}
	}

	protected handleError(error: unknown, operation: string): never {
		logger.error(`Error during ${operation}:`, error);

		if (error instanceof TRPCError) {
			throw error;
		}

		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: `Failed to ${operation}`,
			cause: error,
		});
	}

	public getRoutes(): Array<{
		path: string;
		method: HttpMethod;
		description?: string;
		tags?: string[];
	}> {
		return Array.from(this.routes.entries()).map(([path, config]) => ({
			path,
			method: config.method,
			description: config.description,
			tags: config.tags,
		}));
	}
}
