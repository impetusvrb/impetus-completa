/**
 * Overlay imersivo do modo voz (Jarvis-like).
 * Mostra avatar com boca + texto digitando enquanto fala.
 */
import React from 'react';
import ImpetusAvatarLive from './ImpetusAvatarLive';
import './ImpetusVoiceOverlay.css';

function statusLabel(status, realtimeMode) {
  if (realtimeMode && status === 'listening') return 'REALTIME · OUVINDO…';
  if (realtimeMode && status === 'speaking') return 'REALTIME · VOZ…';
  if (realtimeMode && status === 'processing') return 'REALTIME · CONECTANDO…';
  if (status === 'listening') return 'OUVINDO…';
  if (status === 'processing') return 'PROCESSANDO…';
  if (status === 'speaking') return 'RESPONDENDO…';
  return 'PRONTA';
}

export default function ImpetusVoiceOverlay({
  open,
  status,
  bargeInFlash,
  mouthState,
  liveCaption = '',
  realtimeMode = false,
  onClose
}) {
  if (!open) return null;

  const avatarState =
    status === 'listening' ? 'listening' : status === 'speaking' ? 'speaking' : 'standby';
  const modeClass =
    status === 'speaking'
      ? 'impetus-voice-overlay--speaking'
      : status === 'listening'
        ? 'impetus-voice-overlay--listening'
        : status === 'processing'
          ? 'impetus-voice-overlay--processing'
          : 'impetus-voice-overlay--idle';
  const flashClass = bargeInFlash ? ' impetus-voice-overlay--listening-flash' : '';
  const bars = Array.from({ length: 28 }, (_, i) => i);

  return (
    <div className={`impetus-voice-overlay ${modeClass}${flashClass}`} role="dialog" aria-modal="true">
      <div className="impetus-voice-overlay__panel">
        <div className="impetus-voice-overlay__bg-grid" aria-hidden="true" />
        <div className="impetus-voice-overlay__top">
          <div className="impetus-voice-overlay__brand">IMPETUS</div>
          <button type="button" className="impetus-voice-overlay__close" onClick={onClose}>
            Encerrar
          </button>
        </div>

        <div className="impetus-voice-overlay__avatar">
          <div className="impetus-voice-overlay__avatar-ring" aria-hidden="true" />
          <ImpetusAvatarLive state={avatarState} mouthState={mouthState} size={320} />
        </div>

        <div className="impetus-voice-overlay__status" aria-live="polite">
          {statusLabel(status, realtimeMode)}
        </div>

        <div className="impetus-voice-overlay__meter-wrap" aria-hidden="true">
          <div className="impetus-voice-overlay__meter">
            {bars.map((i) => (
              <span
                key={i}
                className="impetus-voice-overlay__bar"
                style={{
                  animationDelay: `${(i % 7) * 0.06}s`,
                  animationDuration: `${0.72 + (i % 5) * 0.11}s`
                }}
              />
            ))}
          </div>
        </div>

        <div className="impetus-voice-overlay__speech" aria-live="polite">
          {String(liveCaption || '').trim() ? (
            <span className="impetus-voice-overlay__caption">{String(liveCaption).trim()}</span>
          ) : (
            <span className="impetus-voice-overlay__hint">
              {realtimeMode
                ? 'Conversa contínua com a IA (OpenAI Realtime). Fale naturalmente.'
                : 'Fale “Ok, Impetus” ou fale direto.'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

