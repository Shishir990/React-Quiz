import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getLiveTicketApi } from '../api/live';
import { queryClient } from '../api/queries';

// How many times to retry when the live server refuses a ticket (it may simply have
// expired between fetching and connecting); a real sign-out fails every time
const MAX_AUTH_RETRIES = 3;

async function fetchTicket() {
  const data = await getLiveTicketApi();
  if (!data?.ticket || !data?.url) throw new Error(data?.message || 'Could not connect to live games.');
  return data;
}

// One connection to the live game server for as long as the page is open.
// The server sends the whole room state after every change (`room:state`), so the
// page only renders what it receives; actions return { ok, message }.
export function useLiveGame() {
  const socketRef = useRef(null);
  const codeRef = useRef(null);        // the room to rejoin after a reconnect
  const savedRef = useRef(null);       // the finished room whose results were already refetched
  const [connection, setConnection] = useState('connecting'); // connecting | online | offline | error
  const [error, setError] = useState('');
  const [room, setRoom] = useState(null);
  const [closed, setClosed] = useState('');
  const [clockOffset, setClockOffset] = useState(0); // server clock minus this device's clock

  useEffect(() => {
    let cancelled = false;
    let socket = null;
    let authRetries = 0;
    let retryTimer = null;

    const forgetRoom = (reason) => {
      codeRef.current = null;
      setRoom(null);
      if (reason) setClosed(reason);
    };

    (async () => {
      let first;
      try {
        first = await fetchTicket();
      } catch (err) {
        if (!cancelled) { setConnection('error'); setError(err.message); }
        return;
      }
      if (cancelled) return;

      let pending = first.ticket;
      socket = io(first.url, {
        // Called on every (re)connect: the first ticket once, then a fresh one each time
        auth: (cb) => {
          if (pending) {
            const ticket = pending;
            pending = null;
            cb({ ticket });
            return;
          }
          fetchTicket().then((d) => cb({ ticket: d.ticket })).catch(() => cb({}));
        },
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        authRetries = 0;
        setConnection('online');
        setError('');
        // Back after a dropped connection: take our place in the room again
        if (codeRef.current) {
          socket.emit('room:join', { code: codeRef.current }, (res) => {
            if (!res?.ok) forgetRoom(res?.message || 'You were disconnected from the game.');
          });
        }
      });
      socket.on('disconnect', () => setConnection('offline'));
      socket.on('connect_error', (err) => {
        setConnection('error');
        if (err.message !== 'unauthorized') {
          setError("Can't reach the live game server. Retrying…");
          return; // Socket.IO keeps retrying on its own
        }
        // A refused ticket stops Socket.IO's own retries, so try again with a fresh one
        if (authRetries < MAX_AUTH_RETRIES) {
          authRetries += 1;
          setError('Connecting…');
          retryTimer = setTimeout(() => socket.connect(), 1000 * authRetries);
        } else {
          setError('Could not sign in to live games. Refresh the page or sign in again.');
        }
      });

      socket.on('room:state', (state) => {
        setClockOffset(state.serverNow - Date.now());
        codeRef.current = state.code;
        setRoom(state);
        // Results were saved: history, analytics and the leaderboard now include this game
        if (state.status === 'finished' && state.saved && savedRef.current !== state.code) {
          savedRef.current = state.code;
          queryClient.invalidateQueries({ queryKey: ['results'] });
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        }
      });
      socket.on('room:closed', ({ reason } = {}) => forgetRoom(reason || 'The game was closed.'));
    })();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Send an event and wait for the server's answer
  const emit = useCallback((event, payload = {}) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      resolve({ ok: false, message: 'Not connected to the live server yet.' });
      return;
    }
    socket.timeout(8000).emit(event, payload, (err, res) => {
      resolve(err ? { ok: false, message: 'The server did not respond. Please try again.' } : (res || { ok: false }));
    });
  }), []);

  const create = useCallback((options) => {
    setClosed('');
    return emit('room:create', options);
  }, [emit]);

  const join = useCallback((code) => {
    setClosed('');
    return emit('room:join', { code });
  }, [emit]);

  const leave = useCallback(async () => {
    const res = await emit('room:leave');
    codeRef.current = null;
    setRoom(null);
    return res;
  }, [emit]);

  const start = useCallback(() => emit('game:start'), [emit]);
  const next = useCallback(() => emit('game:next'), [emit]);
  const answer = useCallback((index, option) => emit('game:answer', { index, option }), [emit]);

  return {
    connection,
    error,
    room,
    closed,
    clearClosed: () => setClosed(''),
    clockOffset,
    create,
    join,
    leave,
    start,
    next,
    answer,
  };
}
