import React from 'react';

function StatusPill({ ok, label, accent }) {
  const color = ok ? (accent || 'var(--green)') : 'var(--amber)';
  return (
    <span className="soc-status-pill" style={{ color, borderColor: `${color}55` }}>
      <span className="soc-status-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

export default function SocOperationalFooter({ data }) {
  const snap = data?.snapshot_id || data?.generated_at || '—';
  const snapShort = typeof snap === 'string' && snap.length > 24
    ? `${snap.slice(0, 19)}…`
    : snap;

  const dbDomain = (data?.security_score?.domains || []).find((d) => d.id === 'database');
  const dbOk = dbDomain ? dbDomain.earned >= 50 : null;
  const rebuildTs = data?.generated_at
    ? new Date(data.generated_at).toLocaleString('pt-BR')
    : null;

  return (
    <footer className="soc-operational-footer">
      <StatusPill ok label="Sistema Online" />
      <StatusPill ok={dbOk !== false} label={dbOk === false ? 'Base de Dados — verificar' : dbOk == null ? 'Base de Dados — METRIC_DATA_GAP' : 'Base de Dados Saudável'} />
      {rebuildTs ? (
        <StatusPill ok label={`Snapshot ${rebuildTs}`} accent="var(--cyan)" />
      ) : (
        <StatusPill ok={false} label="Snapshot — METRIC_DATA_GAP" />
      )}
      <StatusPill ok label="GeoIP Async (decoupled)" accent="var(--cyan)" />
      <StatusPill ok label={`ID ${snapShort}`} accent="#b44dff" />
      <span className="soc-footer-version">admin_security_dashboard_v4</span>
    </footer>
  );
}
