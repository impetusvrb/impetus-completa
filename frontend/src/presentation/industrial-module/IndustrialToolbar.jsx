import React from 'react';
import { mono, TOOLBAR_ACTIONS } from './industrialModuleTokens.js';

const LABELS = {
  [TOOLBAR_ACTIONS.search]: 'Pesquisar',
  [TOOLBAR_ACTIONS.refresh]: 'Actualizar',
  [TOOLBAR_ACTIONS.export]: 'Exportar',
  [TOOLBAR_ACTIONS.filters]: 'Filtros',
  [TOOLBAR_ACTIONS.columns]: 'Colunas',
  [TOOLBAR_ACTIONS.preferences]: 'Preferências',
  [TOOLBAR_ACTIONS.history]: 'Histórico',
  [TOOLBAR_ACTIONS.help]: 'Ajuda',
  [TOOLBAR_ACTIONS.ai]: 'IA'
};

export default function IndustrialToolbar({
  enabledActions = [TOOLBAR_ACTIONS.refresh],
  onAction,
  statusLabel,
  disabled = false
}) {
  return (
    <div className="industrial-toolbar" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      {enabledActions.map((action) => (
        <button
          key={action}
          type="button"
          className="btn btn-ghost"
          style={{ borderRadius: 4, fontSize: 11, opacity: action === TOOLBAR_ACTIONS.refresh ? 1 : 0.55 }}
          disabled={disabled || (action !== TOOLBAR_ACTIONS.refresh && action !== TOOLBAR_ACTIONS.help)}
          onClick={() => onAction?.(action)}
          data-industrial-action={action}
          title={action !== TOOLBAR_ACTIONS.refresh ? 'OPM-001+ — reservado' : undefined}
        >
          {LABELS[action] || action}
        </button>
      ))}
      {statusLabel && (
        <span style={{ ...mono, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{statusLabel}</span>
      )}
    </div>
  );
}
