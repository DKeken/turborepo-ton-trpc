import { initTRPC, TRPCError } from "@trpc/server";
import { SuperJSON } from "superjson";
import { userRoleEnum } from "@app/database";
import Logger from "@app/logger";
import { type Context } from "./auth/types";

const logger = Logger.createLogger({ prefix: "trpc" });

export const t = initTRPC.context<Context>().create({
  transformer: SuperJSON,
  errorFormatter({ shape }) {
    return shape;
  },
  sse: {
    maxDurationMs: 5 * 60 * 1_000,
    ping: {
      enabled: true,
      intervalMs: 3_000,
    },
    client: {
      reconnectAfterInactivityMs: 5_000,
    },
  },
});

export const createCallerFactory = t.createCallerFactory;
export const mergeRouters = t.mergeRouters;

export const router = t.router;

export const baseProcedure = t.procedure.use(async ({ ctx, next, path }) => {
  const start = performance.now();
  const result = await next({ ctx: { ...ctx } });
  const end = performance.now();
  logger.info(`${path} took ${end - start}ms`);
  return result;
});

export const protectedProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    logger.warn("Unauthorized access attempt - no user context");
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx } });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  try {
    logger.info("Admin procedure access attempt", {
      user: ctx.user,
      wallet: ctx.wallet,
    });

    if (!ctx.user) {
      logger.warn("Unauthorized access attempt - no user context");
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (ctx.user.role !== userRoleEnum.enumValues[1]) {
      logger.warn("Forbidden access attempt", {
        userId: ctx.user.id,
        userRole: ctx.user.role,
        requiredRole: userRoleEnum.enumValues[1],
      });
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    logger.info("Admin procedure access granted", {
      userId: ctx.user.id,
      userRole: ctx.user.role,
    });

    const result = await next({ ctx: { ...ctx } });

    logger.info("Admin procedure completed successfully", {
      userId: ctx.user.id,
    });

    return result;
  } catch (error) {
    logger.error("Admin procedure error:", {
      error,
      userId: ctx.user?.id,
      userRole: ctx.user?.role,
    });
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
});
