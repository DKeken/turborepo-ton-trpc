import { t } from "../trpc";
import { usersRouter } from "../routers/users";

/**
 * Create and configure the tRPC router
 */
export function createRouter() {
  return t.router({
    users: usersRouter,
  });
}

// Define the router type for export
export type AppRouter = ReturnType<typeof createRouter>;
