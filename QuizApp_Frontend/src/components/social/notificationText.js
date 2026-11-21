// How each kind of notification reads, in the bell and in toasts
export function describeNotification(n) {
  const who = n.actor?.name || 'Someone';
  switch (n.type) {
    case 'friend_request':
      return { icon: 'userPlus', title: who, text: 'sent you a friend request' };
    case 'friend_accepted':
      return { icon: 'userCheck', title: who, text: 'accepted your friend request' };
    case 'game_invite':
      return {
        icon: 'play',
        title: who,
        text: n.data?.quizName ? `invited you to a live game: ${n.data.quizName}` : 'invited you to a live game',
      };
    default:
      return { icon: 'bell', title: who, text: 'sent you a notification' };
  }
}

export const liveGameLink = (code) => `/live?code=${encodeURIComponent(code)}`;
