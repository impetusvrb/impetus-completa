import React, { useRef, useState, useCallback } from 'react';
import { routeQualityScan } from '../scanner/qualityScanRouter.js';
import { inferSymbology } from '../scanner/qualityScanParser.js';
import { isQualityScannerRuntimeEnabled } from './qualityOperationalFeatureFlags.js';
import { qualityOperational } from '../../../services/api.js';
import { noteQualityScannerError } from '../../../observability/qualityOperationalTelemetry.js';

export function QualityScannerRuntime({ companyId, correlationId, onResolved }) {
  const [manual, setManual] = useState('');
  const [hint, setHint] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const applyScan = useCallback(
    async (text) => {
      if (!isQualityScannerRuntimeEnabled()) {
        setHint('Scanner desligado (flag)');
        return;
      }
      if (!String(text || '').trim()) {
        noteQualityScannerError();
        setHint('Código vazio');
        return;
      }
      const routed = routeQualityScan(text);
      const sym = inferSymbology(text);
      onResolved?.({ ...routed, symbology: sym });
      try {
        await qualityOperational.publishEvent({
          event_name: 'quality.scan.performed',
          correlation_id: correlationId,
          payload: { raw: text, routed, symbology: sym, companyId }
        });
      } catch {
        /* offline layer trata na inspeção */
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

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Scanner industrial
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="Código manual"
          inputMode="numeric"
          style={{
            flex: 1,
            minWidth: 160,
            minHeight: 48,
            fontSize: 18,
            padding: '10px 12px',
            borderRadius: 4,
            border: '1px solid var(--border-default)',
            background: 'var(--bg-panel)',
            color: 'var(--text-primary)'
          }}
        />
        <button type="button" className="btn-primary" style={{ minHeight: 48, padding: '0 18px' }} onClick={() => applyScan(manual)}>
          Aplicar
        </button>
        <button type="button" className="btn-ghost" style={{ minHeight: 48 }} onClick={streamRef.current ? stopVideo : startVideo}>
          {streamRef.current ? 'Parar câmara' : 'Câmara'}
        </button>
      </div>
      <video ref={videoRef} playsInline muted style={{ width: '100%', maxHeight: 160, marginTop: 8, borderRadius: 4, border: '1px solid var(--border-subtle)' }} />
      {typeof window !== 'undefined' && 'BarcodeDetector' in window ? (
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: 8, minHeight: 44 }}
          onClick={async () => {
            const detector = new window.BarcodeDetector({ formats: ['qr_code', 'code_128', 'ean_13', 'data_matrix'] });
            try {
              if (!videoRef.current) return;
              const codes = await detector.detect(videoRef.current);
              if (codes[0]?.rawValue) await applyScan(codes[0].rawValue);
            } catch {
              setHint('Leitura sem resultado');
            }
          }}
        >
          Ler frame (BarcodeDetector)
        </button>
      ) : null}
      {hint ? <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 6 }}>{hint}</p> : null}
    </div>
  );
}

export default QualityScannerRuntime;
