"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "@/i18n/routing";

export function I18nSwitcher() {
	const locale = useLocale();
	const router = useRouter();

	const handleLocaleChange = (newLocale: string) => {
		router.replace("/", { locale: newLocale });
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="h-9 w-9">
					<Languages className="h-4 w-4" />
					<span className="sr-only">Switch language</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					disabled={locale === "en"}
					onClick={() => handleLocaleChange("en")}
				>
					English
				</DropdownMenuItem>
				<DropdownMenuItem
					disabled={locale === "ru"}
					onClick={() => handleLocaleChange("ru")}
				>
					Русский
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
