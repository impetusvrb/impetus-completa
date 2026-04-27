/**
 * Página de placeholder padronizada para módulos ainda não integrados ao backend.
 */

import React, { useEffect } from 'react';
import './StubPage.css';

export default function StubPage({
  title = 'Módulo em desenvolvimento',
  description = 'Este módulo ainda não está conectado ao backend.',
  componentName = 'StubPage',
  className = '',
  variant = 'default',
  logRender = true
}) {
  useEffect(() => {
    if (!logRender) return;
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[STUB_RENDERED]', { component: componentName });
    }
  }, [componentName, logRender]);

  return (
    <div
      className={`stub-page stub-page--${variant} card ${className}`.trim()}
      data-stub="true"
      role="status"
      aria-live="polite"
    >
      <h2 className="stub-page__title">{title}</h2>
      <p className="stub-page__description">{description}</p>
    </div>
  );
}
