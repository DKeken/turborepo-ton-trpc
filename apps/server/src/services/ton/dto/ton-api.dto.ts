import { TonClient4 } from "@ton/ton";
import { CHAIN } from "@tonconnect/ui";

/**
 * Configuration for TON client
 */
export interface TonClientConfig {
  endpoint: string;
}

/**
 * Type for account information response
 */
export type AccountInfoResponse = ReturnType<TonClient4["getAccount"]>;

/**
 * Mapping of TON chains to API endpoints
 */
export const TON_ENDPOINTS: Record<CHAIN, string> = {
  [CHAIN.MAINNET]: "https://mainnet-v4.tonhubapi.com",
  [CHAIN.TESTNET]: "https://testnet-v4.tonhubapi.com",
} as const;
