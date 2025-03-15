import { CHAIN } from "@tonconnect/ui";
import zod from "zod";
import { CheckProofRequestDto as NewCheckProofRequestDto } from "../services/ton/dto/ton-proof.dto";

/**
 * @deprecated Use the schema from "../services/ton/dto/ton-proof.dto" instead
 */
export const CheckProofRequest = zod.object({
  address: zod.string(),
  network: zod.enum([CHAIN.MAINNET, CHAIN.TESTNET]),
  public_key: zod.string(),
  proof: zod.object({
    timestamp: zod.number(),
    domain: zod.object({
      lengthBytes: zod.number(),
      value: zod.string(),
    }),
    payload: zod.string(),
    signature: zod.string(),
    state_init: zod.string(),
  }),
});

/**
 * @deprecated Use CheckProofRequestDto from "../services/ton/dto/ton-proof.dto" instead
 */
export type CheckProofRequestDto = NewCheckProofRequestDto;
