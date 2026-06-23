/**
 * Círculo vazio para avatar em tempo real externo (ex.: Anam API).
 * Monte vídeo/canvas dentro de `#impetus-anam-avatar-slot` ou passe `slotRef`.
 */
import React, { useEffect, useState } from 'react';
import './VoiceAvatarExternalSlot.css';

const SHARED_VIDEO_ID = 'impetus-anam-shared-video';

export default function VoiceAvatarExternalSlot({
  size = 344,
  state = 'standby',
  slotRef = null,
  slotId = 'impetus-anam-avatar-slot',
  children = null,
  /** idle | checking | connecting | streaming | unconfigured | error */
  anamStatus = 'idle',
  anamStreaming = false,
  /** MOBILE-ANAM-004 — módulo desativado por configuração */
  anamModuleDisabled = false,
  anamDisabledLabel = 'Módulo não habilitado'
}) {
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    const check = () => {
      const mount = slotRef?.current;
      const v =
        mount?.querySelector?.(`#${SHARED_VIDEO_ID}, video`) ||
        document.getElementById(SHARED_VIDEO_ID);
      const hasFrames = Number(v?.videoWidth) > 0 && Number(v?.readyState) >= 2;
      setHasVideo(Boolean(v?.srcObject) && hasFrames);
    };
    check();
    const iv = setInterval(check, 350);
    return () => clearInterval(iv);
  }, [slotRef, anamStreaming, anamStatus]);

  const showDisabledOverlay = anamModuleDisabled;
  const showPlaceholder =
    showDisabledOverlay ||
    (!children && !hasVideo && !anamStreaming && anamStatus !== 'streaming');

  const mountClassName = [
    'voice-avatar-external-slot__mount',
    showDisabledOverlay ? 'voice-avatar-external-slot__mount--disabled' : ''
  ]
    .filter(Boolean)
    .join(' ');

  const stateClass =
    state === 'listening' || state === 'speaking' || state === 'processing'
      ? state
      : 'standby';

  return (
    <div
      className={`voice-avatar-external-slot voice-avatar-external-slot--${stateClass}${
        showDisabledOverlay ? ' voice-avatar-external-slot--disabled' : ''
      }`}
      style={{ width: size, height: size }}
    >
      <div
        ref={slotRef}
        id={slotId}
        className={mountClassName}
        data-anam-mount="true"
        aria-label={
          showDisabledOverlay
            ? 'ANAM — módulo não habilitado'
            : 'Área do avatar Anam em tempo real'
        }
      >
        {/* Sempre no DOM — o SDK Anam exige getElementById(impetus-anam-shared-video) */}
        <video
          id={SHARED_VIDEO_ID}
          className="voice-avatar-external-slot__anam-video"
          autoPlay
          playsInline
          muted={false}
        />
        <audio id="impetus-anam-shared-audio" className="sr-only" aria-hidden tabIndex={-1} />
        {children}
        {showPlaceholder && (
          <span
            className={`voice-avatar-external-slot__placeholder${
              anamModuleDisabled ? ' voice-avatar-external-slot__placeholder--disabled' : ''
            }`}
            aria-hidden="true"
          >
            {anamModuleDisabled ? (
              <>
                <span className="voice-avatar-external-slot__placeholder-title">ANAM</span>
                <span className="voice-avatar-external-slot__placeholder-sub">{anamDisabledLabel}</span>
              </>
            ) : anamStatus === 'connecting' ? (
              'A ligar Anam…'
            ) : anamStatus === 'unconfigured' ? (
              'Anam — falta API key'
            ) : anamStatus === 'error' ? (
              'Anam — erro'
            ) : (
              'Avatar Anam'
            )}
          </span>
        )}
      </div>
    </div>
  );
}
