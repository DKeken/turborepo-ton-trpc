import type {
	Account,
	ConnectAdditionalRequest,
	TonProofItemReplySuccess,
} from "@tonconnect/ui";
import { isClientSide, isServerSide } from "./utils";

export class TonProofApi {
	private static instance: TonProofApi;
	private host: string;
	private refreshIntervalMs: number;
	private accessToken: string | null;
	private proofPayload: string | null;

	private constructor() {
		this.host = isServerSide()
			? ""
			: (process.env.NEXT_PUBLIC_BACKEND_URL ?? "");
		this.refreshIntervalMs = 9 * 60 * 1000; // 9 минут для соответствия времени жизни proof
		this.accessToken = null;
		this.proofPayload = null;

		if (!isServerSide()) {
			this.restoreState();
		}
	}

	public static getInstance(): TonProofApi {
		if (!TonProofApi.instance) {
			TonProofApi.instance = new TonProofApi();
		}
		return TonProofApi.instance;
	}

	private restoreState(): void {
		try {
			const savedState = localStorage.getItem("ton-proof-state");
			if (savedState) {
				const parsed = JSON.parse(savedState);
				this.accessToken = parsed.accessToken;
				this.proofPayload = parsed.proofPayload;
			}
		} catch (error) {
			console.error("Failed to restore TonProof state:", error);
			this.reset();
		}
	}

	private saveState(): void {
		if (!isServerSide()) {
			try {
				localStorage.setItem(
					"ton-proof-state",
					JSON.stringify({
						accessToken: this.accessToken,
						proofPayload: this.proofPayload,
					}),
				);
			} catch (error) {
				console.error("Failed to save TonProof state:", error);
			}
		}
	}

	public async generatePayload(): Promise<ConnectAdditionalRequest | null> {
		if (isServerSide()) return null;

		if (this.proofPayload) {
			return { tonProof: this.proofPayload };
		}

		try {
			const response = await fetch(`${this.host}/ton/auth/generate-payload`);
			const data = await response.json();

			if (data.success) {
				const payload = data.data;
				this.proofPayload = payload;
				this.saveState();
				return { tonProof: payload };
			}

			return null;
		} catch (error) {
			console.error("Failed to generate payload:", error);
			return null;
		}
	}

	public reset(): void {
		if (isServerSide()) return;

		this.accessToken = null;
		this.proofPayload = null;
		localStorage.removeItem("ton-proof-state");
		void this.generatePayload();
	}

	public async checkProof(
		proof: TonProofItemReplySuccess["proof"],
		account: Account,
	): Promise<void> {
		if (isServerSide()) return;

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

			const response = await fetch(`${this.host}/ton/auth/check-proof`, {
				method: "POST",
				body: JSON.stringify(reqBody),
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.proofPayload}`,
				},
			});

			const data = await response.json();

			if (data?.token) {
				this.accessToken = data.token;
				this.saveState();

				if (isClientSide()) {
					console.log("reload");
					window.location.reload();
				}
			} else {
				this.reset();
			}
		} catch (error) {
			console.error("checkProof error:", error);
			this.reset();
		}
	}

	public async getAccountInfo(): Promise<object | null> {
		if (isServerSide()) return null;

		try {
			// Восстанавливаем состояние перед каждым запросом
			this.restoreState();

			if (!this.accessToken) {
				throw new Error("No access token available");
			}

			const response = await fetch(`${this.host}/ton/auth/get-account-info`, {
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					"Content-Type": "application/json",
				},
			});

			const data = await response.json();
			return data;
		} catch (error) {
			console.error("Failed to get account info:", error);
			this.reset();
			return null;
		}
	}

	public getAccessToken(): string | null {
		return this.accessToken;
	}

	public getRefreshIntervalMs(): number {
		return this.refreshIntervalMs;
	}
}
