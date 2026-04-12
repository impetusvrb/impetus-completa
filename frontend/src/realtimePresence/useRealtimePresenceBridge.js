/**
 * Ponte entre o estado da voz (useVoiceEngine) e a Realtime Presence API:
 * percepção contextual + comando de render (Akool executa; IMPETUS decide).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { realtimePresence } from '../services/api';

function isPresenceEnabled() {
  const v = String(import.meta.env.VITE_REALTIME_PRESENCE_ENABLED || '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

/** voiceState.status → fase do pipeline de presença */
export function mapVoiceStatusToPhase(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'listening') return 'listening';
  if (s === 'processing') return 'processing';
  if (s === 'speaking') return 'speaking';
  return 'idle';
}

/**
 * @param {object} opts
 * @param {string} opts.voiceStatus — ex.: voiceState.status
 * @param {string} opts.pathname — useLocation().pathname
 * @param {string} [opts.currentTranscript] — texto em construção / última transcrição
 * @param {number} [opts.debounceMs]
 * @param {boolean} [opts.enabled=true] — desliga chamadas HTTP quando falso
 */
export function useRealtimePresenceBridge({
  voiceStatus,
  pathname,
  currentTranscript = '',
  debounceMs = 220,
  enabled = true
}) {
  const [renderCommand, setRenderCommand] = useState(null);
  const [perception, setPerception] = useState(null);
  const [akoolConfigured, setAkoolConfigured] = useState(false);
  const timerRef = useRef(null);
  const lastPerceptionRef = useRef(null);

  const sync = useCallback(async () => {
    if (!isPresenceEnabled() || !enabled) return;
    const voice_phase = mapVoiceStatusToPhase(voiceStatus);
    /* Só após o utilizador terminar o turno (antes da resposta). Evita perceive/render
     * a cada delta de transcrição em «listening» / «speaking» — menos carga e menos 404. */
    if (voice_phase !== 'processing') return;

    const screen_path = String(pathname || '');
    const message = String(currentTranscript || '').slice(0, 2000);
    if (message.trim().length < 3) return;

    try {
      const pr = await realtimePresence.perceive({ message, screen_path });
      const per = pr.data?.perception;
      if (per) {
        lastPerceptionRef.current = per;
        setPerception(per);
      }

      const rr = await realtimePresence.render({
        voice_phase,
        perception: per || lastPerceptionRef.current || undefined
      });
      if (rr.data?.render_command) setRenderCommand(rr.data.render_command);
      if (typeof rr.data?.akool_configured === 'boolean') setAkoolConfigured(rr.data.akool_configured);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[RealtimePresenceBridge]', e?.message || e);
    }
  }, [voiceStatus, pathname, currentTranscript, enabled]);

  useEffect(() => {
    if (!isPresenceEnabled() || !enabled) return undefined;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      sync();
    }, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [sync, debounceMs, enabled]);

  return {
    enabled: isPresenceEnabled() && enabled,
    renderCommand,
    perception,
    akoolConfigured,
    expressionLabel: renderCommand?.expression_state || null
  };
}
