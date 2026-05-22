import React from 'react';

const MODES = [
  { id: 'normal', label: 'Normal' },
  { id: 'crise', label: 'Crise' },
  { id: 'critico', label: 'Operação crítica' },
  { id: 'auditoria', label: 'Auditoria' },
  { id: 'executivo', label: 'Executivo' }
];

export default function WarRoomModeBar({ activeMode, suggestedMode, onSelect }) {
  const effective = activeMode || suggestedMode || 'normal';
  return (
    <div className="cog-warroom" role="group" aria-label="Modos operacionais">
      <span className="cog-warroom__label">MODO</span>
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
