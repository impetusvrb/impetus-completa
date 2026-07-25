import React from 'react';
import { mono } from './industrialModuleTokens.js';

export default function IndustrialFilterBar({ filters = [], disabled = true }) {
  if (!filters.length) {
    return (
      <div className="industrial-filter-bar" style={{ marginBottom: 10 }}>
        <span style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>Filtros · slot reservado OPM-001+</span>
      </div>
    );
  }
  return (
    <div className="industrial-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
      {filters.map((f) => (
        <button
          key={f.id}
          type="button"
          className="btn btn-ghost"
          style={{ borderRadius: 4, fontSize: 11 }}
          disabled={disabled}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
