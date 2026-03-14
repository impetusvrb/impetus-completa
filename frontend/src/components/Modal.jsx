/**
 * MODAL COMPONENT
 * Modal reutilizável para formulários e confirmações
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium', // small, medium, large, full
  showCloseButton = true,
  closeOnOverlayClick = true
}) {
  // Fechar modal com ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevenir scroll do body quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-container modal-${size}`}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          {showCloseButton && (
            <button 
              className="modal-close-btn" 
              onClick={onClose}
              aria-label="Fechar modal"
            >
              <X size={20} />
            </button>
          )}
        </div>
        <div className="modal-content">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * MODAL FOOTER COMPONENT
 * Footer padrão para modais com botões de ação
 */
export function ModalFooter({ 
  onCancel, 
  onConfirm, 
  cancelText = 'Cancelar', 
  confirmText = 'Confirmar',
  confirmDisabled = false,
  confirmLoading = false,
  confirmVariant = 'primary' // primary, danger, success
}) {
  return (
    <div className="modal-footer">
      <button 
        type="button"
        className="btn btn-secondary" 
        onClick={onCancel}
        disabled={confirmLoading}
      >
        {cancelText}
      </button>
      <button 
        type="button"
        className={`btn btn-${confirmVariant}`} 
        onClick={onConfirm}
        disabled={confirmDisabled || confirmLoading}
      >
        {confirmLoading ? 'Carregando...' : confirmText}
      </button>
    </div>
  );
}
