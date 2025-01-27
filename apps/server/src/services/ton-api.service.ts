import { Address, TonClient4 } from "@ton/ton";
import { CHAIN } from "@tonconnect/ui";
import { Buffer } from "node:buffer";

interface TonClientConfig {
	endpoint: string;
}

type AccountInfoResponse = ReturnType<TonClient4["getAccount"]>;

export class TonApiService {
	private static readonly ENDPOINTS: Record<CHAIN, string> = {
		[CHAIN.MAINNET]: "https://mainnet-v4.tonhubapi.com",
		[CHAIN.TESTNET]: "https://testnet-v4.tonhubapi.com",
	};

	public static create(clientOrChain: TonClient4 | CHAIN): TonApiService {
		if (clientOrChain instanceof TonClient4) {
			return new TonApiService(clientOrChain);
		}

		const endpoints = TonApiService.ENDPOINTS;
		const config: TonClientConfig = {
			endpoint: endpoints[clientOrChain],
		};

		return new TonApiService(new TonClient4(config));
	}

	private constructor(private readonly client: TonClient4) {}

	/**
	 * Retrieves the wallet's public key associated with the given address.
	 * @param address - The TON wallet address
	 * @returns Promise resolving to the public key as a Buffer
	 * @throws Error if the address is invalid or request fails
	 */
	public async getWalletPublicKey(address: string): Promise<Buffer> {
		try {
			const parsedAddress = Address.parse(address);
			const {
				last: { seqno },
			} = await this.client.getLastBlock();
			const result = await this.client.runMethod(
				seqno,
				parsedAddress,
				"get_public_key",
				[],
			);

			const pubKeyHex = result.reader
				.readBigNumber()
				.toString(16)
				.padStart(64, "0");
			return Buffer.from(pubKeyHex, "hex");
		} catch (error: unknown) {
			throw new Error(
				`Failed to get wallet public key: ${(error as Error).message}`,
			);
		}
	}

	/**
	 * Fetches detailed account information for the given address.
	 * @param address - The TON wallet address
	 * @returns Promise resolving to the account information
	 * @throws Error if the address is invalid or request fails
	 */
	public async getAccountInfo(address: string): Promise<AccountInfoResponse> {
		try {
			const parsedAddress = Address.parse(address);
			const {
				last: { seqno },
			} = await this.client.getLastBlock();
			return await this.client.getAccount(seqno, parsedAddress);
		} catch (error: unknown) {
			throw new Error(
				`Failed to get account info: ${(error as Error).message}`,
			);
		}
	}
}
