import { authFetch } from './auth';

// The logged-in user's quiz history, newest first
export const getMyResultsApi = async () => {
  try {
    const data = await authFetch('/results/me');
    return data;
  } catch (err) {
    throw new Error(err.message || 'Failed to fetch results');
  }
};

// One of the user's attempts, with every question and the chosen answer
export const getResultApi = async (id) => {
  try {
    const data = await authFetch(`/results/${id}`);
    return data;
  } catch (err) {
    throw new Error(err.message || 'Failed to fetch result');
  }
};

// period: 'week' | 'month' | 'all'; category: optional category id
export const getLeaderboardApi = async ({ period = 'week', category } = {}) => {
  const params = new URLSearchParams({ period });
  if (category) params.set('category', category);
  try {
    const data = await authFetch(`/results/leaderboard?${params}`);
    return data;
  } catch (err) {
    throw new Error(err.message || 'Failed to fetch leaderboard');
  }
};
