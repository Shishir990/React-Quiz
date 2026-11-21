import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui';
import { queryClient, queryKeys, useFriends, useNotifications } from '../../api/queries';
import { markNotificationsReadApi } from '../../api/social';
import { useNotificationStatus } from '../../context/notificationStatus';
import { shortTimeAgo } from '../../utils/format';
import { describeNotification, liveGameLink } from './notificationText';
import { useFriendActions } from './useFriendActions';
import '../../styles/Social.css';

// The bell in the top bar: unread count, and a dropdown with the latest notifications.
// Opening it marks everything read; new ones stay highlighted until it's closed.
export default function NotificationBell() {
  const navigate = useNavigate();
  const { connected } = useNotificationStatus();
  const { data, isLoading, isError } = useNotifications({ live: connected });
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(null); // ids that were unread when the panel opened
  const ref = useRef(null);
  const unread = data?.unread || 0;
  const items = data?.items || [];

  // Friend requests still waiting (one may have been answered from another tab)
  const friends = useFriends({ enabled: open });
  const waiting = new Set((friends.data?.incoming || []).map((r) => r.requestId));
  const actions = useFriendActions();
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setErrors({});
    const fresh = items.filter((n) => !n.read).map((n) => n.id);
    setSeen(new Set(fresh));
    if (unread > 0) {
      // Clear the badge now; the list keeps its highlights until the panel closes
      queryClient.setQueryData(queryKeys.notifications, (old) => old && {
        ...old,
        unread: 0,
        items: old.items.map((n) => ({ ...n, read: true })),
      });
      markNotificationsReadApi().catch(() => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }));
    }
  };

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  const answer = async (n, how) => {
    const res = await actions[how](n.data.requestId);
    setErrors((e) => ({ ...e, [n.id]: res.ok ? '' : res.message }));
  };

  return (
    <div className="nt-bell" ref={ref}>
      <button
        className={`db-icon-btn nt-bell-btn ${open ? 'is-open' : ''}`}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        title="Notifications"
      >
        <Icon name="bell" size={18} />
        {unread > 0 && <span className="nt-badge" aria-hidden="true">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="nt-panel" role="dialog" aria-label="Notifications">
          <div className="nt-panel-head">
            <p className="nt-panel-title">Notifications</p>
            <span className={`nt-live ${connected ? 'is-on' : ''}`} title={connected ? 'New notifications arrive instantly' : 'Checking for new notifications every minute'}>
              <span className="nt-live-dot" aria-hidden="true" /> {connected ? 'Live' : 'Offline'}
            </span>
          </div>

          <div className="nt-list">
            {isLoading && <p className="nt-empty">Loading…</p>}
            {isError && !data && <p className="nt-empty">Could not load notifications.</p>}
            {!isLoading && data && !items.length && (
              <div className="nt-empty">
                <Icon name="bell" size={22} />
                <p>No notifications yet</p>
                <span>Friend requests and game invites show up here.</span>
              </div>
            )}
            {items.map((n) => {
              const { icon, title, text } = describeNotification(n);
              const isNew = seen?.has(n.id);
              const requestId = n.data?.requestId;
              const pending = n.type === 'friend_request' && requestId && waiting.has(requestId);
              const busy = requestId && actions.busy[requestId];
              return (
                <div key={n.id} className={`nt-item ${isNew ? 'is-new' : ''}`}>
                  <span className={`nt-item-icon is-${n.type}`} aria-hidden="true"><Icon name={icon} size={16} /></span>
                  <div className="nt-item-body">
                    <p className="nt-item-text"><strong>{title}</strong> {text}</p>
                    <p className="nt-item-time">{shortTimeAgo(n.createdAt)}</p>
                    {errors[n.id] && <p className="nt-toast-error" role="alert">{errors[n.id]}</p>}
                    {pending && (
                      <div className="nt-toast-actions">
                        <button className="nt-btn is-primary" onClick={() => answer(n, 'accept')} disabled={busy}>Accept</button>
                        <button className="nt-btn" onClick={() => answer(n, 'decline')} disabled={busy}>Decline</button>
                      </div>
                    )}
                    {n.type === 'game_invite' && n.data?.code && (
                      <div className="nt-toast-actions">
                        <button className="nt-btn is-primary" onClick={() => go(liveGameLink(n.data.code))}>
                          <Icon name="play" size={13} /> Join · {n.data.code}
                        </button>
                      </div>
                    )}
                  </div>
                  {isNew && <span className="nt-dot" aria-label="New" />}
                </div>
              );
            })}
          </div>

          <button className="nt-panel-foot" onClick={() => go('/friends')}>
            <Icon name="users" size={15} /> Friends and requests
          </button>
        </div>
      )}
    </div>
  );
}
