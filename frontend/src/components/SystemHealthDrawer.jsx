/**
 * Painel lateral (drawer) para SystemHealthPanel — aberto a partir do menu global.
 */
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import SystemHealthPanel from './SystemHealthPanel';
import './SystemHealthDrawer.css';

export default function SystemHealthDrawer({ onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <button
        type="button"
        className="system-health-drawer__backdrop"
        aria-label="Fechar painel de saúde do sistema"
        onClick={onClose}
      />
      <div
        className="system-health-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-health-drawer-title"
      >
        <header className="system-health-drawer__header">
          <h2 id="system-health-drawer-title" className="system-health-drawer__title">
            Saúde do Sistema
          </h2>
          <button
            type="button"
            className="system-health-drawer__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </header>
        <div className="system-health-drawer__body">
          <SystemHealthPanel embedded />
        </div>
      </div>
    </>
  );
}
