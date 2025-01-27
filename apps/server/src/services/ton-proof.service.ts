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
import { tryParsePublicKey } from "../crypto-wrappers/wallets-data";
import type { CheckProofRequestDto } from "../dto/check-proof-request-dto";

interface DomainInfo {
	lengthBytes: number;
	value: string;
}

interface ProofMessage {
	workchain: number;
	address: Uint8Array;
	domain: DomainInfo;
	signature: Buffer;
	payload: string;
	stateInit: string;
	timestamp: number;
}

const PROOF_CONFIG = {
	tonProofPrefix: "ton-proof-item-v2/",
	tonConnectPrefix: "ton-connect",
	allowedDomains: ["yedev01.ws.network", "localhost:3000"] as const,
	validAuthTimeSeconds: 15 * 60, // 15 minutes
} as const;

export class TonProofService {
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
		getWalletPublicKey: (address: string) => Promise<Buffer | null>,
	): Promise<boolean> {
		try {
			const { proof, address: walletAddress, public_key } = payload;
			const stateInit = loadStateInit(
				Cell.fromBase64(proof.state_init).beginParse(),
			);

			// Verify public key
			const publicKey = await this.verifyPublicKey({
				stateInit,
				walletAddress,
				getWalletPublicKey,
				expectedPublicKey: public_key,
			});

			if (!publicKey) return false;

			// Verify address
			const parsedAddress = Address.parse(walletAddress);
			const derivedAddress = contractAddress(
				parsedAddress.workChain,
				stateInit,
			);
			if (!derivedAddress.equals(parsedAddress)) return false;

			// Verify domain and timestamp
			if (!this.verifyDomainAndTimestamp(proof)) return false;

			// Construct and verify proof message
			const message = this.constructProofMessage(parsedAddress, proof);
			const messageHash = await this.calculateMessageHash(message);
			const signatureValid = sign.detached.verify(
				messageHash,
				message.signature,
				publicKey,
			);

			return signatureValid;
		} catch (error) {
			console.error("Proof verification failed:", error);
			return false;
		}
	}

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

	private verifyDomainAndTimestamp(
		proof: CheckProofRequestDto["proof"],
	): boolean {
		const isDomainAllowed = PROOF_CONFIG.allowedDomains.includes(
			proof.domain.value as (typeof PROOF_CONFIG.allowedDomains)[number],
		);
		if (!isDomainAllowed) return false;

		const now = Math.floor(Date.now() / 1000);
		return now - PROOF_CONFIG.validAuthTimeSeconds <= proof.timestamp;
	}

	private constructProofMessage(
		address: Address,
		proof: CheckProofRequestDto["proof"],
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
