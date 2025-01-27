import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "backend/index";

export const trpc = createTRPCReact<AppRouter>();
