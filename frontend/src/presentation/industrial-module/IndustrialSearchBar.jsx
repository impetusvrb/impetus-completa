import React from 'react';
import { mono } from './industrialModuleTokens.js';

export default function IndustrialSearchBar({ value = '', onChange, placeholder = 'Pesquisar registos…', disabled = true }) {
  return (
    <div className="industrial-search-bar" style={{ marginBottom: 10 }}>
      <input
        type="search"
        className="industrial-search-input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '8px 10px',
          borderRadius: 4,
          border: '1px solid var(--border-subtle)',
          background: 'var(--bg-tertiary)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          fontSize: 12
        }}
      />
      {disabled && (
        <span style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9, display: 'block', marginTop: 4 }}>
          Pesquisa activável em OPM-001+
        </span>
      )}
    </div>
  );
}
