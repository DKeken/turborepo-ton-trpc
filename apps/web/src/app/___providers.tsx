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

	// Get base URL, ensuring it has protocol and no trailing slash
	const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
	const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

	// Get manifest URL, ensuring it's a full URL
	const manifestPath = '/tonconnect-manifest.json';
	const manifestUrl = `${normalizedBaseUrl}${manifestPath}`;

	return (
		<TonConnectUIProviderNoSSR
			manifestUrl={manifestUrl}
			language={locale as "ru" | "en"}
			restoreConnection={true}
			uiPreferences={{
				theme: 'SYSTEM'
			}}
			actionsConfiguration={{
				twaReturnUrl: normalizedBaseUrl as `${string}://${string}`
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
