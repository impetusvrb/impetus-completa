import React, { useRef, useState } from 'react';
import { isEnvironmentAttachmentRuntimeEnabled } from '../environmentOperationalFeatureFlags.js';
import { environmentOperational } from '../../../../services/api.js';
import { environmentEnqueueMutation } from '../../offline/environmentOfflineQueue.js';
import { isEnvironmentOfflineRuntimeEnabled } from '../environmentOperationalFeatureFlags.js';
import { labelStyle, btnTouch } from './operationalUi.js';

export function EnvironmentEvidenceCapture({ companyId, correlationId, area, onStatus }) {
  const inputRef = useRef(null);
  const [msg, setMsg] = useState('');

  if (!isEnvironmentAttachmentRuntimeEnabled()) return null;

  const onFile = async (file) => {
    if (!file || !companyId) return;
    const geo = await captureGeo();
    const body = {
      event_name: 'environment.environmental.evidence_attached',
      correlation_id: correlationId,
      payload: {
        area,
        file_name: file.name,
        file_type: file.type,
        size: file.size,
        geo
      }
    };
    try {
      await environmentOperational.publishEvent(body);
      setMsg('Evidência registada');
      onStatus?.('Evidência OK');
    } catch {
      if (isEnvironmentOfflineRuntimeEnabled()) {
        await environmentEnqueueMutation({
          companyId,
          kind: 'environment.event',
          idempotencyKey: `evidence:${correlationId}:${file.name}`,
          body,
          correlationId
        });
        setMsg('Evidência em fila offline');
        onStatus?.('Evidência em fila');
      } else {
        setMsg('Falha no upload');
      }
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <div style={labelStyle}>Evidência / anexo</div>
      <button type="button" className="btn-ghost" style={btnTouch} onClick={() => inputRef.current?.click()}>
        Câmera / ficheiro
      </button>
      {msg && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{msg}</p>}
    </div>
  );
}

async function captureGeo() {
  if (!navigator?.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 }
    );
  });
}
