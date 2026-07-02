import React from 'react';

const LABELS = {
  empty: 'SEM DADOS OPERACIONAIS',
  live: 'DADOS REAIS',
  enriched: 'DADOS ENRIQUECIDOS',
  tenant_empty: 'TENANT VAZIO',
  telemetry_only: 'TELEMETRIA PLC'
};

export default function CognitiveDataStateBadge({ dataState, className = '' }) {
  if (!dataState) return null;
  const label = LABELS[dataState] || String(dataState).toUpperCase().replace(/_/g, ' ');
  const isEmpty = dataState === 'empty' || dataState === 'tenant_empty';
  return (
    <span
      className={`cog-data-state ${isEmpty ? 'cog-data-state--empty' : 'cog-data-state--live'} ${className}`.trim()}
      title={`data_state: ${dataState}`}
    >
      {label}
    </span>
  );
}
