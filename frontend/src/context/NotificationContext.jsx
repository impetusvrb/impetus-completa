import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const show = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications((p) => p.filter((n) => n.id !== id)), 4000);
  }, []);

  const value = { show, success: (m) => show(m, 'success'), error: (m) => show(m, 'error'), info: (m) => show(m, 'info') };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notifications.length > 0 && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((n) => (
            <div key={n.id} style={{ padding: '12px 20px', background: n.type === 'error' ? '#fef2f2' : '#f0fdf4', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              {n.message}
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  return ctx || { show: () => {}, success: () => {}, error: () => {}, info: () => {} };
}
