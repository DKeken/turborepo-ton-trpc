"use client";

import { useAuth } from "@/components/auth-provider";
import type { AccountInfo } from "@/lib/types";
import { trpc } from "@/trpc";
import { TonConnectButton } from "@app/tonconnect";
import { useEffect, useState } from "react";

export default function UserPage() {
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
			<TonConnectButton />
			{isLoading && !error ? (
				<p>Loading...</p>
			) : (
				<pre>{JSON.stringify(data, null, 2)}</pre>
			)}
			{error && <p>Error: {error.message}</p>}
		</div>
	);
}
