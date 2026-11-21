import { authFetch } from './auth';
import { apiFetch } from './client';
import { readJson } from './readJson';

// A one-minute ticket for the live game server, and that server's address
export const getLiveTicketApi = () => authFetch('/live/ticket', { method: 'POST' });

// Past live games; these throw with the server's message on any failure
async function request(path) {
  const res = await apiFetch(`/live${path}`);
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}
export const getPastGamesApi = () => request('/games');
export const getPastGameApi = (id) => request(`/games/${encodeURIComponent(id)}`);
