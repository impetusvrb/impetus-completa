import { safeUUID } from '../../../utils/safeUuid.js';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { qualityOperational } from '../../../services/api.js';
import { isUltraLowBandwidthMode } from './qualityOperationalFeatureFlags.js';
import { qualityEnqueueMutation } from '../offline/qualityOfflineQueue.js';
import { isQualityOfflineRuntimeEnabled } from './qualityOperationalFeatureFlags.js';
import { QualityRealtimeCollection } from './QualityRealtimeCollection.jsx';
import { QualityScannerRuntime } from './QualityScannerRuntime.jsx';
import { QualityAttachmentCapture } from './QualityAttachmentCapture.jsx';

const labelStyle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  marginBottom: 6
};

const btnTouch = {
  minHeight: 52,
  minWidth: 52,
  padding: '14px 20px',
  fontSize: 16,
  borderRadius: 4,
  border: '1px solid var(--border-active)',
  background: 'rgba(0,212,255,0.08)',
  color: 'var(--cyan)',
  cursor: 'pointer'
};

export function QualityInspectionRuntime({ companyId: companyIdProp, stationId: stationIdProp }) {
  const ctx = useOutletContext() || {};
  const companyId = companyIdProp ?? ctx.companyId;
  const stationId = stationIdProp ?? ctx.stationId;
  const [corr] = useState(() => safeUUID());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const startedRef = useRef(false);

  const publish = useCallback(
    async (event_name, payload) => {
      if (!companyId) {
        setStatus('tenant em falta');
        return;
      }
      const body = {
        event_name,
        correlation_id: corr,
        workflow_id: null,
        payload: {
          ...payload,
          station_id: stationId,
          inspection_ui: 'operational_etapa2'
        }
      };
      try {
        await qualityOperational.publishEvent(body);
        setStatus(`${event_name} ok`);
      } catch (e) {
        if (isQualityOfflineRuntimeEnabled()) {
          await qualityEnqueueMutation({
            companyId,
            kind: 'quality.event',
            idempotencyKey: `${event_name}:${corr}:${Date.now()}`,
            body,
            correlationId: corr
          });
          setStatus(`${event_name} em fila offline`);
        } else {
          setStatus(e?.message || 'erro');
        }
      }
    },
    [companyId, corr, stationId]
  );

  useEffect(() => {
    if (!companyId || startedRef.current) return;
    startedRef.current = true;
    publish('quality.inspection.started', { source: 'operational_shell' });
  }, [companyId, publish]);

  const lowBw = isUltraLowBandwidthMode();

  if (!companyId) {
    return (
      <div className="impetus-card" style={{ borderRadius: 4, padding: 12, borderLeft: '3px solid var(--amber)' }}>
        <p style={{ ...labelStyle, color: 'var(--amber)' }}>Inspeção indisponível sem company_id</p>
      </div>
    );
  }

  return (
    <div className="impetus-card" style={{ borderRadius: 4, padding: 12 }}>
      <div style={labelStyle}>Inspeção operacional</div>
      {!lowBw && (
        <>
          <QualityScannerRuntime companyId={companyId} correlationId={corr} onResolved={(r) => setStatus(`Scan: ${r.kind}`)} />
          <QualityRealtimeCollection inspectionId={corr} />
          <QualityAttachmentCapture companyId={companyId} inspectionId={corr} correlationId={corr} />
        </>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas / leituras"
        rows={lowBw ? 3 : 5}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          marginTop: 10,
          background: 'var(--bg-panel)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-default)',
          borderRadius: 4,
          fontSize: 18,
          padding: 12,
          fontFamily: 'var(--font-mono)'
        }}
      />
      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          style={btnTouch}
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await publish('quality.inspection.saved', { notes });
            setSaving(false);
          }}
        >
          Guardar
        </button>
        <button
          type="button"
          className="btn-primary"
          style={{ ...btnTouch, flex: 1 }}
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await publish('quality.inspection.completed', { notes, terminal: true });
            setSaving(false);
          }}
        >
          Concluir
        </button>
      </div>
      {status ? (
        <p style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green)' }}>{status}</p>
      ) : null}
    </div>
  );
}

export default QualityInspectionRuntime;
