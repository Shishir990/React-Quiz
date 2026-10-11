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
