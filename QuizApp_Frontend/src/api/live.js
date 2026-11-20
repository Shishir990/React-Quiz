import { authFetch } from './auth';

// A one-minute ticket for the live game server, and that server's address
export const getLiveTicketApi = () => authFetch('/live/ticket', { method: 'POST' });
