import { env } from "@/_config/env";
import { z } from "zod";

/**
 * Domain information for proof verification
 */
export interface DomainInfo {
  lengthBytes: number;
  value: string;
}

/**
 * Proof message structure for verification
 */
export interface ProofMessage {
  workchain: number;
  address: Uint8Array;
  domain: DomainInfo;
  signature: Buffer;
  payload: string;
  stateInit: string;
  timestamp: number;
}

/**
 * Configuration for proof verification
 */
export const PROOF_CONFIG = {
  tonProofPrefix: "ton-proof-item-v2/",
  tonConnectPrefix: "ton-connect",
  allowedDomains: [
    env.FRONTEND_URL.replace("http://", "").replace("/", ""),
  ] as const,
  validAuthTimeSeconds: 15 * 60, // 15 minutes
} as const;

/**
 * Schema for proof domain
 */
export const proofDomainSchema = z.object({
  lengthBytes: z.number(),
  value: z.string(),
});

/**
 * Schema for proof data
 */
export const proofSchema = z.object({
  timestamp: z.number(),
  domain: proofDomainSchema,
  signature: z.string(),
  payload: z.string(),
  state_init: z.string(),
});

/**
 * Schema for check proof request
 */
export const checkProofRequestSchema = z.object({
  proof: proofSchema,
  address: z.string(),
  public_key: z.string(),
});

/**
 * Type for check proof request
 */
export type CheckProofRequestDto = z.infer<typeof checkProofRequestSchema>;

/**
 * Type for proof domain
 */
export type ProofDomainDto = z.infer<typeof proofDomainSchema>;

/**
 * Type for proof data
 */
export type ProofDto = z.infer<typeof proofSchema>;
