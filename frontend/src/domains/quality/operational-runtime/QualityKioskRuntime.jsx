import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { isQualityKioskRuntimeEnabled } from './qualityOperationalFeatureFlags.js';
import { qualityOperational } from '../../../services/api.js';
import { QualityOperationalWorkspace } from './QualityOperationalWorkspace.jsx';

/**
 * Kiosk — fullscreen opcional, PIN só em memória da sessão (sem authority).
 */
export function QualityKioskRuntime({ companyId: companyIdProp, stationId: stationIdProp }) {
  const ctx = useOutletContext() || {};
  const rootRef = useRef(null);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const idleRef = useRef(null);

  const companyId =
    companyIdProp ??
    ctx.companyId ??
    (() => {
      try {
        return JSON.parse(localStorage.getItem('impetus_user') || '{}').company_id;
      } catch {
        return null;
      }
    })();
  const stationId = stationIdProp ?? ctx.stationId;

  const resetSession = useCallback(async () => {
    setUnlocked(false);
    setPin('');
    try {
      if (companyId) {
        await qualityOperational.publishEvent({
          event_name: 'quality.kiosk.session_closed',
          payload: { station_id: stationId }
        });
      }
    } catch {
      /* ignore */
    }
  }, [companyId, stationId]);

  useEffect(() => {
    if (!isQualityKioskRuntimeEnabled()) return;
    const onFsChange = () => {
      if (!document.fullscreenElement) resetSession();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [resetSession]);

  useEffect(() => {
    if (!isQualityKioskRuntimeEnabled() || !unlocked) return;
    clearTimeout(idleRef.current);
    idleRef.current = setTimeout(() => resetSession(), 10 * 60 * 1000);
    return () => clearTimeout(idleRef.current);
  }, [unlocked, resetSession]);

  const goFullscreen = async () => {
    if (!rootRef.current?.requestFullscreen) return;
    await rootRef.current.requestFullscreen();
    try {
      await qualityOperational.publishEvent({
        event_name: 'quality.kiosk.session_started',
        payload: { station_id: stationId }
      });
    } catch {
      /* ignore */
    }
  };

  if (!isQualityKioskRuntimeEnabled()) {
    return <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Kiosk desligado (flag)</p>;
  }

  if (!unlocked) {
    return (
      <div ref={rootRef} className="impetus-card" style={{ padding: 16, borderRadius: 4, maxWidth: 420 }}>
        <div style={{ ...labelMono }}>Kiosk — PIN operador</div>
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="PIN"
          style={inputLarge}
        />
        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: 12, width: '100%', minHeight: 52 }}
          onClick={() => {
            if (pin.length >= 4) {
              setUnlocked(true);
              goFullscreen();
            }
          }}
        >
          Iniciar posto
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottom: '1px solid var(--border-subtle)' }}>
        <span style={labelMono}>Kiosk ativo</span>
        <button type="button" className="btn-ghost" onClick={resetSession}>
          Sair
        </button>
      </div>
      <QualityOperationalWorkspace companyId={companyId} stationId={stationId} />
    </div>
  );
}

const labelMono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'var(--text-secondary)',
  marginBottom: 8
};

const inputLarge = {
  width: '100%',
  minHeight: 52,
  fontSize: 22,
  padding: 12,
  borderRadius: 4,
  border: '1px solid var(--border-default)',
  background: 'var(--bg-panel)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-mono)'
};

export default QualityKioskRuntime;
