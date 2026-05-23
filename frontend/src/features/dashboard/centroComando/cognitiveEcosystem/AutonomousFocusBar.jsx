import React from 'react';

export default function AutonomousFocusBar({ focus, mode }) {
  if (!focus) return null;
  return (
    <div className={`cog-autonomous cog-autonomous--${focus.visual_intensity || 'normal'}`} aria-label="Dashboard autônomo">
      <span className="cog-autonomous__label">FOCO AUTÔNOMO</span>
      <span className="cog-autonomous__hint">layout: {focus.layout_hint}</span>
      <div className="cog-autonomous__stack">
        {(focus.priority_stack || []).map((p) => (
          <span
            key={p.id}
            className="cog-autonomous__chip"
            style={{ '--w': `${p.weight}%` }}
          >
            {p.label}
          </span>
        ))}
      </div>
      {mode && <span className="cog-autonomous__mode">war room: {mode}</span>}
    </div>
  );
}
