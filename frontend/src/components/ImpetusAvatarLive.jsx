/**
 * Avatar live da Impetus (Nível B):
 * - Face base + boca (4 estados) via troca de imagens
 * - Glow/estado (standby/listening/speaking)
 *
 * Observação: as imagens da boca são servidas via public:
 * /assets/impetus-mouth/mouth-*.png
 */
import React from 'react';
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
  return (
    <div className={`impetus-avatar impetus-avatar--${state}`} style={{ width: size, height: size }}>
      <div className="impetus-avatar__face">
        <img className="impetus-avatar__img" src={impetusIaAvatar} alt="Impetus" />
        <img
          className={`impetus-avatar__mouth impetus-avatar__mouth--${mouthState}`}
          src={mouthSrc}
          alt=""
          aria-hidden="true"
          draggable="false"
          onError={(e) => {
            // Se assets não existirem, não quebra o overlay.
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <div className="impetus-avatar__glow" />
    </div>
  );
}

