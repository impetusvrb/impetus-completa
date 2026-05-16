import React, { useEffect, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { qualityOfflineQueueDepth } from '../offline/qualityOfflineSync.js';
import { isQualityOfflineRuntimeEnabled, isQualityOperationalDiagnosticsEnabled } from './qualityOperationalFeatureFlags.js';
import { getQualityOperationalTelemetrySnapshot } from '../../../observability/qualityOperationalTelemetry.js';

/**
 * Painel de diagnóstico — apenas com flag diagnostics ou shadow (sem exposição por defeito).
 */
export function QualityOperationalDiagnostics({ companyId: companyIdProp }) {
  const ctx = useOutletContext() || {};
  const companyId = companyIdProp ?? ctx.companyId;
  const [depth, setDepth] = useState(0);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    if (!companyId || !isQualityOfflineRuntimeEnabled()) {
      setDepth(0);
      return;
    }
    setDepth(await qualityOfflineQueueDepth(companyId));
  }, [companyId]);

  useEffect(() => {
    if (!isQualityOperationalDiagnosticsEnabled()) return;
    refresh();
    const id = setInterval(() => setTick((t) => t + 1), 8000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!isQualityOperationalDiagnosticsEnabled()) return;
    refresh();
  }, [refresh, tick]);

  if (!isQualityOperationalDiagnosticsEnabled() || !companyId) return null;

  const tel = getQualityOperationalTelemetrySnapshot();

  return (
    <div
      className="impetus-card"
      style={{
        borderRadius: 4,
        padding: 10,
        borderLeft: '3px solid var(--border-active)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--text-secondary)',
        letterSpacing: '0.06em'
      }}
    >
      <div style={{ textTransform: 'uppercase', marginBottom: 6, color: 'var(--cyan)' }}>Diagnostics (pilot)</div>
      <div>offline queue: {depth}</div>
      <div>socket reconnects (sessão): {tel.unified_reconnect_count}</div>
      <div>anexo tentativas / falhas: {tel.attachment_attempts} / {tel.attachment_failures}</div>
      <div>scanner erros: {tel.scanner_errors}</div>
    </div>
  );
}

export default QualityOperationalDiagnostics;
