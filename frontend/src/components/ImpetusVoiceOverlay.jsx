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
  if (realtimeMode && status === 'processing') return 'REALTIME · ANALISANDO…';
  if (status === 'listening') return 'OUVINDO…';
  if (status === 'processing') return 'ANALISANDO…';
  if (status === 'speaking') return 'RESPONDENDO…';
  return 'PRONTA';
}

export default function ImpetusVoiceOverlay({
  open,
  status,
  bargeInFlash,
  mouthState,
  videoLipSyncRef = null,
  didAvatarVideoUrl = null,
  didAvatarReplay = false,
  liveCaption = '',
  realtimeMode = false,
  onClose,
  voiceAvatarAnimationEnabled = true,
  voiceAvatarControlRef = null
}) {
  // Sempre ligar lipsync por volume ao clipe “speaking” (hero ou speaking.mp4) — Realtime ou TTS.
  const passLipSync = videoLipSyncRef;

  if (!open) return null;

  const avatarState =
    status === 'listening'
      ? 'listening'
      : status === 'speaking'
        ? 'speaking'
        : status === 'processing'
          ? 'processing'
          : 'standby';
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
          <div className="impetus-voice-overlay__avatar-decor" aria-hidden="true">
            <div className="impetus-voice-overlay__orbit impetus-voice-overlay__orbit--a" />
            <div className="impetus-voice-overlay__orbit impetus-voice-overlay__orbit--b" />
            <div className="impetus-voice-overlay__orbit impetus-voice-overlay__orbit--c" />
            <div className="impetus-voice-overlay__orbit impetus-voice-overlay__orbit--d" />
          </div>
          <div className="impetus-voice-overlay__avatar-ring" aria-hidden="true" />
          <ImpetusAvatarLive
            state={avatarState}
            mouthState={mouthState}
            size={348}
            immersiveVoice
            videoLipSyncRef={passLipSync}
            didVideoUrl={didAvatarVideoUrl}
            didReplayOverlay={didAvatarReplay}
            didPrimarySpeaking={false}
            voiceAvatarAnimationEnabled={voiceAvatarAnimationEnabled}
            voiceAvatarControlRef={voiceAvatarControlRef}
          />
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

