// Friends, player search, game invites and notifications.
// These throw with the server's message on any failure, so React Query and the
// pages can show it.
import { apiFetch } from './client';
import { readJson } from './readJson';

async function request(path, options = {}) {
  const res = await apiFetch(path, options);
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body || {}) });
const id = encodeURIComponent;

export const searchUsersApi = (q) => request(`/users/search?q=${encodeURIComponent(q)}`);

export const getFriendsApi = () => request('/friends');
export const sendFriendRequestApi = (userId) => post('/friends/requests', { userId });
export const acceptFriendRequestApi = (requestId) => post(`/friends/requests/${id(requestId)}/accept`);
export const declineFriendRequestApi = (requestId) => post(`/friends/requests/${id(requestId)}/decline`);
export const cancelFriendRequestApi = (requestId) => request(`/friends/requests/${id(requestId)}`, { method: 'DELETE' });
export const removeFriendApi = (userId) => request(`/friends/${id(userId)}`, { method: 'DELETE' });
export const inviteFriendsApi = ({ userIds, code, quizName }) => post('/friends/invite', { userIds, code, quizName });

export const getNotificationsApi = () => request('/notifications');
// Without ids: every notification
export const markNotificationsReadApi = (ids) => post('/notifications/read', ids ? { ids } : {});
