"use client";

import { TrpcProvider } from "@/trpc/client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/components/auth-provider";
import { TonConnectUIProvider } from "@app/tonconnect";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { isClientSide } from "@/lib/utils";

interface ProvidersProps {
	children: React.ReactNode;
	cookies: string | null;
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

export function Providers({ children, cookies }: ProvidersProps) {
	const locale = useLocale();

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
			manifestUrl={process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL}
			language={locale as "ru" | "en"}
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
