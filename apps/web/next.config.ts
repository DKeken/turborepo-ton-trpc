import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	serverExternalPackages: ["@app/database"],
	async headers() {
		return [
			{
				source: "/tonconnect-manifest.json",
				headers: [
					{
						key: "Access-Control-Allow-Origin",
						value: "*",
					},
					{
						key: "Access-Control-Allow-Methods",
						value: "GET",
					},
					{
						key: "Access-Control-Allow-Headers",
						value: "*",
					},
				],
			},
		];
	},
};

export default nextConfig;
