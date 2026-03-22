/**
 * Avatar live da Impetus — modo voz.
 * Boca: PNGs em /assets/impetus-mouth/; se não houver arquivos, usa fallback SVG discreto (sempre anima).
 */
import React, { useState, useCallback, useId } from 'react';
import impetusIaAvatar from '../assets/impetus-ia-avatar.png';
import './ImpetusAvatarLive.css';

const MOUTH_BASE = '/assets/impetus-mouth';
const MOUTH_MAP = {
  closed: `${MOUTH_BASE}/mouth-closed.png`,
  open: `${MOUTH_BASE}/mouth-open.png`,
  o: `${MOUTH_BASE}/mouth-o.png`,
  e: `${MOUTH_BASE}/mouth-e.png`
};

export default function ImpetusAvatarLive({ state = 'standby', mouthState = 'closed', size = 240 }) {
  const mouthSrc = MOUTH_MAP[mouthState] || MOUTH_MAP.closed;
  const [mouthPngOk, setMouthPngOk] = useState(true);
  const onMouthError = useCallback(() => setMouthPngOk(false), []);
  const mouthGradId = `impMouthGrad-${useId().replace(/:/g, '')}`;

  return (
    <div
      className={`impetus-avatar-shell impetus-avatar-shell--${state}`}
      style={{ width: size, height: size }}
    >
      <div className={`impetus-avatar impetus-avatar--${state}`}>
        <div className="impetus-avatar__face">
          <img className="impetus-avatar__img" src={impetusIaAvatar} alt="Impetus" />
          <div className="impetus-avatar__scan" aria-hidden="true" />
          {mouthPngOk ? (
            <img
              className={`impetus-avatar__mouth impetus-avatar__mouth--${mouthState}`}
              src={mouthSrc}
              alt=""
              aria-hidden="true"
              draggable="false"
              onError={onMouthError}
            />
          ) : (
            <svg
              className="impetus-avatar__mouth-fallback"
              viewBox="0 0 100 24"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={mouthGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(80,180,255,0.25)" />
                  <stop offset="50%" stopColor="rgba(140,220,255,0.85)" />
                  <stop offset="100%" stopColor="rgba(80,180,255,0.25)" />
                </linearGradient>
              </defs>
              <path
                className="impetus-avatar__mouth-fallback-line"
                fill="none"
                stroke={`url(#${mouthGradId})`}
                strokeWidth="3"
                strokeLinecap="round"
                d="M 18 12 Q 50 12 82 12"
              />
            </svg>
          )}
        </div>
        <div className="impetus-avatar__glow" />
      </div>
    </div>
  );
}
