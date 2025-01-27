import NextAuth from "next-auth";
import credentialsProvider from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import Logger from "@app/logger";

import "./types";

interface AuthConfig {
	nextAuthSecret: string;
	backendUrl: string;
}

const logger = Logger.createLogger({ prefix: "auth" });

export const getNextAuthConfig = ({
	nextAuthSecret,
	backendUrl,
}: AuthConfig): NextAuthConfig => {
	if (!nextAuthSecret?.trim()) {
		throw new Error(
			"nextAuthSecret is required and must be a non-empty string",
		);
	}

	if (!backendUrl?.trim()) {
		throw new Error("backendUrl is required and must be a non-empty string");
	}

	return {
		secret: nextAuthSecret,
		providers: [
			credentialsProvider({
				name: "TONPROOF",
				credentials: {
					proof: { label: "TON Proof", type: "text" },
					address: { label: "Wallet Address", type: "text" },
					network: { label: "Network", type: "text" },
					publicKey: { label: "Public Key", type: "text" },
					stateInit: { label: "Wallet State Init", type: "text" },
					proofPayload: { label: "Proof Payload", type: "text" },
				},
				async authorize(credentials, request) {
					try {
						if (!credentials) {
							throw new Error("No credentials provided");
						}

						const {
							proof,
							address,
							network,
							publicKey,
							stateInit,
							proofPayload,
						} = credentials;

						const response = await fetch(`${backendUrl}/ton/auth/check-proof`, {
							method: "POST",
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${proofPayload}`,
							},
							body: JSON.stringify({
								address,
								network,
								public_key: publicKey,
								proof: {
									...JSON.parse(proof as string),
									state_init: stateInit,
								},
							}),
						});

						const data = await response.json();

						if (!response.ok) {
							throw new Error(data.message || "Failed to verify proof");
						}

						return {
							id: address as string,
							address: address as string,
							accessToken: data.token,
							proofPayload: proofPayload as string,
						};
					} catch (error) {
						logger.error("Authorization failed:", error);
						return null;
					}
				},
			}),
		],
		session: {
			strategy: "jwt",
			maxAge: 9 * 60, // 9 minutes to match proof expiration
			updateAge: 5 * 60, // 5 minutes
		},
		callbacks: {
			async jwt({ token, user }) {
				if (user) {
					token.address = user.address;
					token.accessToken = user.accessToken;
					token.proofPayload = user.proofPayload;
				}
				return token;
			},
			async session({ session, token }) {
				if (token) {
					session.user = {
						...session.user,
						address: token.address as string,
					};
					session.accessToken = token.accessToken as string;
					session.proofPayload = token.proofPayload as string;
				}
				return session;
			},
		},
	};
};

export const createAuthInstance = (config: AuthConfig) => {
	if (!config.nextAuthSecret) {
		throw new Error("nextAuthSecret is required");
	}
	if (!config.backendUrl) {
		throw new Error("backendUrl is required");
	}
	return NextAuth(getNextAuthConfig(config));
};

export * from "./types";
