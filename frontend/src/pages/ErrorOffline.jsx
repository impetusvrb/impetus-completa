import React, { useState, useEffect } from 'react';

export default function ErrorOffline() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!offline) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: 12, background: '#fef2f2', color: '#b91c1c', textAlign: 'center', zIndex: 10000 }}>
      Você está offline. Verifique sua conexão.
    </div>
  );
}
