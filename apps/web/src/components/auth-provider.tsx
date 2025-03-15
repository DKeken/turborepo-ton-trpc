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

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement => {
  const wallet = useTonWallet();
  const [tonConnectUI] = useTonConnectUI();
  const firstProofLoadingRef = useRef<boolean>(true);
  const initialCheckDoneRef = useRef<boolean>(false);

  const {
    isAuthenticated,
    isLoading,
    accountInfo,
    firstProofLoading,
    refreshIntervalMs,
    generatePayload,
    handleWalletStatusChange,
    getAccountInfo,
    setIsAuthenticated,
    setAccountInfo,
    reset,
  } = useAuthStore(
    useShallow((state) => {
      return {
        isAuthenticated: state.isAuthenticated,
        isLoading: state.isLoading,
        accountInfo: state.accountInfo,
        firstProofLoading: state.firstProofLoading,
        refreshIntervalMs: state.refreshIntervalMs,
        generatePayload: state.generatePayload,
        handleWalletStatusChange: state.handleWalletStatusChange,
        getAccountInfo: state.getAccountInfo,
        setIsAuthenticated: state.setIsAuthenticated,
        setAccountInfo: state.setAccountInfo,
        reset: state.reset,
      };
    })
  );

  // Check account info on mount and logout if 401 error
  useEffect(() => {
    if (initialCheckDoneRef.current) return;

    const checkInitialAuth = async () => {
      try {
        const info = await getAccountInfo();
        if (!info) {
          // If no account info, reset auth state
          reset();
          setIsAuthenticated(false);
          setAccountInfo(null);
          if (wallet) {
            tonConnectUI.disconnect();
          }
        }
      } catch (error) {
        // If error (like 401), reset auth state
        reset();
        setIsAuthenticated(false);
        setAccountInfo(null);
        if (wallet) {
          tonConnectUI.disconnect();
        }
      } finally {
        initialCheckDoneRef.current = true;
      }
    };

    void checkInitialAuth();
  }, [
    getAccountInfo,
    reset,
    setIsAuthenticated,
    setAccountInfo,
    tonConnectUI,
    wallet,
  ]);

  const memoizedGetAccountInfo = useCallback(() => {
    if (!isAuthenticated) return Promise.resolve(undefined);
    return getAccountInfo();
  }, [isAuthenticated, getAccountInfo]);

  const handleProofPayload = useCallback(async (): Promise<void> => {
    if (firstProofLoadingRef.current) {
      tonConnectUI.setConnectRequestParameters({ state: "loading" });
      firstProofLoadingRef.current = false;
    }

    try {
      const payload = await generatePayload();

      if (payload) {
        tonConnectUI.setConnectRequestParameters({
          state: "ready",
          value: payload,
        });
      } else {
        tonConnectUI.setConnectRequestParameters(null);
      }
    } catch {
      tonConnectUI.setConnectRequestParameters(null);
    }
  }, [generatePayload, tonConnectUI]);

  useEffect(() => {
    if (firstProofLoading) {
      void handleProofPayload();
    }
  }, [firstProofLoading, handleProofPayload]);

  useInterval(handleProofPayload, refreshIntervalMs);

  // Modify the wallet status change handler to ensure generatePayload is called before checkProof
  useEffect(() => {
    return tonConnectUI.onStatusChange(async (w) => {
      // Always generate a new payload before handling wallet status change
      await generatePayload();
      void handleWalletStatusChange(w, tonConnectUI);
    });
  }, [tonConnectUI, handleWalletStatusChange, generatePayload]);

  const contextValue = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      wallet,
      getAccountInfo: memoizedGetAccountInfo,
      accountInfo,
    }),
    [isAuthenticated, isLoading, wallet, memoizedGetAccountInfo, accountInfo]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
