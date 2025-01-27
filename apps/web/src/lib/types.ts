import type { useTonWallet } from "@app/tonconnect";
import type { AccountInfo } from "@app/auth-config";

export interface AuthContextType {
	isAuthenticated: boolean;
	isLoading: boolean;
	wallet: ReturnType<typeof useTonWallet>;
	getAccountInfo: () => Promise<AccountInfo | undefined>;
	accountInfo: AccountInfo | null;
}
