/**
 * Overlay imersivo do modo voz (Jarvis-like).
 * Mostra avatar com boca + texto digitando enquanto fala.
 */
import React from 'react';
import ImpetusAvatarLive from './ImpetusAvatarLive';
import './ImpetusVoiceOverlay.css';

function statusLabel(status) {
  if (status === 'listening') return 'OUVINDO…';
  if (status === 'processing') return 'PROCESSANDO…';
  if (status === 'speaking') return 'RESPONDENDO…';
  return 'PRONTA';
}

export default function ImpetusVoiceOverlay({
  open,
  status,
  mouthState,
  speechText,
  onClose
}) {
  if (!open) return null;

  const avatarState =
    status === 'listening' ? 'listening' : status === 'speaking' ? 'speaking' : 'standby';

  return (
    <div className="impetus-voice-overlay" role="dialog" aria-modal="true">
      <div className="impetus-voice-overlay__panel">
        <div className="impetus-voice-overlay__top">
          <div className="impetus-voice-overlay__brand">IMPETUS</div>
          <button type="button" className="impetus-voice-overlay__close" onClick={onClose}>
            Encerrar
          </button>
        </div>

        <div className="impetus-voice-overlay__avatar">
          <ImpetusAvatarLive state={avatarState} mouthState={mouthState} size={280} />
        </div>

        <div className="impetus-voice-overlay__status" aria-live="polite">
          {statusLabel(status)}
        </div>

        <div className="impetus-voice-overlay__speech" aria-live="polite">
          {speechText || <span className="impetus-voice-overlay__hint">Fale “Ok, Impetus” ou fale direto.</span>}
        </div>
      </div>
    </div>
  );
}

