import { z } from "zod";
import { CHAIN } from "@tonconnect/ui";
import { SuccessResponse } from "../controllers/_types";

// Request DTOs

/**
 * Schema for checking TON Connect proof
 */
export const CheckProofRequestSchema = z
  .object({
    address: z.string(),
    network: z.nativeEnum(CHAIN),
    public_key: z.string(),
    proof: z.object({
      timestamp: z.number(),
      domain: z.object({
        lengthBytes: z.number(),
        value: z.string(),
      }),
      signature: z.string(),
      payload: z.string(),
      state_init: z.string(),
    }),
  })
  .strict();

export type CheckProofRequestDto = z.infer<typeof CheckProofRequestSchema>;

// Response DTOs

/**
 * Generate payload response
 */
export interface GeneratePayloadResponseDto {
  token: string;
}

/**
 * Check proof response
 */
export interface CheckProofResponseDto {
  token: string;
}

/**
 * Account info response
 */
export interface AccountInfoResponseDto {
  address: string;
  account: {
    balance: {
      coins: string;
      currencies: Record<string, string>;
    };
    state: {
      type: string;
      data?: string | null;
      code?: string | null;
    };
  };
}

/**
 * Create a success response
 * @param data - The response data
 * @returns A standardized success response
 */
export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}
