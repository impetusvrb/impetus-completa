import React from 'react';
import { WMS_ERROR_LABELS } from '../utils/wmsErrorClassifier.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

export function WmsModuleLoading({ label = 'A carregar' }) {
  return (
    <p style={{ ...mono, color: 'var(--text-secondary)', margin: '8px 0' }}>
      {label} · WMS-003 v1…
    </p>
  );
}

export function WmsModuleEmpty({ moduleLabel }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, border: '1px dashed var(--border-subtle)' }}>
      <p style={{ ...mono, color: 'var(--text-tertiary)', margin: 0 }}>
        Sem registos — {moduleLabel}
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
        API v1 respondeu vazio. Estado operacional válido.
      </p>
    </div>
  );
}

export function WmsModuleError({ errorType, detail }) {
  const label = WMS_ERROR_LABELS[errorType] || WMS_ERROR_LABELS.operational_error;
  const color =
    errorType === 'permission_denied' ? 'var(--amber)' : errorType === 'api_unavailable' ? 'var(--red)' : 'var(--red)';
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, border: `1px solid ${color}` }}>
      <p style={{ ...mono, color, margin: 0 }}>{label}</p>
      {detail && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>{detail}</p>
      )}
    </div>
  );
}

export function WmsModulePermissionDenied({ moduleId }) {
  return (
    <WmsModuleError
      errorType="permission_denied"
      detail={`Módulo ${moduleId} · RBAC WMS-003`}
    />
  );
}
