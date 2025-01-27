"use client";

import { useTonConnectUI, useTonWallet } from "@app/tonconnect";
import type React from "react";
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useCallback,
	useRef,
} from "react";
import type { AuthContextType } from "@/lib/types";
import { useAuthStore } from "@/store/auth.store";
import { useInterval } from "@/hooks/use-interval";
import { useShallow } from "zustand/shallow";

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		console.error("useAuth was called outside of AuthProvider");
		throw new Error("useAuth must be used within AuthProvider");
	}
	return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	console.log("AuthProvider rendering");

	const wallet = useTonWallet();
	const [tonConnectUI] = useTonConnectUI();
	const firstProofLoadingRef = useRef<boolean>(true);

	const {
		isAuthenticated,
		isLoading,
		accountInfo,
		firstProofLoading,
		refreshIntervalMs,
		generatePayload,
		handleWalletStatusChange,
		getAccountInfo,
	} = useAuthStore(
		useShallow((state) => {
			console.log("AuthStore state update:", state);
			return {
				isAuthenticated: state.isAuthenticated,
				isLoading: state.isLoading,
				accountInfo: state.accountInfo,
				firstProofLoading: state.firstProofLoading,
				refreshIntervalMs: state.refreshIntervalMs,
				generatePayload: state.generatePayload,
				handleWalletStatusChange: state.handleWalletStatusChange,
				getAccountInfo: state.getAccountInfo,
			};
		}),
	);

	const handleProofPayload = useCallback(async () => {
		console.log("Handling proof payload refresh");

		if (firstProofLoadingRef.current) {
			console.log("Setting loading state for initial proof");
			tonConnectUI.setConnectRequestParameters({ state: "loading" });
			firstProofLoadingRef.current = false;
		}

		const payload = await generatePayload();

		if (payload) {
			console.log("Setting ready state with payload");
			tonConnectUI.setConnectRequestParameters({
				state: "ready",
				value: payload,
			});
		} else {
			console.log("No payload, setting null parameters");
			tonConnectUI.setConnectRequestParameters(null);
		}
	}, [generatePayload, tonConnectUI]);

	useEffect(() => {
		if (firstProofLoading) {
			console.log("Initial proof payload loading");
			void handleProofPayload();
		}
	}, [firstProofLoading, handleProofPayload]);

	useInterval(handleProofPayload, refreshIntervalMs);

	useEffect(() => {
		console.log("Setting up wallet status change listener");
		return tonConnectUI.onStatusChange((w) => {
			console.log("Wallet status changed:", w);
			void handleWalletStatusChange(w, tonConnectUI);
		});
	}, [tonConnectUI, handleWalletStatusChange]);

	const contextValue = useMemo(() => {
		console.log("Creating new context value", {
			isAuthenticated,
			isLoading,
			wallet,
			accountInfo,
		});
		return {
			isAuthenticated,
			isLoading,
			wallet,
			getAccountInfo: () => {
				console.log("Getting account info for wallet:", wallet);
				return getAccountInfo();
			},
			accountInfo,
		};
	}, [isAuthenticated, isLoading, wallet, getAccountInfo, accountInfo]);

	return (
		<AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
	);
};
