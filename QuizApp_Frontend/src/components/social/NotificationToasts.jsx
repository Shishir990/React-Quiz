import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../ui';
import { describeNotification, liveGameLink } from './notificationText';
import { useFriendActions } from './useFriendActions';
import { markNotificationsReadApi } from '../../api/social';
import { queryClient, queryKeys } from '../../api/queries';
import '../../styles/Social.css';

// Pop-ups for notifications that arrive while the app is open, with the obvious next step
export default function NotificationToasts({ items, onDismiss }) {
  if (!items.length) return null;
  return (
    <div className="nt-toasts" role="region" aria-label="New notifications" aria-live="polite">
      {items.map((n) => <Toast key={n.id} n={n} onDismiss={() => onDismiss(n.id)} />)}
    </div>
  );
}

function Toast({ n, onDismiss }) {
  const navigate = useNavigate();
  const actions = useFriendActions();
  const [error, setError] = useState('');
  const { icon, title, text } = describeNotification(n);

  // Acting on a toast deals with the notification too
  const markRead = () => {
    markNotificationsReadApi([n.id])
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }))
      .catch(() => {});
  };
  const go = (to) => {
    markRead();
    onDismiss();
    navigate(to);
  };
  const accept = async () => {
    const res = await actions.accept(n.data.requestId);
    if (res.ok) onDismiss();
    else setError(res.message);
  };

  return (
    <div className={`nt-toast is-${n.type}`}>
      <span className="nt-toast-icon" aria-hidden="true"><Icon name={icon} size={17} /></span>
      <div className="nt-toast-body">
        <p className="nt-toast-text"><strong>{title}</strong> {text}</p>
        {error && <p className="nt-toast-error" role="alert">{error}</p>}
        <div className="nt-toast-actions">
          {n.type === 'friend_request' && n.data?.requestId && (
            <>
              <button className="nt-btn is-primary" onClick={accept} disabled={actions.busy[n.data.requestId]}>
                {actions.busy[n.data.requestId] ? 'Accepting…' : 'Accept'}
              </button>
              <button className="nt-btn" onClick={() => go('/friends')}>View</button>
            </>
          )}
          {n.type === 'game_invite' && n.data?.code && (
            <button className="nt-btn is-primary" onClick={() => go(liveGameLink(n.data.code))}>
              <Icon name="play" size={13} /> Join game
            </button>
          )}
          {n.type === 'friend_accepted' && (
            <button className="nt-btn" onClick={() => go('/friends')}>View friends</button>
          )}
        </div>
      </div>
      <button className="nt-toast-x" onClick={onDismiss} aria-label="Dismiss">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
