/**
 * Avatar live da Impetus — modo voz (overlay do /app/chatbot e rotas com voz).
 * 1) Preferência: MP4 em src/assets/impetus-video/ (entram no build → funcionam na :3000 / CDN).
 * 2) Fallback: /impetus-*.mp4 na raiz (pasta public/ ou nginx).
 * 3) Se o idle falhar: PNG + boca em /assets/impetus-mouth/.
 */
import React, { useState, useCallback, useId, useRef, useEffect, useMemo } from 'react';
import impetusIaAvatar from '../assets/impetus-ia-avatar.png';
import './ImpetusAvatarLive.css';

const bundledVideoUrls = import.meta.glob('../assets/impetus-video/*.mp4', {
  eager: true,
  query: '?url',
  import: 'default'
});

const MOUTH_BASE = '/assets/impetus-mouth';
const MOUTH_MAP = {
  closed: `${MOUTH_BASE}/mouth-closed.png`,
  open: `${MOUTH_BASE}/mouth-open.png`,
  o: `${MOUTH_BASE}/mouth-o.png`,
  e: `${MOUTH_BASE}/mouth-e.png`
};

const CLIP_TO_FILENAME = {
  idle: 'impetus-idle.mp4',
  thinking: 'impetus-thinking.mp4',
  attention: 'impetus-attention.mp4',
  speaking: 'impetus-speaking.mp4'
};

function resolveVideoSrc(clipKey) {
  const fileName = CLIP_TO_FILENAME[clipKey];
  if (!fileName) return `/impetus-${clipKey}.mp4`;
  const hit = Object.entries(bundledVideoUrls).find(([path]) => path.endsWith(fileName));
  if (hit) return hit[1];
  return `/${fileName}`;
}

const STATE_TO_CLIP = {
  standby: 'idle',
  listening: 'attention',
  speaking: 'speaking',
  processing: 'thinking'
};

/** Clipes usados pelos estados do overlay (idle/left/right ficam só no HTML estático se quiser). */
const CLIP_ORDER = ['idle', 'thinking', 'attention', 'speaking'];

/**
 * Mesmo “rumo” do rosto no vídeo: rotação fina (graus). Ajuste se a cabeça parecer em 3/4.
 * Boca = mesmos PNGs e posição que `.impetus-avatar__mouth` (cópia do asset oficial).
 */
const REALTIME_LIP_ROTATE_DEG = -5;

/**
 * Lip sync Realtime: mesma arte que o avatar PNG (mouth-closed / mouth-open) + escala vertical.
 * Fallback: SVG igual ao `impetus-avatar__mouth-fallback` se os PNGs falharem.
 */
function RealtimeLipSyncMouth({ getAnalyser, mouthGradId }) {
  const filterId = `impLipGlow-${useId().replace(/:/g, '')}`;
  const [lipT, setLipT] = useState(0);
  const [pngOk, setPngOk] = useState(true);
  const lipValRef = useRef(0);
  const rafRef = useRef(0);
  const dataRef = useRef(new Uint8Array(128));
  const onPngError = useCallback(() => setPngOk(false), []);

  useEffect(() => {
    const tick = () => {
      const an = typeof getAnalyser === 'function' ? getAnalyser() : null;
      let target = 0;
      if (an?.frequencyBinCount) {
        const need = an.frequencyBinCount;
        if (dataRef.current.length !== need) {
          dataRef.current = new Uint8Array(need);
        }
        const data = dataRef.current;
        an.getByteFrequencyData(data);
        const n = Math.min(32, data.length);
        let sum = 0;
        for (let i = 0; i < n; i++) sum += data[i];
        target = n ? sum / n / 255 : 0;
      }
      lipValRef.current += (target - lipValRef.current) * 0.3;
      if (lipValRef.current < 1e-4) lipValRef.current = 0;
      setLipT(lipValRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [getAnalyser]);

  const t = lipT;
  const scaleY = 1 + t * 0.28;
  const openOpacity = Math.min(1, Math.max(0, (t - 0.12) / 0.62));

  return (
    <div
      className="impetus-avatar__lipsync-mouth"
      style={{
        transform: `translate(-50%, -50%) rotate(${REALTIME_LIP_ROTATE_DEG}deg) scale(1, ${scaleY})`
      }}
      aria-hidden="true"
    >
      {pngOk ? (
        <div className="impetus-avatar__lipsync-mouth__stack">
          <img
            className="impetus-avatar__lipsync-mouth__img"
            src={MOUTH_MAP.closed}
            alt=""
            draggable={false}
            onError={onPngError}
          />
          <img
            className="impetus-avatar__lipsync-mouth__img impetus-avatar__lipsync-mouth__img--open"
            src={MOUTH_MAP.open}
            alt=""
            draggable={false}
            style={{ opacity: openOpacity }}
          />
        </div>
      ) : (
        <svg className="impetus-avatar__lipsync-mouth__fallback" viewBox="0 0 100 24" aria-hidden="true">
          <defs>
            <linearGradient id={mouthGradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(80,180,255,0.25)" />
              <stop offset="50%" stopColor="rgba(140,220,255,0.85)" />
              <stop offset="100%" stopColor="rgba(80,180,255,0.25)" />
            </linearGradient>
            <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="impLipBlur" />
              <feMerge>
                <feMergeNode in="impLipBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g
            filter={`url(#${filterId})`}
            transform={`translate(50 12) scale(1 ${1 + t * 0.55}) translate(-50 -12)`}
          >
            <path
              fill="none"
              stroke={`url(#${mouthGradId})`}
              strokeWidth="3"
              strokeLinecap="round"
              d="M 18 12 Q 50 12 82 12"
            />
          </g>
        </svg>
      )}
    </div>
  );
}

function LegacyAvatarFace({ mouthState, mouthGradId, mouthPngOk, onMouthError }) {
  const mouthSrc = MOUTH_MAP[mouthState] || MOUTH_MAP.closed;
  return (
    <>
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
    </>
  );
}

export default function ImpetusAvatarLive({
  state = 'standby',
  mouthState = 'closed',
  size = 240,
  realtimeLipSync = false,
  getRealtimePlaybackAnalyser
}) {
  const [mouthPngOk, setMouthPngOk] = useState(true);
  const [videoBroken, setVideoBroken] = useState(false);
  const onMouthError = useCallback(() => setMouthPngOk(false), []);
  const mouthGradId = `impMouthGrad-${useId().replace(/:/g, '')}`;
  const videoRefs = useRef({});

  const activeClip = STATE_TO_CLIP[state] || 'idle';

  const videoSrcByKey = useMemo(() => {
    const o = {};
    CLIP_ORDER.forEach((k) => {
      o[k] = resolveVideoSrc(k);
    });
    return o;
  }, []);

  useEffect(() => {
    if (videoBroken) return;
    CLIP_ORDER.forEach((key) => {
      const el = videoRefs.current[key];
      if (!el) return;
      if (key === activeClip) {
        el.play().catch(() => {});
      } else {
        try {
          el.pause();
        } catch (_) {}
      }
    });
  }, [activeClip, videoBroken]);

  const onIdleVideoError = useCallback(() => {
    setVideoBroken(true);
  }, []);

  return (
    <div
      className={`impetus-avatar-shell impetus-avatar-shell--${state === 'processing' ? 'processing' : state}`}
      style={{ width: size, height: size }}
    >
      <div className={`impetus-avatar impetus-avatar--${state} ${!videoBroken ? 'impetus-avatar--has-video' : ''}`}>
        <div className="impetus-avatar__face">
          {!videoBroken ? (
            <>
              <div className="impetus-avatar__video-stack" aria-hidden="true">
                {CLIP_ORDER.map((key) => (
                  <video
                    key={key}
                    ref={(el) => {
                      if (el) videoRefs.current[key] = el;
                    }}
                    className={`impetus-avatar__vid ${key === activeClip ? 'impetus-avatar__vid--active' : ''}`}
                    src={videoSrcByKey[key]}
                    muted
                    playsInline
                    loop
                    preload="auto"
                    onError={key === 'idle' ? onIdleVideoError : undefined}
                  />
                ))}
              </div>
              {realtimeLipSync && typeof getRealtimePlaybackAnalyser === 'function' ? (
                <RealtimeLipSyncMouth
                  getAnalyser={getRealtimePlaybackAnalyser}
                  mouthGradId={mouthGradId}
                />
              ) : null}
            </>
          ) : (
            <LegacyAvatarFace
              mouthState={mouthState}
              mouthGradId={mouthGradId}
              mouthPngOk={mouthPngOk}
              onMouthError={onMouthError}
            />
          )}
        </div>
        <div className="impetus-avatar__glow" />
      </div>
    </div>
  );
}
