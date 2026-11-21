import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getLiveTicketApi } from '../api/live';
import { queryClient } from '../api/queries';

// Retrying after the live server refused a ticket (it may have expired on the way, or
// the ticket request failed on a flaky network): wait a little longer each time
const authRetryDelay = (attempt) => Math.min(15000, 1000 * 2 ** Math.min(attempt, 4));

async function fetchTicket() {
  const data = await getLiveTicketApi();
  if (!data?.ticket || !data?.url) throw new Error(data?.message || 'Could not connect to live games.');
  return data;
}

// Why the connection dropped, in words a player understands
const DISCONNECT_MESSAGES = {
  'ping timeout': 'Connection lost. Reconnecting…',
  'transport close': 'Connection lost. Reconnecting…',
  'transport error': 'Connection lost. Reconnecting…',
  'io server disconnect': 'The server closed the connection. Reconnecting…',
};

// One connection to the live game server for as long as the page is open.
// The server sends the whole room state after every change (`room:state`), so the
// page only renders what it receives; actions return { ok, message }.
export function useLiveGame() {
  const socketRef = useRef(null);
  const codeRef = useRef(null);        // the room to rejoin after a reconnect
  const savedRef = useRef(null);       // the finished room whose results were already refetched
  const offsetRef = useRef(null);      // best estimate of server clock minus this device's clock
  const [connection, setConnection] = useState('connecting'); // connecting | online | offline
  const [error, setError] = useState('');
  const [room, setRoom] = useState(null);
  const [closed, setClosed] = useState('');
  const [clockOffset, setClockOffset] = useState(0);

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

    // Each message's `serverNow` arrives a little late (the network delay), so the
    // largest offset seen is the closest to the truth. Taking every sample as it
    // comes would make the countdown jump around with each message's delay.
    const sampleClock = (serverNow) => {
      const sample = serverNow - Date.now();
      if (offsetRef.current === null || sample > offsetRef.current) {
        offsetRef.current = sample;
        setClockOffset(sample);
      }
    };

    // Back in the room after a reconnect, or after the tab was in the background
    const rejoin = () => {
      if (!socket?.connected || !codeRef.current) return;
      socket.timeout(8000).emit('room:join', { code: codeRef.current }, (err, res) => {
        if (err) return; // no answer: the next reconnect or visibility change tries again
        if (!res?.ok) forgetRoom(res?.message || 'You were disconnected from the game.');
      });
    };

    const reconnectNow = () => {
      if (socket && !socket.connected) {
        clearTimeout(retryTimer);
        socket.connect();
      }
    };

    // Phones pause background tabs; when the page is visible again, catch up at once
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (socket?.connected) rejoin();
      else reconnectNow();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', reconnectNow);

    (async () => {
      let first;
      // The very first ticket: keep trying, the API may be waking up
      for (let attempt = 0; !cancelled; attempt++) {
        try {
          first = await fetchTicket();
          break;
        } catch (err) {
          if (cancelled) return;
          setConnection('offline');
          setError(attempt < 2 ? 'Connecting…' : err.message);
          await new Promise((r) => { retryTimer = setTimeout(r, authRetryDelay(attempt)); });
        }
      }
      if (cancelled) return;

      let pending = first.ticket;
      socket = io(first.url, {
        // WebSocket first: one long-lived connection, no polling requests that a proxy
        // could route or time out separately. Falls back to polling if blocked.
        transports: ['websocket', 'polling'],
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
        offsetRef.current = null; // a new connection may take a different route
        setConnection('online');
        setError('');
        rejoin();
      });

      socket.on('disconnect', (reason) => {
        if (reason === 'io client disconnect') return; // we closed it (page left)
        setConnection('offline');
        setError(DISCONNECT_MESSAGES[reason] || 'Connection lost. Reconnecting…');
        // Socket.IO doesn't retry by itself after the server ends the connection
        if (reason === 'io server disconnect') retryTimer = setTimeout(reconnectNow, 1000);
      });

      socket.on('connect_error', (err) => {
        setConnection('offline');
        if (err.message !== 'unauthorized') {
          setError("Can't reach the live game server. Retrying…");
          return; // Socket.IO keeps retrying on its own
        }
        // A refused ticket stops Socket.IO's own retries: try again with a fresh one,
        // waiting longer each time but never giving up while the page is open
        setError(authRetries < 3 ? 'Reconnecting…' : 'Still trying to sign in to live games…');
        retryTimer = setTimeout(reconnectNow, authRetryDelay(authRetries));
        authRetries += 1;
      });

      socket.on('room:state', (state) => {
        sampleClock(state.serverNow);
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
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', reconnectNow);
      socket?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Send an event and wait for the server's answer
  const emit = useCallback((event, payload = {}) => new Promise((resolve) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      resolve({ ok: false, message: 'Not connected right now. Reconnecting…' });
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
