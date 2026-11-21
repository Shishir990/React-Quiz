import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { getCategoriesApi } from './categories';
import { listProgressApi } from './progress';
import { getMyResultsApi, getMyAnalyticsApi, getResultApi, getLeaderboardApi } from './results';
import { getAdminStatsApi, getUsersApi, getAdminCategoriesApi, getQuestionsApi } from './admin';
import { getSessionsApi } from './auth';
import { listUserQuizzesApi, getUserQuizApi } from './userQuizzes';

export { queryClient };

// One place for cache keys, so invalidation can't drift out of sync.
// Prefixes matter: invalidating ['results'] covers every key below it.
export const queryKeys = {
  categories: ['categories'],
  myResults: ['results', 'me'],
  analytics: ['results', 'analytics'],
  result: (id) => ['results', 'detail', id],
  leaderboard: (period, category) => ['leaderboard', period, category || 'all'],
  savedProgress: ['progress'],
  sessions: ['auth', 'sessions'],
  userQuizzes: ['userQuizzes'],
  userQuiz: (id) => ['userQuizzes', id],
};

// authFetch resolves with the server's error body instead of throwing,
// so check the shape and turn anything unexpected into a real error
const expect = (data, isValid, fallback) => {
  if (isValid(data)) return data;
  throw new Error(data?.message || fallback);
};

export const useCategories = () =>
  useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => expect(await getCategoriesApi(), Array.isArray, 'Failed to load categories.'),
    staleTime: 5 * 60 * 1000,
  });

// Quizzes the player left part-way through (any device)
export const useSavedProgress = () =>
  useQuery({
    queryKey: queryKeys.savedProgress,
    queryFn: async () => expect(await listProgressApi(), Array.isArray, 'Could not load saved quizzes.'),
    staleTime: 0,
  });

// Devices signed in to this account; always refetched, since other devices change it
export const useSessions = () =>
  useQuery({
    queryKey: queryKeys.sessions,
    queryFn: async () => expect(await getSessionsApi(), Array.isArray, 'Could not load your sessions.'),
    staleTime: 0,
  });

export const useMyResults = () =>
  useQuery({
    queryKey: queryKeys.myResults,
    queryFn: async () => expect(await getMyResultsApi(), Array.isArray, 'Could not load your results.'),
  });

export const useMyAnalytics = () =>
  useQuery({
    queryKey: queryKeys.analytics,
    queryFn: async () => expect(await getMyAnalyticsApi(), Array.isArray, 'Could not load your analytics.'),
  });

// A finished attempt never changes, so it never needs refetching
export const useResult = (id) =>
  useQuery({
    queryKey: queryKeys.result(id),
    queryFn: async () => expect(await getResultApi(id), (d) => !!d?._id, 'Could not load this result.'),
    staleTime: Infinity,
  });

export const useLeaderboard = ({ period = 'week', category } = {}) =>
  useQuery({
    queryKey: queryKeys.leaderboard(period, category),
    queryFn: async () =>
      expect(await getLeaderboardApi({ period, category }), (d) => Array.isArray(d?.players), 'Could not load the leaderboard.'),
    placeholderData: keepPreviousData,
  });

// ── Admin ──
// staleTime 0: a revisited admin page shows its cached data instantly but
// always refetches, since admins need the current state before acting on it.
// adminFetch throws on errors itself, so no shape checks are needed here.
export const adminKeys = {
  stats: ['admin', 'stats'],
  users: ['admin', 'users'],
  categories: ['admin', 'categories'],
  questions: (categoryId) => ['admin', 'questions', categoryId || 'all'],
};

export const useAdminStats = () =>
  useQuery({ queryKey: adminKeys.stats, queryFn: getAdminStatsApi, staleTime: 0 });

export const useAdminUsers = () =>
  useQuery({ queryKey: adminKeys.users, queryFn: getUsersApi, staleTime: 0 });

export const useAdminCategories = () =>
  useQuery({ queryKey: adminKeys.categories, queryFn: getAdminCategoriesApi, staleTime: 0 });

const byCreated = (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0);

// Sorted oldest first in `select`, so cache updates can just append
export const useAdminQuestions = (categoryId) =>
  useQuery({
    queryKey: adminKeys.questions(categoryId),
    queryFn: () => getQuestionsApi(categoryId),
    select: (questions) => [...questions].sort(byCreated),
    staleTime: 0,
  });

// After a quiz is submitted: history, analytics and rankings are out of date
export const invalidateAfterSubmit = () => {
  queryClient.invalidateQueries({ queryKey: ['results'] });
  queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
};

// Quizzes the player wrote themselves (list without questions)
export const useUserQuizzes = () =>
  useQuery({
    queryKey: queryKeys.userQuizzes,
    queryFn: listUserQuizzesApi,
  });

// One of them with its questions and answers, for the editor
export const useUserQuiz = (id) =>
  useQuery({
    queryKey: queryKeys.userQuiz(id),
    queryFn: () => getUserQuizApi(id),
    enabled: !!id,
  });
