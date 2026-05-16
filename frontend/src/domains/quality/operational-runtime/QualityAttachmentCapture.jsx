import React, { useRef, useState } from 'react';
import { isQualityAttachmentRuntimeEnabled } from './qualityOperationalFeatureFlags.js';
import { captureQualityEvidence } from '../attachments/qualityEvidenceCapture.js';

export function QualityAttachmentCapture({ companyId, inspectionId, correlationId }) {
  const [msg, setMsg] = useState('');
  const [phase, setPhase] = useState('');
  const [pct, setPct] = useState(0);
  const [showRetry, setShowRetry] = useState(false);
  const inputRef = useRef(null);
  const lastFileRef = useRef(null);

  const enabled = isQualityAttachmentRuntimeEnabled();

  const runCapture = async (file) => {
    if (!file || !companyId) return;
    lastFileRef.current = file;
    setShowRetry(false);
    setPhase('prepare');
    setPct(0.05);
    const r = await captureQualityEvidence({
      companyId,
      file,
      inspectionId,
      correlationId,
      onProgress: (p) => {
        if (typeof p.progress === 'number') setPct(p.progress);
        if (p.phase) setPhase(String(p.phase));
      },
      maxPublishRetries: 2
    });
    setPct(1);
    setPhase('');
    const okish = !!(r.ok || r.queued);
    setShowRetry(!okish);
    setMsg(
      r.ok ? 'Evidência registada' : r.queued ? 'Evidência em fila' : r.reason === 'attachment_runtime_disabled' ? 'Runtime off' : 'Falha — tocar para repetir'
    );
  };

  if (!enabled) return null;

  return (
    <div style={{ marginTop: 10 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf,video/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          await runCapture(f);
        }}
      />
      <button type="button" className="btn-ghost" style={{ minHeight: 48, width: '100%' }} onClick={() => inputRef.current?.click()}>
        Anexo / foto
      </button>
      {phase ? (
        <div style={{ marginTop: 8, height: 6, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, Math.round(pct * 100))}%`, height: '100%', background: 'var(--cyan)', transition: 'width 0.2s ease' }} />
        </div>
      ) : null}
      {msg ? <p style={{ fontSize: 12, color: 'var(--cyan)', marginTop: 6 }}>{msg}</p> : null}
      {showRetry && lastFileRef.current ? (
        <button
          type="button"
          className="btn-ghost"
          style={{ marginTop: 8, width: '100%', minHeight: 44 }}
          onClick={() => runCapture(lastFileRef.current)}
        >
          Repetir envio
        </button>
      ) : null}
    </div>
  );
}

export default QualityAttachmentCapture;
