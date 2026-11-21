import { createContext, useContext } from 'react';

// Whether the live notification connection is up (see NotificationsContext.jsx)
export const NotificationStatusContext = createContext({ connected: false });
export const useNotificationStatus = () => useContext(NotificationStatusContext);
