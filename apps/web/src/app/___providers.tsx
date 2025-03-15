"use client";

import { TrpcProvider } from "@/trpc/client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/components/auth-provider";
import { TonConnectUIProvider } from "@app/tonconnect";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { isClientSide } from "@/lib/utils";

interface ProvidersProps {
	children: React.ReactNode;
	cookies: string | null;
	locale: string;
}

const TonConnectUIProviderNoSSR = dynamic(
	() => Promise.resolve(TonConnectUIProvider),
	{
		ssr: false,
		loading: () => (
			<div className="flex min-h-screen w-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		),
	},
);

export function Providers({ children, cookies, locale }: ProvidersProps) {
	useEffect(() => {
		const currentLocale = localStorage.getItem("locale");

		if (currentLocale && currentLocale !== locale && isClientSide()) {
			localStorage.setItem("locale", locale);
			window.location.reload();
		} else if (!currentLocale && isClientSide()) {
			localStorage.setItem("locale", locale);
		}
	}, [locale]);

	return (
		<TonConnectUIProviderNoSSR
			manifestUrl={window.location.origin + "/tonconnect-manifest.json"}
			language={locale as "ru" | "en"}
			restoreConnection={true}
			uiPreferences={{
				theme: 'SYSTEM'
			}}
			actionsConfiguration={{
				twaReturnUrl: window.location.origin as `${string}://${string}`
			}}
		>
			<AuthProvider>
				<TrpcProvider cookies={cookies}>
					{children}
					<ReactQueryDevtools initialIsOpen={false} />
				</TrpcProvider>
			</AuthProvider>
		</TonConnectUIProviderNoSSR>
	);
}
