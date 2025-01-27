"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TonConnectButton } from "@app/tonconnect";
import { Loader2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { I18nSwitcher } from "./i18n-switcher";
import { ThemeSwitcher } from "./theme-switcher";
import { useAuth } from "./auth-provider";

export function WalletGuard({ children }: React.PropsWithChildren) {
	const t = useTranslations("WalletGuard");
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="flex min-h-screen w-full items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex min-h-screen w-full items-center justify-center p-4">
				<Card className="relative w-full max-w-md bg-gradient-to-br from-background to-muted/50 duration-700 animate-in fade-in slide-in-from-bottom-8">
					{/* Декоративный фоновый градиент */}
					<div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/5 to-background opacity-50 blur-3xl" />

					<CardHeader className="text-center">
						<div className="mb-6 flex items-center justify-between">
							<CardTitle className="flex items-center gap-3">
								<div className="rounded-xl bg-primary/10 p-2 backdrop-blur-sm">
									<Wallet className="h-6 w-6 animate-pulse text-primary" />
								</div>
								<span className="duration-1000 animate-in fade-in slide-in-from-left-8">
									{t("WalletConnect.Title")}
								</span>
							</CardTitle>

							<div className="flex items-center gap-2">
								<ThemeSwitcher />
								<I18nSwitcher />
							</div>
						</div>
						<p className="text-left text-sm text-muted-foreground duration-1000 animate-in fade-in slide-in-from-left-12">
							{t("WalletConnect.Description")}
						</p>
					</CardHeader>

					<CardContent className="flex pb-8">
						<div className="w-full max-w-sm duration-1000 animate-in fade-in slide-in-from-bottom-12">
							<TonConnectButton className="w-full rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-lg" />
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return children;
}
