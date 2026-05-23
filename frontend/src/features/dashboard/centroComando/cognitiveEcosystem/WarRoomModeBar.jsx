import React from 'react';

const MODES = [
  { id: 'normal', label: 'Normal' },
  { id: 'executivo', label: 'Executivo' },
  { id: 'crise', label: 'Crise' },
  { id: 'emergencia', label: 'Emergência' },
  { id: 'critico', label: 'Crítico' },
  { id: 'auditoria', label: 'Auditoria' },
  { id: 'analise_profunda', label: 'Análise profunda' },
  { id: 'monitoramento_total', label: 'Monitoramento total' }
];

export default function WarRoomModeBar({ activeMode, suggestedMode, onSelect }) {
  const effective = activeMode || suggestedMode || 'normal';
  return (
    <div className="cog-warroom" role="group" aria-label="War room cognitiva">
      <span className="cog-warroom__label">WAR ROOM</span>
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          className={`cog-warroom__btn ${effective === m.id ? 'cog-warroom__btn--active' : ''}`}
          onClick={() => onSelect(m.id)}
          aria-pressed={effective === m.id}
        >
          {m.label}
        </button>
      ))}
      {suggestedMode && suggestedMode !== activeMode && (
        <span className="cog-warroom__hint">IA sugere: {suggestedMode}</span>
      )}
    </div>
  );
}
