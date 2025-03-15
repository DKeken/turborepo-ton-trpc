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
}): Promise<React.ReactElement> {
	// Get and validate locale
	const userLocale = (await params).locale;

	if (!routing.locales.includes(userLocale as "en" | "ru")) {
		notFound();
	}

	// Get localization messages
	const localizationMessages = await getMessages();

	// Get cookies string - must await cookies() before using toString()
	const cookieStore = await cookies();
	const serializedCookies = cookieStore.toString();

	return (
		<NextIntlClientProvider locale={userLocale} messages={localizationMessages}>
			<Providers cookies={serializedCookies} locale={userLocale}>
				<WalletGuard>{children}</WalletGuard>
			</Providers>
		</NextIntlClientProvider>
	);
}
