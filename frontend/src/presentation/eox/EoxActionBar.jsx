import React from 'react';
import { EOX_STANDARD_ACTIONS } from './eoxTokens.js';
import { trackEoxActionBar } from './eoxObservability.js';
import './eox.css';

/**
 * ARC-003 — Barra de acções corporativa (Atualizar · Exportar · Ajuda · específicas).
 */
export default function EoxActionBar({ actions = [], onAction, disabled = false }) {
  const standardIds = new Set(EOX_STANDARD_ACTIONS.map((a) => a.id));
  const standard = EOX_STANDARD_ACTIONS.map((def) => {
    const override = actions.find((a) => a.id === def.id);
    if (override?.hidden) return null;
    return { ...def, ...override, order: def.order };
  }).filter(Boolean);

  const custom = actions
    .filter((a) => !standardIds.has(a.id) && !a.hidden)
    .map((a, i) => ({ ...a, order: 100 + i }));

  const merged = [...standard, ...custom].sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!merged.length) return null;

  return (
    <div className="eox-action-bar" role="toolbar" aria-label="Acções do módulo">
      {merged.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`btn btn-ghost eox-action-btn${action.primary ? ' eox-action-btn--primary' : ''}`}
          disabled={disabled || action.enabled === false}
          onClick={() => {
            trackEoxActionBar(action.id);
            onAction?.(action.id);
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
