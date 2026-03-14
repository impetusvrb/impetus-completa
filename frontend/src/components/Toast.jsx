/**
 * TOAST / SNACKBAR
 * Notificações temporárias para feedback de ações
 */

import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import './Toast.css';

export default function Toast({ id, message, type = 'info', onClose, duration = 5000 }) {
  useEffect(() => {
    const timer = setTimeout(() => onClose?.(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? AlertCircle : type === 'warning' ? AlertTriangle : Info;

  return (
    <div className={`toast toast-${type}`} role="alert">
      <Icon size={20} className="toast-icon" />
      <span className="toast-message">{message}</span>
      <button className="toast-close" onClick={() => onClose?.(id)} aria-label="Fechar">
        <X size={18} />
      </button>
    </div>
  );
}
