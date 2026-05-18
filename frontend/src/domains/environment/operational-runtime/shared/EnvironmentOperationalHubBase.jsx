import { safeUUID } from '../../../../utils/safeUuid.js';
import React, { useState, useCallback, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { environmentOperational } from '../../../../services/api.js';
import { environmentEnqueueMutation } from '../../offline/environmentOfflineQueue.js';
import { isEnvironmentOfflineRuntimeEnabled } from '../environmentOperationalFeatureFlags.js';
import { labelStyle, btnTouch, inputTouch } from './operationalUi.js';
import { EnvironmentScannerRuntime } from './EnvironmentScannerRuntime.jsx';
import { EnvironmentEvidenceCapture } from './EnvironmentEvidenceCapture.jsx';
import { EnvironmentOfflineRuntime } from './EnvironmentOfflineRuntime.jsx';
import { EnvironmentRealtimeStatus } from './EnvironmentRealtimeStatus.jsx';

export function EnvironmentOperationalHubBase({
  area,
  title,
  subtitle,
  fields = [],
  eventName,
  recordLabel = 'Registrar'
}) {
  const ctx = useOutletContext() || {};
  const companyId = ctx.companyId;
  const [corr] = useState(() => safeUUID());
  const [form, setForm] = useState({});
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const publish = useCallback(
    async (name, payload) => {
      if (!companyId) return;
      const body = {
        event_name: name || eventName,
        correlation_id: corr,
        payload: { area, ...payload, correlation_id: corr }
      };
      try {
        await environmentOperational.publishEvent(body);
        setStatus('Evento publicado');
      } catch (e) {
        if (isEnvironmentOfflineRuntimeEnabled()) {
          await environmentEnqueueMutation({
            companyId,
            kind: 'environment.event',
            idempotencyKey: `${body.event_name}:${corr}:${Date.now()}`,
            body,
            correlationId: corr
          });
          setStatus('Em fila offline');
        } else {
          setStatus(e?.message || 'Erro');
        }
      }
    },
    [area, companyId, corr, eventName]
  );

  const onRecord = useCallback(async () => {
    if (!companyId) return;
    setSaving(true);
    try {
      const res = await environmentOperational.record(area, { ...form, correlation_id: corr });
      if (res?.data?.ok) {
        setStatus('Registo operacional OK');
        await publish(eventName, form);
      } else {
        setStatus('Falha no registo');
      }
    } catch (e) {
      if (isEnvironmentOfflineRuntimeEnabled()) {
        await environmentEnqueueMutation({
          companyId,
          kind: 'environment.event',
          idempotencyKey: `record:${area}:${corr}`,
          body: { event_name: eventName, correlation_id: corr, payload: { area, form } },
          correlationId: corr
        });
        setStatus('Registo em fila offline');
      } else {
        setStatus(e?.message || 'Erro');
      }
    } finally {
      setSaving(false);
    }
  }, [area, companyId, corr, eventName, form, publish]);

  const fieldEls = useMemo(
    () =>
      fields.map((f) => (
        <label key={f.key} style={{ display: 'block', marginBottom: 12 }}>
          <span style={labelStyle}>{f.label}</span>
          <input
            type={f.type || 'text'}
            inputMode={f.inputMode}
            style={inputTouch}
            value={form[f.key] ?? ''}
            onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
          />
        </label>
      )),
    [fields, form]
  );

  if (!companyId) {
    return (
      <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>Sessão sem empresa.</p>
      </div>
    );
  }

  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }} data-environment-area={area}>
      <div style={labelStyle}>{title}</div>
      {subtitle && <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 0 }}>{subtitle}</p>}
      <EnvironmentRealtimeStatus area={area} />
      <EnvironmentScannerRuntime companyId={companyId} correlationId={corr} onResolved={() => setStatus('Scan OK')} />
      {fieldEls}
      <EnvironmentEvidenceCapture companyId={companyId} correlationId={corr} area={area} onStatus={setStatus} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
        <button type="button" className="btn" style={btnTouch} disabled={saving} onClick={onRecord}>
          {saving ? '…' : recordLabel}
        </button>
      </div>
      {status && (
        <p style={{ marginTop: 10, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-accent)' }}>{status}</p>
      )}
      <EnvironmentOfflineRuntime companyId={companyId} />
    </div>
  );
}
