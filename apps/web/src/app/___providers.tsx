"use client";

import { TrpcProvider } from "@/trpc/client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { AuthProvider } from "@/components/auth-provider";
import { TonConnectUIProvider } from "@app/tonconnect";

interface ProvidersProps {
	children: React.ReactNode;
	cookies: string | null;
}

export function Providers({ children, cookies }: ProvidersProps) {
	return (
		<TonConnectUIProvider
			manifestUrl={process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL}
		>
			<AuthProvider>
				<TrpcProvider cookies={cookies}>
					{children}
					<ReactQueryDevtools initialIsOpen={false} />
				</TrpcProvider>
			</AuthProvider>
		</TonConnectUIProvider>
	);
}
