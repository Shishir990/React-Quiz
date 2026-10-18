const BASE = '/api';

// Like authFetch, but throws the server's message when the request fails,
// so admin forms can show exactly what went wrong
const adminFetch = async (url, { body, ...options } = {}) => {
  const response = await fetch(`${BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Request failed (${response.status})`);
  return data;
};

// Overview
export const getAdminStatsApi = () => adminFetch('/admin/stats');

// Users
export const getUsersApi = () => adminFetch('/admin/users');
export const setUserRoleApi = (id, role) => adminFetch(`/admin/users/${id}/role`, { method: 'PATCH', body: { role } });
export const setUserStatusApi = (id, isActive) => adminFetch(`/admin/users/${id}/status`, { method: 'PATCH', body: { isActive } });

// Categories
export const getAdminCategoriesApi = () => adminFetch('/categories');
export const createCategoryApi = (data) => adminFetch('/categories', { method: 'POST', body: data });
export const updateCategoryApi = (id, data) => adminFetch(`/categories/${id}`, { method: 'PUT', body: data });
export const deleteCategoryApi = (id) => adminFetch(`/categories/${id}`, { method: 'DELETE' });

// Questions (includes correct answers, admin only)
export const getQuestionsApi = (category) => adminFetch(category ? `/questions?category=${category}` : '/questions');
export const createQuestionApi = (data) => adminFetch('/questions', { method: 'POST', body: data });
export const updateQuestionApi = (id, data) => adminFetch(`/questions/${id}`, { method: 'PUT', body: data });
export const deleteQuestionApi = (id) => adminFetch(`/questions/${id}`, { method: 'DELETE' });
export const bulkCreateQuestionsApi = (questions) => adminFetch('/questions/bulk', { method: 'POST', body: { questions } });
