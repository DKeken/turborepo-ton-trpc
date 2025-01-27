import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { WalletGuard } from "@/components/wallet-guard";

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: { locale: string };
}) {
	const { locale } = await params;

	if (!routing.locales.includes(locale as "en" | "ru")) {
		notFound();
	}

	const messages = await getMessages();

	return (
		<NextIntlClientProvider messages={messages}>
			<WalletGuard>{children}</WalletGuard>
		</NextIntlClientProvider>
	);
}
