import type { TonConnectUI, Wallet } from "@app/tonconnect";
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
    tonConnectUI: TonConnectUI
  ) => Promise<void>;
  getAccountInfo: () => Promise<AccountInfo | undefined>;
  generatePayload: () => Promise<ConnectAdditionalRequest | null>;
  checkProof: (
    proof: TonProofItemReplySuccess["proof"],
    account: Account
  ) => Promise<void>;
}

const initialState = {
  isAuthenticated: false,
  isLoading: false,
  accountInfo: null,
  firstProofLoading: true,
  accessToken: null,
  proofPayload: null,
  host: "http://localhost:3333",
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
              firstProofLoading: false,
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
                    firstProofLoading: false,
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
                wallet.account
              );
            } else {
              // Instead of disconnecting, request the proof
              console.log(`${logPrefix} No proof found, requesting proof...`);

              // Generate a new payload for the proof request
              const additionalRequest = await get().generatePayload();

              if (additionalRequest) {
                console.log(
                  `${logPrefix} Requesting proof with payload:`,
                  additionalRequest
                );

                // Request the proof from the wallet
                try {
                  await tonConnectUI.setConnectRequestParameters({
                    state: "ready",
                    value: additionalRequest,
                  });

                  // Don't disconnect, just set loading to false and wait for the wallet to respond
                  set({
                    isLoading: false,
                    firstProofLoading: false,
                  });
                } catch (error) {
                  console.error(`${logPrefix} Failed to request proof:`, error);
                  // Only disconnect if there's an error requesting the proof
                  // But don't disconnect if the wallet app is not installed
                  if (
                    !(
                      error instanceof Error &&
                      error.message.includes(
                        "scheme does not have a registered handler"
                      )
                    )
                  ) {
                    tonConnectUI.disconnect();
                  }
                  set({
                    isAuthenticated: false,
                    isLoading: false,
                    accountInfo: null,
                    firstProofLoading: false,
                  });
                }
              } else {
                console.error(
                  `${logPrefix} Failed to generate payload for proof request`
                );
                tonConnectUI.disconnect();
                set({
                  isAuthenticated: false,
                  isLoading: false,
                  accountInfo: null,
                  firstProofLoading: false,
                });
              }
            }
          } catch (error) {
            console.error(`${logPrefix} Wallet status change failed:`, error);
            tonConnectUI.disconnect();
            deleteCookie("accessToken");
            set({
              isAuthenticated: false,
              isLoading: false,
              accountInfo: null,
              firstProofLoading: false,
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
              `${state.host}/ton/auth/generate-payload`
            );

            if (!response.ok) {
              console.error(
                `[Auth:GeneratePayload] Failed to generate payload: ${response.status} ${response.statusText}`
              );
              return null;
            }

            const data = await response.json();

            // Check if the payload is directly in the data object
            if (data && data.payload) {
              const payload = data.payload;
              set({ proofPayload: payload });
              console.log("[Auth:GeneratePayload] Proof payload set:", payload);
              return { tonProof: payload };
            }

            // Check for the old format where payload is in data.data
            if (data && data.success && data.data) {
              const payload = data.data;
              set({ proofPayload: payload });
              console.log("[Auth:GeneratePayload] Proof payload set:", payload);
              return { tonProof: payload };
            }

            console.error(
              "[Auth:GeneratePayload] Server returned unexpected format:",
              data
            );
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
              `${state.host}/ton/auth/check-proof`
            );

            if (!state.proofPayload) {
              console.error(`${logPrefix} No proof payload available`);
              get().reset();
              set({ firstProofLoading: false });
              return;
            }

            const response = await fetch(`${state.host}/ton/auth/check-proof`, {
              method: "POST",
              body: JSON.stringify(reqBody),
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.proofPayload}`,
              },
            });

            if (!response.ok) {
              console.error(
                `${logPrefix} Server returned error: ${response.status} ${response.statusText}`
              );
              get().reset();
              set({ firstProofLoading: false });
              return;
            }

            const data = await response.json();
            console.log(`${logPrefix} Received response:`, data);

            // Check for token in different possible formats
            const token = data?.token || data?.data?.token;

            if (token) {
              console.log(`${logPrefix} Token received, setting auth state`);
              set({ accessToken: token });

              // Immediately try to get account info and set authenticated state
              try {
                const accountInfo = await get().getAccountInfo();
                if (accountInfo) {
                  setCookie("accessToken", token, {
                    maxAge: 60 * 60 * 24 * 7, // 7 days
                    path: "/",
                  });
                  set({
                    isAuthenticated: true,
                    isLoading: false,
                    accountInfo,
                    firstProofLoading: false,
                  });
                } else {
                  console.error(
                    `${logPrefix} Got token but failed to get account info`
                  );
                  get().reset();
                  set({ firstProofLoading: false });
                }
              } catch (error) {
                console.error(
                  `${logPrefix} Failed to get initial account info:`,
                  error
                );
                get().reset();
                set({ firstProofLoading: false });
              }
            } else {
              console.log(`${logPrefix} No token in response, resetting state`);
              get().reset();
              set({ firstProofLoading: false });
            }
          } catch (error) {
            console.error(`${logPrefix} Error:`, error);
            console.log(`${logPrefix} Error occurred, resetting state`);
            get().reset();
            set({ firstProofLoading: false });
          }
        },

        getAccountInfo: async () => {
          if (isServerSide()) return undefined;

          const state = get();
          try {
            if (!state.accessToken) {
              return undefined;
            }

            const response = await fetch(
              `${state.host}/ton/auth/get-account-info`,
              {
                headers: {
                  Authorization: `Bearer ${state.accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (!response.ok) {
              console.error(
                `[Auth:GetAccountInfo] Server returned error: ${response.status} ${response.statusText}`
              );
              get().reset();
              set({ firstProofLoading: false });
              return undefined;
            }

            const data = await response.json();

            // Check for account info in different possible formats
            if (data && "account" in data && "block" in data) {
              const accountInfo = data as AccountInfo;
              set({ accountInfo, firstProofLoading: false });
              return accountInfo;
            }

            // Check if the account info is in data.data
            if (
              data &&
              data.data &&
              "account" in data.data &&
              "block" in data.data
            ) {
              const accountInfo = data.data as AccountInfo;
              set({ accountInfo, firstProofLoading: false });
              return accountInfo;
            }

            console.error(
              "[Auth:GetAccountInfo] Invalid account info format:",
              data
            );
            set({ firstProofLoading: false });
            return undefined;
          } catch (error) {
            console.error("Failed to get account info:", error);
            get().reset();
            set({ firstProofLoading: false });
            return undefined;
          }
        },
      }),
      {
        name: "auth-store",
        enabled: process.env.NODE_ENV === "development",
      }
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
    }
  )
);
