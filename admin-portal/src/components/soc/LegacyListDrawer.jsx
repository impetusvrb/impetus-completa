import React, { useCallback, useEffect, useRef } from 'react';

/**
 * Drawer lateral amplo para exploração de listas legacy (UX-SEC-CENTER-001).
 * Padrão conceptual alinhado a SocAnalyticsDrawer — sem acoplamento directo.
 */
export default function LegacyListDrawer({ open, title, subtitle, onClose, children, returnFocusRef }) {
  const drawerRef = useRef(null);

  const handleClose = useCallback(() => {
    onClose();
    requestAnimationFrame(() => {
      returnFocusRef?.current?.focus?.({ preventScroll: true });
    });
  }, [onClose, returnFocusRef]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') handleClose();
    },
    [handleClose]
  );

  useEffect(() => {
    if (!open) return undefined;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (open && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="soc-legacy-drawer-overlay"
        aria-label="Fechar painel"
        onClick={handleClose}
      />
      <div
        ref={drawerRef}
        className="soc-legacy-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title || 'Lista de registros'}
        tabIndex={-1}
      >
        <div className="soc-legacy-drawer-header">
          <div className="soc-legacy-drawer-heading">
            <span className="soc-legacy-drawer-title">{title}</span>
            {subtitle && <span className="soc-legacy-drawer-subtitle">{subtitle}</span>}
          </div>
          <button
            type="button"
            className="soc-legacy-drawer-close"
            onClick={handleClose}
            aria-label="Fechar painel"
          >
            ✕
          </button>
        </div>
        <div className="soc-legacy-drawer-body">{children}</div>
      </div>
    </>
  );
}
