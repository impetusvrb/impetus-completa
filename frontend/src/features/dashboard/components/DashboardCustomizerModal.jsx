import React from 'react';

export default function DashboardCustomizerModal({ isOpen, onClose, payload, onSaved }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', padding: 24, borderRadius: 12, maxWidth: 400 }}>
        <h3>Personalizar painel</h3>
        <p style={{ color: '#64748b', marginBottom: 16 }}>Configurações em breve.</p>
        <button type="button" onClick={onClose}>Fechar</button>
      </div>
    </div>
  );
}
