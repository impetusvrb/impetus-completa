import React from 'react';
import { mono, INDUSTRIAL_MODULE_PHASE } from './industrialModuleTokens.js';

export default function IndustrialModuleHeader({ title, description, contextLabel, badge }) {
  return (
    <header
      className="industrial-module-header screen-header"
      data-industrial-phase={INDUSTRIAL_MODULE_PHASE}
      style={{ marginBottom: 12, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: 18, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</h1>
        {badge && (
          <span style={{ ...mono, color: 'var(--cyan)', fontSize: 10 }}>{badge}</span>
        )}
      </div>
      {contextLabel && (
        <p style={{ ...mono, color: 'var(--text-tertiary)', margin: '4px 0 0', fontSize: 10 }}>{contextLabel}</p>
      )}
      {description && (
        <p
          style={{
            ...mono,
            color: 'var(--text-secondary)',
            margin: '6px 0 0',
            textTransform: 'none',
            letterSpacing: '0.04em',
            fontSize: 11
          }}
        >
          {description}
        </p>
      )}
    </header>
  );
}
