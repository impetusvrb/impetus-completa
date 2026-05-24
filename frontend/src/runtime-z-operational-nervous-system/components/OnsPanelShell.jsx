import React from 'react';
import useOperationalNervousSystemData from '../runtime/useOperationalNervousSystemData';
import { formatScore, scoreClass } from '../runtime/onsFormatters';
import '../styles/operationalNervousSystem.css';

function Row({ label, value, cls = '' }) {
  return (
    <div className="z-ons-row">
      <span className="z-ons-label">{label}</span>
      <span className={`z-ons-value ${cls}`}>{value}</span>
    </div>
  );
}

export default function PanelShell({ payload, title, ariaLabel, children }) {
  const data = useOperationalNervousSystemData(payload);
  if (!data.available) return null;
  return (
    <section className="z-ons-panel" aria-label={ariaLabel || title}>
      <header className="z-ons-panel__header">
        <h3 className="z-ons-panel__title">{title} · SZ4</h3>
        <span className="z-ons-panel__subtitle">stage {data.stage}</span>
      </header>
      {children(data)}
    </section>
  );
}

export function ListBlock({ items, emptyLabel }) {
  if (!items?.length) return <p className="z-ons-empty">{emptyLabel}</p>;
  return (
    <ul className="z-ons-list">
      {items.slice(0, 6).map((item) => (
        <li key={item.id || item.title}>{(item.title || item.id || '—').slice(0, 100)}</li>
      ))}
    </ul>
  );
}

export function MetricsRows({ metrics }) {
  if (!metrics) return <p className="z-ons-empty">Métricas indisponíveis.</p>;
  return (
    <>
      <Row label="Closure" value={formatScore(metrics.z_operational_closure_score)} cls={scoreClass(metrics.z_operational_closure_score)} />
      <Row label="Continuidade" value={formatScore(metrics.z_task_continuity_score)} cls={scoreClass(metrics.z_task_continuity_score)} />
      <Row label="Reintegração" value={formatScore(metrics.z_conversational_reintegration_score)} cls={scoreClass(metrics.z_conversational_reintegration_score)} />
    </>
  );
}

export { Row, useOperationalNervousSystemData };
