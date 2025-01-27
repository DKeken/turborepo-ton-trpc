import { createBunServeHandler } from "trpc-bun-adapter";
import { t } from "./trpc";
import { usersRouter } from "./routers/users";
import { createContext } from "./context";
import { TonController } from "./controllers/ton.controller";
import Logger from "@app/logger";
import type { HttpMethod } from "./controllers/base.controller";
import { redis } from "./lib/redis";

interface ApiError {
	code?: string;
	message?: string;
}

const logger = Logger.createLogger({ prefix: "Index" });

export const router = t.router({
	users: usersRouter,
});

const controllers = {
	ton: new TonController(),
};

const corsHeaders = {
	"Access-Control-Allow-Origin": "http://localhost:3000",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
	"Access-Control-Allow-Credentials": "true",
};

export type AppRouter = typeof router;

await redis.flushall();

Bun.serve(
	createBunServeHandler(
		{
			createContext,
			endpoint: "/trpc",
			responseMeta() {
				return {
					status: 200,
					headers: corsHeaders,
				};
			},
			router,
		},
		{
			port: 3333,
			async fetch(req) {
				const url = new URL(req.url);

				// Handle CORS preflight requests
				if (req.method === "OPTIONS") {
					return new Response(null, {
						status: 200,
						headers: corsHeaders,
					});
				}

				for (const [prefix, controller] of Object.entries(controllers)) {
					if (url.pathname.startsWith(`/${prefix}`)) {
						try {
							const path = url.pathname.replace(`/${prefix}`, "");
							const input = req.method === "GET" ? {} : await req.json();
							logger.info("Handling request", {
								path,
								method: req.method,
								input,
							});
							const result = await controller.handleRequest(
								path,
								req.method as HttpMethod,
								input,
								Object.fromEntries(req.headers.entries()),
							);

							return new Response(JSON.stringify(result), {
								headers: {
									"Content-Type": "application/json",
									...corsHeaders,
								},
							});
						} catch (error: unknown) {
							const apiError = error as ApiError;
							logger.error("Controller error:", apiError);
							const statusCode = apiError?.code === "NOT_FOUND" ? 404 : 500;

							return new Response(
								JSON.stringify({
									error: {
										message: apiError?.message || "Internal server error",
										code: apiError?.code || "INTERNAL_SERVER_ERROR",
									},
								}),
								{
									status: statusCode,
									headers: {
										"Content-Type": "application/json",
										...corsHeaders,
									},
								},
							);
						}
					}
				}

				return new Response("Not found", {
					status: 404,
					headers: corsHeaders,
				});
			},
		},
	),
);
