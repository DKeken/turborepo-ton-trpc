"use client";

import {
  httpBatchLink,
  splitLink,
  unstable_httpSubscriptionLink,
} from "@trpc/react-query";

import { useState } from "react";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SuperJSON } from "superjson";
import { trpc } from ".";
import { createQueryClient } from "./query-client";

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export function TrpcProvider({
  children,
  cookies,
}: {
  children: React.ReactNode;
  cookies: string | null;
}) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        splitLink({
          condition: (op) => op.type === "subscription",
          true: unstable_httpSubscriptionLink({
            url: "http://localhost:3333/trpc",
            transformer: SuperJSON,
            eventSourceOptions: {
              withCredentials: true,
            },
          }),
          false: httpBatchLink({
            url: "http://localhost:3333/trpc",
            transformer: SuperJSON,
            fetch(url, options) {
              return fetch(url, {
                ...options,
                credentials: "include",
                headers: {
                  Cookie: cookies ?? "",
                },
              });
            },
          }),
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
