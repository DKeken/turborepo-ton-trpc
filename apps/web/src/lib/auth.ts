import { createAuthInstance } from "@app/auth-config";

export const authInstance = createAuthInstance({
	nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
	backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL ?? "",
});
