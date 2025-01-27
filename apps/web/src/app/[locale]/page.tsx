"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/components/auth-provider";
import { trpc } from "@/trpc";
import { TonConnectButton } from "@app/tonconnect";
import { useEffect, useState } from "react";
import type { AccountInfo } from "@app/auth-config";

export default function HomePage() {
	const t = useTranslations("HomePage");
	const { accountInfo: authAccountInfo } = useAuth();
	const { data, isLoading, error } = trpc.users.list.useQuery({ limit: 10 });
	const [localAccountInfo, setLocalAccountInfo] = useState<AccountInfo | null>(
		null,
	);

	useEffect(() => {
		// Используем accountInfo из контекста аутентификации
		setLocalAccountInfo(authAccountInfo);
	}, [authAccountInfo]);

	console.log("accountInfo", localAccountInfo);

	return (
		<div>
			<h1>{t("title")}</h1>
			<TonConnectButton />
			{isLoading && !error ? (
				<p>{t("loading")}</p>
			) : (
				<pre>{JSON.stringify(data, null, 2)}</pre>
			)}
			{error && <p>{t("error", { message: error.message })}</p>}
			<Link href="/about">{t("about")}</Link>
		</div>
	);
}
