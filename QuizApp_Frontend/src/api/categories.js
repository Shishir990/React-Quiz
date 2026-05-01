import { authFetch } from './auth';

export const getCategoriesApi = async () => {
  try {
    const data = await authFetch('/categories');
    return data;
  } catch (err) {
    throw new Error(err.message || 'Failed to fetch categories');
  }
};