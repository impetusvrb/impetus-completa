import React from 'react';
import { mono } from './industrialModuleTokens.js';

export default function IndustrialActionBar({ actions = [], onAction }) {
  if (!actions.length) return null;
  return (
    <footer
      className="industrial-action-bar"
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8
      }}
    >
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          className="btn btn-ghost"
          style={{ borderRadius: 4, fontSize: 11, opacity: a.enabled === false ? 0.45 : 1 }}
          disabled={a.enabled === false}
          onClick={() => onAction?.(a.id)}
        >
          {a.label}
        </button>
      ))}
      <span style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9, alignSelf: 'center' }}>
        Acções de negócio · OPM-001+
      </span>
    </footer>
  );
}
