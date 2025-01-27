import type { useTonWallet } from "@app/tonconnect";

export interface AccountInfo {
	account: {
		balance: {
			coins: string;
		};
		last: {
			hash: string;
			lt: string;
		};
		state: {
			code: string;
			data: string;
			type: string;
		};
		storageStat: {
			duePayment: null;
			lastPaid: number;
			used: {
				bits: number;
				cells: number;
				publicCells: number;
			};
		};
	};
	block: {
		fileHash: string;
		rootHash: string;
		seqno: number;
		shard: string;
		workchain: number;
	};
	address: string;
}

export interface AuthContextType {
	isAuthenticated: boolean;
	isLoading: boolean;
	wallet: ReturnType<typeof useTonWallet>;
	getAccountInfo: () => Promise<AccountInfo | undefined>;
	accountInfo: AccountInfo | null;
}
