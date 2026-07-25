/**
 * FIN-EVOLVE-002 — Alertas financeiros (reutiliza financialLeakage.getAlerts).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { getFinanceOfficialRoute } from '../metadata/financeNavigationMetadata.js';
import { trackFinanceAlertOpened } from '../observability/financeObservability.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
};

function severityColor(sev) {
  if (sev === 'critical' || sev === 'high' || sev === 'alta') return 'var(--red)';
  if (sev === 'medium' || sev === 'média' || sev === 'media') return 'var(--amber)';
  return 'var(--cyan)';
}

export default function FinanceAlertsPanel({ alerts = [], loading = false }) {
  const leakagePath = getFinanceOfficialRoute('leakage');

  return (
    <section
      className="impetus-card"
      style={{ padding: '1rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <h3 style={{ ...mono, color: 'var(--amber)', margin: 0, fontSize: 11 }}>
          Alertas financeiros
        </h3>
        <Link
          to={leakagePath}
          onClick={() => trackFinanceAlertOpened('panel_link')}
          style={{ ...mono, color: 'var(--cyan)', fontSize: 10, textDecoration: 'none' }}
        >
          Abrir mapa →
        </Link>
      </div>
      {loading && (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, marginTop: 8 }}>A carregar…</p>
      )}
      {!loading && alerts.length === 0 && (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, marginTop: 8 }}>
          Nenhum alerta activo · fonte: financial-leakage/alerts
        </p>
      )}
      {!loading && alerts.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0 }}>
          {alerts.map((a) => (
            <li
              key={a.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
              onClick={() => trackFinanceAlertOpened(a.id)}
            >
              <span style={{ ...mono, color: severityColor(a.severity), fontSize: 9 }}>{a.severity}</span>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{a.title}</div>
              {a.evidence && (
                <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9, marginTop: 2 }}>
                  {a.evidence}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
