import { sha256 } from "@ton/crypto";
import {
  Address,
  Cell,
  contractAddress,
  loadStateInit,
  type StateInit,
} from "@ton/ton";
import { Buffer } from "node:buffer";
import { randomBytes, sign } from "tweetnacl";
import { injectable, inject } from "inversify";
import { TYPES } from "@/__di/types";
import Logger from "@app/logger";
import {
  CheckProofRequestDto,
  PROOF_CONFIG,
  ProofMessage,
} from "./dto/ton-proof.dto";
import { tryParsePublicKey } from "@/_crypto-wrappers/wallets-data";

/**
 * Service for TON Connect proof verification
 */
@injectable()
export class TonProofService {
  private readonly logger: Logger;

  constructor(@inject(TYPES.LOGGER) logger?: Logger) {
    this.logger = logger || Logger.createLogger({ prefix: "TonProofService" });
  }

  /**
   * Generates a cryptographically secure random payload for authentication
   * @returns Hex-encoded random payload
   */
  public generatePayload(): string {
    return Buffer.from(randomBytes(32)).toString("hex");
  }

  /**
   * Validates a TON Connect proof according to the specification:
   * https://github.com/ton-blockchain/ton-connect/blob/main/requests-responses.md#address-proof-signature-ton_proof
   *
   * @param payload - The proof payload to validate
   * @param getWalletPublicKey - Callback to retrieve wallet's public key
   * @returns Promise resolving to true if proof is valid, false otherwise
   */
  public async checkProof(
    payload: CheckProofRequestDto,
    getWalletPublicKey: (address: string) => Promise<Buffer | null>
  ): Promise<boolean> {
    try {
      const { proof, address: walletAddress, public_key } = payload;
      const stateInit = this.parseStateInit(proof.state_init);

      // Verify public key
      const publicKey = await this.verifyPublicKey({
        stateInit,
        walletAddress,
        getWalletPublicKey,
        expectedPublicKey: public_key,
      });

      if (!publicKey) {
        this.logger.warn("Public key verification failed", { walletAddress });
        return false;
      }

      // Verify address
      const parsedAddress = Address.parse(walletAddress);
      if (!this.verifyAddress(parsedAddress, stateInit)) {
        this.logger.warn("Address verification failed", { walletAddress });
        return false;
      }

      // Verify domain and timestamp
      if (!this.verifyDomainAndTimestamp(proof)) {
        this.logger.warn("Domain or timestamp verification failed", {
          domain: proof.domain.value,
          timestamp: proof.timestamp,
        });
        return false;
      }

      // Construct and verify proof message
      const message = this.constructProofMessage(parsedAddress, proof);
      const messageHash = await this.calculateMessageHash(message);
      const signatureValid = sign.detached.verify(
        messageHash,
        message.signature,
        publicKey
      );

      if (!signatureValid) {
        this.logger.warn("Signature verification failed", { walletAddress });
      }

      return signatureValid;
    } catch (error) {
      this.logger.error("Proof verification failed", error);
      return false;
    }
  }

  /**
   * Parse state init from base64 string
   */
  private parseStateInit(stateInitBase64: string): StateInit {
    return loadStateInit(Cell.fromBase64(stateInitBase64).beginParse());
  }

  /**
   * Verify address against state init
   */
  private verifyAddress(address: Address, stateInit: StateInit): boolean {
    const derivedAddress = contractAddress(address.workChain, stateInit);
    return derivedAddress.equals(address);
  }

  /**
   * Verify public key
   */
  private async verifyPublicKey({
    stateInit,
    walletAddress,
    getWalletPublicKey,
    expectedPublicKey,
  }: {
    stateInit: StateInit;
    walletAddress: string;
    getWalletPublicKey: (address: string) => Promise<Buffer | null>;
    expectedPublicKey: string;
  }): Promise<Buffer | false> {
    const publicKey =
      tryParsePublicKey(stateInit) ?? (await getWalletPublicKey(walletAddress));
    if (!publicKey) return false;

    const wantedPublicKey = Buffer.from(expectedPublicKey, "hex");
    return publicKey.equals(wantedPublicKey) ? publicKey : false;
  }

  /**
   * Verify domain and timestamp
   */
  private verifyDomainAndTimestamp(
    proof: CheckProofRequestDto["proof"]
  ): boolean {
    const isDomainAllowed = PROOF_CONFIG.allowedDomains.includes(
      proof.domain.value as (typeof PROOF_CONFIG.allowedDomains)[number]
    );
    if (!isDomainAllowed) return false;

    const now = Math.floor(Date.now() / 1000);
    return now - PROOF_CONFIG.validAuthTimeSeconds <= proof.timestamp;
  }

  /**
   * Construct proof message
   */
  private constructProofMessage(
    address: Address,
    proof: CheckProofRequestDto["proof"]
  ): ProofMessage {
    return {
      workchain: address.workChain,
      address: address.hash,
      domain: {
        lengthBytes: proof.domain.lengthBytes,
        value: proof.domain.value,
      },
      signature: Buffer.from(proof.signature, "base64"),
      payload: proof.payload,
      stateInit: proof.state_init,
      timestamp: proof.timestamp,
    };
  }

  /**
   * Calculate message hash
   */
  private async calculateMessageHash(message: ProofMessage): Promise<Buffer> {
    const wc = Buffer.alloc(4);
    wc.writeUInt32BE(message.workchain, 0);

    const timestamp = Buffer.alloc(8);
    timestamp.writeBigUInt64LE(BigInt(message.timestamp), 0);

    const domainLength = Buffer.alloc(4);
    domainLength.writeUInt32LE(message.domain.lengthBytes, 0);

    const proofMsg = Buffer.concat([
      Buffer.from(PROOF_CONFIG.tonProofPrefix),
      wc,
      message.address,
      domainLength,
      Buffer.from(message.domain.value),
      timestamp,
      Buffer.from(message.payload),
    ]);

    const proofMsgHash = Buffer.from(await sha256(proofMsg));
    const fullMsg = Buffer.concat([
      Buffer.from([0xff, 0xff]),
      Buffer.from(PROOF_CONFIG.tonConnectPrefix),
      proofMsgHash,
    ]);

    return Buffer.from(await sha256(fullMsg));
  }
}
