"use client";

import { useTonConnectUI, useTonWallet } from "@app/tonconnect";
import type React from "react";
import {
	createContext,
	useContext,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { TonProofApi } from "../lib/ton-proof";
import { useInterval } from "../hooks/use-interval";
import type { AuthContextType, AccountInfo } from "@/lib/types";
import { setCookie, deleteCookie } from "cookies-next";

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
	const context = useContext(AuthContext);
	console.log("[useAuth] context:", context);
	if (!context) {
		throw new Error("useAuth должен использоваться внутри AuthProvider");
	}
	return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	console.log("[AuthProvider] Initializing...");
	const firstProofLoading = useRef<boolean>(true);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
	const wallet = useTonWallet();
	const [tonConnectUI] = useTonConnectUI();

	const recreateProofPayload = useCallback(async () => {
		console.log("[recreateProofPayload] Starting...");
		console.log(
			"[recreateProofPayload] firstProofLoading:",
			firstProofLoading.current,
		);

		if (firstProofLoading.current) {
			console.log("[recreateProofPayload] Setting loading state");
			tonConnectUI.setConnectRequestParameters({ state: "loading" });
			firstProofLoading.current = false;
		}

		const payload = await TonProofApi.getInstance().generatePayload();
		console.log("[recreateProofPayload] Generated payload:", payload);

		if (payload) {
			console.log("[recreateProofPayload] Setting ready state with payload");
			tonConnectUI.setConnectRequestParameters({
				state: "ready",
				value: payload,
			});
		} else {
			console.log("[recreateProofPayload] No payload, setting null");
			tonConnectUI.setConnectRequestParameters(null);
		}
	}, [tonConnectUI]);

	useEffect(() => {
		console.log(
			"[useEffect] Checking firstProofLoading:",
			firstProofLoading.current,
		);
		if (firstProofLoading.current) {
			void recreateProofPayload();
		}
	}, [recreateProofPayload]);

	useInterval(
		recreateProofPayload,
		TonProofApi.getInstance().getRefreshIntervalMs(),
	);

	useEffect(() => {
		console.log("[statusChange] Setting up status change listener");

		return tonConnectUI.onStatusChange(async (w) => {
			console.log("[statusChange] Wallet status changed:", w);
			setIsLoading(true);

			if (!w) {
				console.log("[statusChange] No wallet, resetting");
				TonProofApi.getInstance().reset();
				deleteCookie("accessToken");
				setIsAuthenticated(false);
				setIsLoading(false);
				return;
			}

			console.log(
				"[statusChange] Checking tonProof items:",
				w.connectItems?.tonProof,
			);
			if (w.connectItems?.tonProof && "proof" in w.connectItems.tonProof) {
				console.log("[statusChange] Checking proof");
				await TonProofApi.getInstance().checkProof(
					w.connectItems.tonProof.proof,
					w.account,
				);
			}

			const accessToken = TonProofApi.getInstance().getAccessToken();
			console.log(
				"[statusChange] Access token:",
				accessToken ? "exists" : "missing",
			);

			if (!accessToken) {
				console.log("[statusChange] No access token, disconnecting");
				tonConnectUI.disconnect();
				deleteCookie("accessToken");
				setIsAuthenticated(false);
				setIsLoading(false);
				return;
			}

			console.log("[statusChange] Authentication successful");
			setCookie("accessToken", accessToken, {
				maxAge: 60 * 60 * 24 * 7, // 7 days
				path: "/",
			});
			setIsAuthenticated(true);
			setIsLoading(false);
		});
	}, [tonConnectUI]);

	const getAccountInfo = useCallback(async () => {
		console.log("[getAccountInfo] Starting with wallet:", wallet);
		if (!wallet) return;

		const info = await TonProofApi.getInstance().getAccountInfo();
		console.log("[getAccountInfo] Received info:", info);

		if (info && "account" in info && "block" in info) {
			console.log("[getAccountInfo] Valid account info received");
			const accountInfo = info as AccountInfo;
			setAccountInfo(accountInfo);
			return accountInfo;
		}
	}, [wallet]);

	console.log("[AuthProvider] Current state:", {
		isAuthenticated,
		isLoading,
		accountInfo,
	});

	return (
		<AuthContext.Provider
			value={{
				isAuthenticated,
				isLoading,
				wallet,
				getAccountInfo,
				accountInfo,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};
