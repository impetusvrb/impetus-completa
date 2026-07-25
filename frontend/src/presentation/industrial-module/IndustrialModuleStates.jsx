import React from 'react';
import { mono, MODULE_STATES } from './industrialModuleTokens.js';

const STATE_META = {
  [MODULE_STATES.loading]: { label: 'A carregar', color: 'var(--text-secondary)' },
  [MODULE_STATES.empty]: { label: 'Sem dados', color: 'var(--text-tertiary)' },
  [MODULE_STATES.error]: { label: 'Erro operacional', color: 'var(--red)' },
  [MODULE_STATES.permission_denied]: { label: 'Sem permissão', color: 'var(--amber)' },
  [MODULE_STATES.offline]: { label: 'Offline', color: 'var(--amber)' },
  [MODULE_STATES.read_only]: { label: 'Somente leitura', color: 'var(--text-tertiary)' },
  [MODULE_STATES.syncing]: { label: 'Sincronizando', color: 'var(--cyan)' },
  [MODULE_STATES.updating]: { label: 'Actualizando', color: 'var(--cyan)' },
  [MODULE_STATES.partial_data]: { label: 'Dados parciais', color: 'var(--amber)' },
  [MODULE_STATES.integration_unavailable]: { label: 'Integração indisponível', color: 'var(--red)' },
  [MODULE_STATES.data_loaded]: { label: 'Dados carregados', color: 'var(--green)' }
};

export function IndustrialModuleStateBanner({ state, detail }) {
  const meta = STATE_META[state] || STATE_META[MODULE_STATES.error];
  return (
    <div
      className="industrial-module-state"
      data-industrial-state={state}
      style={{
        padding: '0.75rem 1rem',
        borderRadius: 4,
        border: `1px solid ${meta.color}`,
        background: 'var(--bg-tertiary)'
      }}
    >
      <p style={{ ...mono, color: meta.color, margin: 0 }}>{meta.label}</p>
      {detail && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>
          {detail}
        </p>
      )}
    </div>
  );
}

export function IndustrialModuleStateView({ state, detail, moduleLabel }) {
  if (state === MODULE_STATES.loading || state === MODULE_STATES.syncing || state === MODULE_STATES.updating) {
    return <IndustrialModuleStateBanner state={state} detail={detail || `${moduleLabel || 'Módulo'} · aguarde…`} />;
  }
  return <IndustrialModuleStateBanner state={state} detail={detail} />;
}

export { STATE_META, MODULE_STATES };
