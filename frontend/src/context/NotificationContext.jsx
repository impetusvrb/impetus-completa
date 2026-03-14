/**
 * CONTEXTO DE NOTIFICAÇÕES
 * Exibe Toasts para sucesso, erro, aviso
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, message, type, duration }]);
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const success = useCallback((msg, duration) => addNotification(msg, 'success', duration), [addNotification]);
  const error = useCallback((msg, duration) => addNotification(msg, 'error', duration), [addNotification]);
  const warning = useCallback((msg, duration) => addNotification(msg, 'warning', duration), [addNotification]);
  const info = useCallback((msg, duration) => addNotification(msg, 'info', duration), [addNotification]);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification, success, error, warning, info }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {notifications.map(n => (
          <Toast
            key={n.id}
            id={n.id}
            message={n.message}
            type={n.type}
            duration={n.duration}
            onClose={removeNotification}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

const NOOP = () => {};
const NOOP_NOTIFY = {
  addNotification: NOOP,
  removeNotification: NOOP,
  success: NOOP,
  error: NOOP,
  warning: NOOP,
  info: NOOP
};

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[useNotification] Usado fora de NotificationProvider. Notificações serão ignoradas.');
    }
    return NOOP_NOTIFY;
  }
  return ctx;
}
