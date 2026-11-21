// Quizzes the signed-in player wrote. These throw on any failure (with the
// server's message), so React Query and the editor can show it.
import { apiFetch } from './client';
import { readJson } from './readJson';

async function request(path = '', options = {}) {
  const res = await apiFetch(`/user-quizzes${path}`, options);
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

export const listUserQuizzesApi = () => request();
export const getUserQuizApi = (id) => request(`/${encodeURIComponent(id)}`);
export const createUserQuizApi = (quiz) => request('', { method: 'POST', body: JSON.stringify(quiz) });
export const updateUserQuizApi = (id, quiz) => request(`/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(quiz) });
export const deleteUserQuizApi = (id) => request(`/${encodeURIComponent(id)}`, { method: 'DELETE' });
