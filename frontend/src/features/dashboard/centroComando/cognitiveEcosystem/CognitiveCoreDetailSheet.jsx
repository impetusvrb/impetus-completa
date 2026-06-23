import React, { useEffect } from 'react';

/**
 * Bottom sheet fullscreen para detalhes do Cognitive Core (mobile/tablet compacto).
 */
export default function CognitiveCoreDetailSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      id="cog-mobile-sheet"
      className="cog-mobile-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Cognitive Core — Detalhes'}
    >
      <div className="cog-mobile-sheet__overlay" onClick={onClose} aria-hidden />
      <div className="cog-mobile-sheet__panel">
        <div className="cog-mobile-sheet__drag" aria-hidden />
        <div className="cog-mobile-sheet__header">
          <span className="cog-mobile-sheet__title">{title || 'COGNITIVE CORE — DETALHES'}</span>
          <button type="button" className="cog-mobile-sheet__close" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
        <div className="cog-mobile-sheet__body">{children}</div>
      </div>
    </div>
  );
}
