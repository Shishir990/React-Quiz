import { QueryClient, useQuery, keepPreviousData } from '@tanstack/react-query';
import { getCategoriesApi } from './categories';
import { getMyResultsApi, getMyAnalyticsApi, getResultApi, getLeaderboardApi } from './results';

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

// One place for cache keys, so invalidation can't drift out of sync.
// Prefixes matter: invalidating ['results'] covers every key below it.
export const queryKeys = {
  categories: ['categories'],
  myResults: ['results', 'me'],
  analytics: ['results', 'analytics'],
  result: (id) => ['results', 'detail', id],
  leaderboard: (period, category) => ['leaderboard', period, category || 'all'],
};

// authFetch resolves with the server's error body instead of throwing,
// so check the shape and turn anything unexpected into a real error
const expect = (isValid, fallback) => (data) => {
  if (isValid(data)) return data;
  throw new Error(data?.message || fallback);
};

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategoriesApi().then(expect(Array.isArray, 'Failed to load categories.')),
    staleTime: 5 * 60 * 1000,
  });

export const useMyResults = () =>
  useQuery({
    queryKey: queryKeys.myResults,
    queryFn: () => getMyResultsApi().then(expect(Array.isArray, 'Could not load your results.')),
  });

export const useMyAnalytics = () =>
  useQuery({
    queryKey: queryKeys.analytics,
    queryFn: () => getMyAnalyticsApi().then(expect(Array.isArray, 'Could not load your analytics.')),
  });

// A finished attempt never changes, so it never needs refetching
export const useResult = (id) =>
  useQuery({
    queryKey: queryKeys.result(id),
    queryFn: () => getResultApi(id).then(expect((d) => !!d?._id, 'Could not load this result.')),
    staleTime: Infinity,
  });

export const useLeaderboard = ({ period = 'week', category } = {}) =>
  useQuery({
    queryKey: queryKeys.leaderboard(period, category),
    queryFn: () =>
      getLeaderboardApi({ period, category }).then(
        expect((d) => Array.isArray(d?.players), 'Could not load the leaderboard.')
      ),
    placeholderData: keepPreviousData,
  });

// After a quiz is submitted: history, analytics and rankings are out of date
export const invalidateAfterSubmit = () => {
  queryClient.invalidateQueries({ queryKey: ['results'] });
  queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
};
