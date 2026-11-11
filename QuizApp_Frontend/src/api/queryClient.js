import { QueryClient } from '@tanstack/react-query';

// Cached data shows instantly when you come back to a page; anything older
// than staleTime is quietly refetched in the background.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});
