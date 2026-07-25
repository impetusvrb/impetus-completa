import React from 'react';
import { getSupplyFeatureFlagSnapshot } from '../config/supplyFeatureFlags.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

export default function SupplyFoundationShell({ children, title = 'Supply / Suprimentos' }) {
  const flags = getSupplyFeatureFlagSnapshot();

  if (!flags.supply_enabled || !flags.supply_workspace_enabled) {
    return (
      <div className="impetus-card" style={{ padding: '1rem', margin: '0.5rem', borderRadius: 4, background: 'var(--bg-panel)' }}>
        <p style={{ ...mono, color: 'var(--text-secondary)' }}>
          Supply — homologação GF-027. Runtime desligado.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
          Menu oculto · flags default OFF · integração via Pilot Layer.
        </p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} data-supply-foundation-shell>
      <header style={{ padding: '0.75rem 0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ margin: 0, fontSize: 18, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</h1>
        <p style={{ ...mono, color: 'var(--cyan)', margin: '6px 0 0' }}>phase GF-027 · status homologation</p>
      </header>
      <div style={{ padding: '0.5rem' }}>{children}</div>
    </div>
  );
}
