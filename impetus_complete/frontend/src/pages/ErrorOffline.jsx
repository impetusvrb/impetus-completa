/**
 * PÁGINA OFFLINE - SEM CONEXÃO
 */
import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import './ErrorPage.css';

export default function ErrorOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="error-page error-offline">
      <div className="error-content">
        <WifiOff size={64} className="error-icon-offline" />
        <h2 className="error-title">Sem conexão</h2>
        <p className="error-desc">Verifique sua conexão com a internet e tente novamente.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <RefreshCw size={18} />
          Reconectar
        </button>
      </div>
    </div>
  );
}
