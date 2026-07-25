import React from 'react';
import { mono } from './industrialModuleTokens.js';

/** Área reservada — alertas IA (sem implementação cognitiva). */
export default function IndustrialAlertPanel({ alerts = [] }) {
  return (
    <section
      className="industrial-alert-panel impetus-card"
      data-industrial-cognitive="alerts-placeholder"
      style={{ marginTop: 12, padding: '1rem', borderRadius: 4, border: '1px dashed var(--border-subtle)' }}
    >
      <h3 style={{ ...mono, color: 'var(--amber)', margin: '0 0 6px', fontSize: 11 }}>Alertas · reservado</h3>
      {alerts.length ? (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11 }}>{alerts.map((a, i) => <li key={i}>{a}</li>)}</ul>
      ) : (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: 0 }}>
          Integração cognitiva futura · sem alteração ao Centro de Comando certificado
        </p>
      )}
    </section>
  );
}
