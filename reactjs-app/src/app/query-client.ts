import { QueryClient } from "@tanstack/react-query";
import { isUnauthorized, tokenStorage } from "@/api/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (isUnauthorized(error)) {
          tokenStorage.clear();
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
