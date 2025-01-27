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
	const { getAccountInfo } = useAuth();
	const { data, isLoading, error } = trpc.users.list.useQuery({ limit: 10 });
	const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);

	useEffect(() => {
		const fetchAccountInfo = async () => {
			const info = await getAccountInfo();
			if (info) {
				console.log("infoinfoinfo", info);
				setAccountInfo(info);
			}
		};
		fetchAccountInfo();
	}, [getAccountInfo]);

	console.log("accountInfo", accountInfo);

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
