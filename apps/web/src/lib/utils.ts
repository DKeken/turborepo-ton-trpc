import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function isClientSide() {
	return typeof window !== "undefined";
}

export function isServerSide() {
	return typeof window === "undefined";
}
