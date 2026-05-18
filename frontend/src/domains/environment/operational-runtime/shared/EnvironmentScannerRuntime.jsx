import React, { useRef, useState, useCallback } from 'react';
import { isEnvironmentScannerRuntimeEnabled } from '../environmentOperationalFeatureFlags.js';
import { environmentOperational } from '../../../../services/api.js';
import { labelStyle, btnTouch, inputTouch } from './operationalUi.js';

export function EnvironmentScannerRuntime({ companyId, correlationId, onResolved }) {
  const [manual, setManual] = useState('');
  const [hint, setHint] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const applyScan = useCallback(
    async (text) => {
      if (!isEnvironmentScannerRuntimeEnabled()) {
        setHint('Scanner desligado (shadow)');
        return;
      }
      const raw = String(text || '').trim();
      if (!raw) {
        setHint('Código vazio');
        return;
      }
      onResolved?.({ raw, kind: raw.startsWith('MTR') ? 'waste_manifest' : 'sample' });
      try {
        await environmentOperational.publishEvent({
          event_name: 'environment.scan.performed',
          correlation_id: correlationId,
          payload: { raw, companyId }
        });
        setHint('Scan registado');
      } catch {
        setHint('Scan local (sync pendente)');
      }
    },
    [companyId, correlationId, onResolved]
  );

  const startVideo = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  };

  const stopVideo = () => {
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
  };

  if (!isEnvironmentScannerRuntimeEnabled()) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={labelStyle}>Scanner / QR / código de barras</div>
      <input
        style={inputTouch}
        value={manual}
        onChange={(e) => setManual(e.target.value)}
        placeholder="Hidrômetro, MTR, ponto de coleta…"
        onKeyDown={(e) => e.key === 'Enter' && applyScan(manual)}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <button type="button" style={btnTouch} onClick={() => applyScan(manual)}>
          Aplicar
        </button>
        <button type="button" className="btn-ghost" style={{ ...btnTouch, minHeight: 44 }} onClick={startVideo}>
          Câmera
        </button>
        <button type="button" className="btn-ghost" style={{ ...btnTouch, minHeight: 44 }} onClick={stopVideo}>
          Parar
        </button>
        </div>
      <video ref={videoRef} style={{ width: '100%', maxHeight: 160, marginTop: 8, borderRadius: 4 }} muted playsInline />
      {hint && <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>{hint}</p>}
    </div>
  );
}
