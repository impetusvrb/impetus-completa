import React from 'react';

export default function Modal({ children, isOpen, onClose, title }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
        {title && <h3 style={{ margin: '0 0 16px' }}>{title}</h3>}
        {children}
      </div>
    </div>
  );
}

export function ModalFooter({ children }) {
  return <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>{children}</div>;
}
