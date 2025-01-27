import type { DefaultSession } from "next-auth";

declare module "next-auth" {
	interface Session extends DefaultSession {
		user: {
			id?: string;
			address?: string;
		} & DefaultSession["user"];
		accessToken: string;
		proofPayload: string;
	}

	interface User {
		address: string;
		accessToken: string;
		proofPayload: string;
	}

	interface JWT {
		address?: string;
		accessToken?: string;
		proofPayload?: string;
	}
}
