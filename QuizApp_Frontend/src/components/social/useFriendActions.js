import { useCallback, useState } from 'react';
import { queryClient, queryKeys } from '../../api/queries';
import {
  sendFriendRequestApi, acceptFriendRequestApi, declineFriendRequestApi,
  cancelFriendRequestApi, removeFriendApi,
} from '../../api/social';

// Friend request actions with a busy flag per target and the caches refreshed after.
// Each action resolves to { ok: true, data } or { ok: false, message }.
export function useFriendActions() {
  const [busy, setBusy] = useState({}); // { [key]: true } while that action runs

  const run = useCallback(async (key, call) => {
    setBusy((b) => ({ ...b, [key]: true }));
    try {
      const data = await call();
      return { ok: true, data };
    } catch (err) {
      return { ok: false, message: err.message };
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[key];
        return next;
      });
      // Lists, search results (under ['friends']) and the bell all change together
      queryClient.invalidateQueries({ queryKey: queryKeys.friends });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    }
  }, []);

  return {
    busy,
    add: (userId) => run(userId, () => sendFriendRequestApi(userId)),
    accept: (requestId) => run(requestId, () => acceptFriendRequestApi(requestId)),
    decline: (requestId) => run(requestId, () => declineFriendRequestApi(requestId)),
    cancel: (requestId) => run(requestId, () => cancelFriendRequestApi(requestId)),
    remove: (userId) => run(userId, () => removeFriendApi(userId)),
  };
}
