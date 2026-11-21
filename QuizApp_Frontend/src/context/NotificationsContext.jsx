import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getLiveTicketApi } from '../api/live';
import { queryClient, queryKeys, useNotifications } from '../api/queries';
import { useQuiz } from './QuizContext';
import NotificationToasts from '../components/social/NotificationToasts';
import { NotificationStatusContext } from './notificationStatus';

// Live notifications for the whole signed-in app.
// One Socket.IO connection to the live server's /notify namespace (signed in with the
// same one-minute ticket as live games) delivers each new notification the moment it's
// created. It's added to the bell's cache and shown as a toast. If the live server is
// unreachable, the bell still updates by polling (useNotifications).

const TOAST_MS = { game_invite: 15000, default: 8000 };
const MAX_TOASTS = 3;
// Waits between attempts after a refused or failed sign-in: 2s, 4s … up to a minute
const retryDelay = (attempt) => Math.min(60000, 2000 * 2 ** Math.min(attempt, 5));

async function fetchTicket() {
  const data = await getLiveTicketApi();
  if (!data?.ticket || !data?.url) throw new Error(data?.message || 'Live notifications are unavailable.');
  return data;
}

// Put a pushed notification at the top of the cached list (unless polling got it first)
function addToCache(notification) {
  queryClient.setQueryData(queryKeys.notifications, (old) => {
    if (!old) return old; // not loaded yet: the first fetch will include it
    if (old.items.some((n) => n.id === notification.id)) return old;
    return {
      items: [notification, ...old.items].slice(0, 30),
      unread: old.unread + (notification.read ? 0 : 1),
    };
  });
}

export function NotificationsProvider({ children }) {
  const { user } = useQuiz();
  const userId = user?._id || '';
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  // Keeps the bell's list loaded (and polling) for as long as someone is signed in
  useNotifications({ enabled: !!userId, live: connected });

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((notification) => {
    setToasts((list) => [...list.filter((t) => t.id !== notification.id).slice(-(MAX_TOASTS - 1)), { ...notification, forUser: userId }]);
    const ms = TOAST_MS[notification.type] || TOAST_MS.default;
    timers.current.set(notification.id, setTimeout(() => dismiss(notification.id), ms));
  }, [dismiss, userId]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    let socket = null;
    let retryTimer = null;
    let attempts = 0;

    const retry = () => {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(() => {
        if (!cancelled && socket && !socket.connected) socket.connect();
      }, retryDelay(attempts++));
    };

    (async () => {
      // The first ticket. If the live server isn't configured or the API is waking up,
      // polling covers the bell meanwhile; keep trying, less and less often.
      let first;
      for (let attempt = 0; !cancelled; attempt++) {
        try {
          first = await fetchTicket();
          break;
        } catch {
          await new Promise((resolve) => { retryTimer = setTimeout(resolve, retryDelay(attempt)); });
        }
      }
      if (cancelled) return;

      let pending = first.ticket;
      socket = io(`${first.url.replace(/\/$/, '')}/notify`, {
        transports: ['websocket', 'polling'],
        // A fresh ticket for every reconnect (each one is valid for a minute)
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

      socket.on('connect', () => {
        attempts = 0;
        setConnected(true);
        // Catch up on anything that arrived while we were offline
        queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      });
      socket.on('disconnect', (reason) => {
        setConnected(false);
        // Socket.IO only retries by itself after network drops, not when the server closed it
        if (reason === 'io server disconnect') retry();
      });
      // A refused ticket stops Socket.IO's own retries; other errors it retries by itself
      socket.on('connect_error', (err) => {
        setConnected(false);
        if (err.message === 'unauthorized') retry();
      });

      socket.on('notification', (n) => {
        if (!n?.id || !n?.type) return;
        addToCache(n);
        if (n.type === 'friend_request' || n.type === 'friend_accepted') {
          queryClient.invalidateQueries({ queryKey: queryKeys.friends });
        }
        showToast(n);
      });
    })();

    // Phones pause background tabs: reconnect as soon as the page is visible again
    const onVisible = () => {
      if (document.visibilityState === 'visible' && socket && !socket.connected) socket.connect();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      document.removeEventListener('visibilitychange', onVisible);
      socket?.disconnect();
      setConnected(false);
    };
  }, [userId, showToast]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  return (
    <NotificationStatusContext.Provider value={{ connected }}>
      {children}
      {/* Only this account's toasts (after signing out and in as someone else, old ones stay hidden) */}
      {userId && <NotificationToasts items={toasts.filter((t) => t.forUser === userId)} onDismiss={dismiss} />}
    </NotificationStatusContext.Provider>
  );
}
