import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { WalletGuard } from "@/components/wallet-guard";
import { Providers } from "../___providers";
import { cookies } from "next/headers";

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: { locale: string };
}) {
	// Get and validate locale
	const locale = params.locale;
	
	if (!routing.locales.includes(locale as "en" | "ru")) {
		notFound();
	}

	// Get messages
	const messages = await getMessages();

	// Get cookies string
	const cookieStore = cookies();
	const cookiesStr = cookieStore.toString();

	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<Providers cookies={cookiesStr} locale={locale}>
				<WalletGuard>{children}</WalletGuard>
			</Providers>
		</NextIntlClientProvider>
	);
}
