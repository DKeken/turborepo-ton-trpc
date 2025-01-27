import type { TonConnectUI, Wallet } from "@tonconnect/ui-react";
import type { AccountInfo } from "@app/auth-config";
import type {
	Account,
	ConnectAdditionalRequest,
	TonProofItemReplySuccess,
} from "@app/tonconnect";
import { setCookie, deleteCookie } from "cookies-next";
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { isServerSide } from "../lib/utils";

interface AuthState {
	// Authentication State
	isAuthenticated: boolean;
	isLoading: boolean;
	accountInfo: AccountInfo | null;
	firstProofLoading: boolean;

	// TON Proof State
	accessToken: string | null;
	proofPayload: string | null;
	host: string;
	refreshIntervalMs: number;

	// Basic State Actions
	setIsAuthenticated: (value: boolean) => void;
	setIsLoading: (value: boolean) => void;
	setAccountInfo: (info: AccountInfo | null) => void;
	setFirstProofLoading: (value: boolean) => void;
	setAccessToken: (token: string | null) => void;
	setProofPayload: (payload: string | null) => void;
	reset: () => void;

	// Business Logic
	handleWalletStatusChange: (
		wallet: Wallet | null,
		tonConnectUI: TonConnectUI,
	) => Promise<void>;
	getAccountInfo: () => Promise<AccountInfo | undefined>;
	generatePayload: () => Promise<ConnectAdditionalRequest | null>;
	checkProof: (
		proof: TonProofItemReplySuccess["proof"],
		account: Account,
	) => Promise<void>;
}

const initialState = {
	isAuthenticated: false,
	isLoading: false,
	accountInfo: null,
	firstProofLoading: true,
	accessToken: null,
	proofPayload: null,
	host: isServerSide() ? "" : (process.env.NEXT_PUBLIC_BACKEND_URL ?? ""),
	refreshIntervalMs: 9 * 60 * 1000,
} as const;

export const useAuthStore = create<AuthState>()(
	persist(
		devtools(
			(set, get) => ({
				...initialState,

				// Basic State Actions
				setIsAuthenticated: (value) => set({ isAuthenticated: value }),
				setIsLoading: (value) => set({ isLoading: value }),
				setAccountInfo: (info) => set({ accountInfo: info }),
				setFirstProofLoading: (value) => set({ firstProofLoading: value }),
				setAccessToken: (token) => set({ accessToken: token }),
				setProofPayload: (payload) => set({ proofPayload: payload }),

				reset: () => {
					if (isServerSide()) return;
					set({ proofPayload: null });
					get().generatePayload();
				},

				// Business Logic
				handleWalletStatusChange: async (wallet, tonConnectUI) => {
					const logPrefix = "[Auth:WalletStatus]";
					console.log(`${logPrefix} Starting wallet status change`, { wallet });
					set({ isLoading: true });

					if (!wallet) {
						console.log(`${logPrefix} No wallet found, resetting state`);
						get().reset();
						deleteCookie("accessToken");
						set({
							isAuthenticated: false,
							isLoading: false,
							accountInfo: null,
						});
						return;
					}

					try {
						// First check if we have a valid token and account info
						const { accessToken } = get();
						if (accessToken) {
							try {
								const accountInfo = await get().getAccountInfo();
								if (accountInfo) {
									console.log(`${logPrefix} Existing token is valid`);
									set({
										isAuthenticated: true,
										isLoading: false,
										accountInfo,
									});
									return;
								}
							} catch (error) {
								console.log(`${logPrefix} Existing token is invalid:`, error);
								deleteCookie("accessToken");
							}
						}

						// If no valid token, check for proof
						if (
							wallet.connectItems?.tonProof &&
							"proof" in wallet.connectItems.tonProof
						) {
							console.log(`${logPrefix} Found TON proof, checking...`);
							await get().checkProof(
								wallet.connectItems.tonProof.proof,
								wallet.account,
							);
						} else {
							console.log(`${logPrefix} No proof found, disconnecting wallet`);
							tonConnectUI.disconnect();
							set({
								isAuthenticated: false,
								isLoading: false,
								accountInfo: null,
							});
						}
					} catch (error) {
						console.error(`${logPrefix} Wallet status change failed:`, error);
						tonConnectUI.disconnect();
						deleteCookie("accessToken");
						set({
							isAuthenticated: false,
							isLoading: false,
							accountInfo: null,
						});
					}
				},

				generatePayload: async () => {
					if (isServerSide()) return null;

					const state = get();
					if (state.proofPayload) {
						return { tonProof: state.proofPayload };
					}

					try {
						const response = await fetch(
							`${state.host}/ton/auth/generate-payload`,
						);
						const data = await response.json();

						if (data.success) {
							const payload = data.data;
							set({ proofPayload: payload });
							console.log("[Auth:GeneratePayload] Proof payload set:", payload);
							return { tonProof: payload };
						}

						return null;
					} catch (error) {
						console.error("Failed to generate payload:", error);
						return null;
					}
				},

				checkProof: async (proof, account) => {
					const logPrefix = "[Auth:CheckProof]";
					console.log(`${logPrefix} Starting with:`, { proof, account });

					if (isServerSide()) {
						console.log(`${logPrefix} Aborting - server side detected`);
						return;
					}

					const state = get();
					console.log(`${logPrefix} Current state:`, state);

					try {
						const reqBody = {
							address: account.address,
							network: account.chain,
							public_key: account.publicKey,
							proof: {
								...proof,
								state_init: account.walletStateInit,
							},
						};
						console.log(`${logPrefix} Prepared request body:`, reqBody);

						console.log(
							`${logPrefix} Sending request to:`,
							`${state.host}/ton/auth/check-proof`,
						);
						const response = await fetch(`${state.host}/ton/auth/check-proof`, {
							method: "POST",
							body: JSON.stringify(reqBody),
							headers: {
								"Content-Type": "application/json",
								Authorization: `Bearer ${state.proofPayload}`,
							},
						});

						const data = await response.json();
						console.log(`${logPrefix} Received response:`, data);

						if (data?.token) {
							console.log(`${logPrefix} Token received, setting auth state`);
							set({ accessToken: data.token });

							// Immediately try to get account info and set authenticated state
							try {
								const accountInfo = await get().getAccountInfo();
								if (accountInfo) {
									setCookie("accessToken", data.token, {
										maxAge: 60 * 60 * 24 * 7, // 7 days
										path: "/",
									});
									set({
										isAuthenticated: true,
										isLoading: false,
										accountInfo,
									});
								}
							} catch (error) {
								console.error(
									`${logPrefix} Failed to get initial account info:`,
									error,
								);
								get().reset();
							}
						} else {
							console.log(`${logPrefix} No token in response, resetting state`);
							get().reset();
						}
					} catch (error) {
						console.error(`${logPrefix} Error:`, error);
						console.log(`${logPrefix} Error occurred, resetting state`);
						get().reset();
					}
				},

				getAccountInfo: async () => {
					if (isServerSide()) return undefined;

					const state = get();
					try {
						if (!state.accessToken) {
							throw new Error("No access token available");
						}

						const response = await fetch(
							`${state.host}/ton/auth/get-account-info`,
							{
								headers: {
									Authorization: `Bearer ${state.accessToken}`,
									"Content-Type": "application/json",
								},
							},
						);

						const data = await response.json();

						if (data && "account" in data && "block" in data) {
							const accountInfo = data as AccountInfo;
							set({ accountInfo });
							return accountInfo;
						}

						return undefined;
					} catch (error) {
						console.error("Failed to get account info:", error);
						get().reset();
						return undefined;
					}
				},
			}),
			{
				name: "auth-store",
				enabled: process.env.NODE_ENV === "development",
			},
		),
		{
			name: "auth-storage",
			onRehydrateStorage: () => {
				return (state) => {
					if (!state || isServerSide()) return;

					console.log("[Auth:Rehydrate] Rehydrating state:", state);

					if (state.accessToken) {
						console.log("[Auth:Rehydrate] Found access token, syncing cookie");
						setCookie("accessToken", state.accessToken, {
							maxAge: 60 * 60 * 24 * 7, // 7 days
							path: "/",
						});
					}
				};
			},
		},
	),
);
