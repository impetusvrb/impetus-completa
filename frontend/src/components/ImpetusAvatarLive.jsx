/**
 * Avatar live da Impetus — modo voz (overlay /app/chatbot).
 * Vídeos em /videos/; em Realtime um único clipe com boca + playbackRate ligado ao volume PCM (sem canvas).
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

const NINE_VIDEOS_FLAG = String(import.meta.env.VITE_AVATAR_NINE_VIDEOS ?? '')
  .trim()
  .toLowerCase();
const useNineVideos =
  NINE_VIDEOS_FLAG === 'true' ||
  NINE_VIDEOS_FLAG === '1' ||
  (import.meta.env.PROD && NINE_VIDEOS_FLAG !== 'false' && NINE_VIDEOS_FLAG !== '0');

const VIDEOS_BASE = '/videos/';
/** Vídeo com movimento de boca — sync por playbackRate no Realtime */
const SPEAKING_MOUTH_VIDEO = `${VIDEOS_BASE}speaking.mp4`;

const IDLE_POOL_NINE = [
  `${VIDEOS_BASE}idle-subtle.mp4`,
  `${VIDEOS_BASE}idle-eyes-left.mp4`,
  `${VIDEOS_BASE}idle-breathing.mp4`,
  `${VIDEOS_BASE}idle-head-turn.mp4`,
  `${VIDEOS_BASE}idle-head-turn2.mp4`,
  `${VIDEOS_BASE}idle-alive.mp4`
];

const SPEED_MIN = 0.15;
const SPEED_IDLE = 0.4;
const SPEED_MAX = 1.8;
const LERP_SPEED = 0.1;
const VOLUME_SCALE = 3.2;

function pickNextIdleIndex(prev) {
  const n = IDLE_POOL_NINE.length;
  if (n <= 1) return 0;
  let next;
  let guard = 0;
  do {
    next = Math.floor(Math.random() * n);
    guard++;
  } while (next === prev && guard < 32);
  return next;
}

function resolveVideoSrc(clipKey) {
  const fileName = CLIP_TO_FILENAME[clipKey];
  if (!fileName) return `/impetus-${clipKey}.mp4`;
  const hit = Object.entries(bundledVideoUrls).find(([path]) => path.endsWith(fileName));
  if (hit) return hit[1];
  return `/${fileName}`;
}

function nineVideoSrcForClip(clipKey) {
  if (clipKey === 'thinking') return `${VIDEOS_BASE}idle-subtle.mp4`;
  if (clipKey === 'attention') return `${VIDEOS_BASE}idle-eyes-left.mp4`;
  if (clipKey === 'speaking') return SPEAKING_MOUTH_VIDEO;
  return IDLE_POOL_NINE[0];
}

const STATE_TO_CLIP = {
  standby: 'idle',
  listening: 'attention',
  speaking: 'speaking',
  processing: 'thinking'
};

const CLIP_ORDER = ['idle', 'thinking', 'attention', 'speaking'];

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
  /** Ref mutável { targetVolume, drive } — volume PCM Realtime (useVoiceEngine). */
  videoLipSyncRef = null,
  convoBlinkVideo = false
}) {
  const [mouthPngOk, setMouthPngOk] = useState(true);
  const [videoBroken, setVideoBroken] = useState(false);
  const onMouthError = useCallback(() => setMouthPngOk(false), []);
  const mouthGradId = `impMouthGrad-${useId().replace(/:/g, '')}`;
  const videoRefs = useRef({});
  const convoVideoRef = useRef(null);
  const [idlePoolIdx, setIdlePoolIdx] = useState(() => pickNextIdleIndex(-1));

  const activeClip = STATE_TO_CLIP[state] || 'idle';
  const useConvoSpeaking = useNineVideos && convoBlinkVideo && !videoBroken;

  const videoSrcByKey = useMemo(() => {
    if (useNineVideos) {
      return {
        idle: IDLE_POOL_NINE[idlePoolIdx],
        thinking: nineVideoSrcForClip('thinking'),
        attention: nineVideoSrcForClip('attention'),
        speaking: nineVideoSrcForClip('speaking')
      };
    }
    const o = {};
    CLIP_ORDER.forEach((k) => {
      o[k] = resolveVideoSrc(k);
    });
    return o;
  }, [useNineVideos, idlePoolIdx]);

  const onIdleClipEnded = useCallback(() => {
    if (!useNineVideos) return;
    if (activeClip !== 'idle') return;
    setIdlePoolIdx((prev) => pickNextIdleIndex(prev));
  }, [useNineVideos, activeClip]);

  useEffect(() => {
    if (videoBroken) return;
    if (useConvoSpeaking) return;
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
  }, [activeClip, videoBroken, videoSrcByKey, useConvoSpeaking]);

  useEffect(() => {
    if (!useConvoSpeaking) return;
    const el = convoVideoRef.current;
    if (!el) return;
    const kick = () => {
      el.muted = true;
      el.playsInline = true;
      el.loop = true;
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    };
    kick();
    const onVis = () => {
      if (document.visibilityState === 'visible') kick();
    };
    const onPause = () => {
      if (document.visibilityState === 'visible') kick();
    };
    document.addEventListener('visibilitychange', onVis);
    el.addEventListener('pause', onPause);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      el.removeEventListener('pause', onPause);
    };
  }, [useConvoSpeaking]);

  /** playbackRate ~ volume da fala (igual ideia a avatar-impetus.html). */
  useEffect(() => {
    if (!useConvoSpeaking || !videoLipSyncRef || videoBroken) {
      const v = convoVideoRef.current;
      if (v) v.playbackRate = 1;
      return;
    }
    const syncRef = videoLipSyncRef;
    let rafId = null;
    let smooth = 0;

    const tick = () => {
      const video = convoVideoRef.current;
      const { targetVolume, drive } = syncRef.current;
      const goal = drive ? targetVolume : 0;
      smooth += (goal - smooth) * LERP_SPEED;
      const curve = Math.pow(Math.max(0, smooth), 0.7);
      const speed =
        SPEED_IDLE + curve * (SPEED_MAX - SPEED_IDLE) * VOLUME_SCALE * 0.35;
      if (video) {
        video.playbackRate = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed));
      }
      if (drive || smooth > 0.008) {
        rafId = requestAnimationFrame(tick);
      } else {
        if (video) video.playbackRate = 1;
        rafId = null;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      const v = convoVideoRef.current;
      if (v) v.playbackRate = 1;
    };
  }, [useConvoSpeaking, videoLipSyncRef, videoBroken]);

  const onIdleVideoError = useCallback(() => {
    if (useNineVideos) {
      setIdlePoolIdx((prev) => pickNextIdleIndex(prev));
      return;
    }
    setVideoBroken(true);
  }, [useNineVideos]);

  return (
    <div
      className={`impetus-avatar-shell impetus-avatar-shell--${state === 'processing' ? 'processing' : state}`}
      style={{ width: size, height: size }}
    >
      <div className={`impetus-avatar impetus-avatar--${state} ${!videoBroken ? 'impetus-avatar--has-video' : ''}`}>
        <div className="impetus-avatar__face">
          {!videoBroken ? (
            <div className="impetus-avatar__video-stack" aria-hidden="true">
              {useConvoSpeaking ? (
                <video
                  ref={convoVideoRef}
                  className="impetus-avatar__vid impetus-avatar__vid--active"
                  src={SPEAKING_MOUTH_VIDEO}
                  muted
                  playsInline
                  loop
                  autoPlay
                  preload="auto"
                  onLoadedData={(e) => {
                    const v = e.currentTarget;
                    v.play().catch(() => {});
                  }}
                  onError={() => setVideoBroken(true)}
                />
              ) : (
                CLIP_ORDER.map((key) => (
                  <video
                    key={useNineVideos && key === 'idle' ? `${key}-${idlePoolIdx}` : key}
                    ref={(el) => {
                      if (el) videoRefs.current[key] = el;
                    }}
                    className={`impetus-avatar__vid ${key === activeClip ? 'impetus-avatar__vid--active' : ''}`}
                    src={videoSrcByKey[key]}
                    muted
                    playsInline
                    loop={!(useNineVideos && key === 'idle')}
                    preload="auto"
                    onEnded={useNineVideos && key === 'idle' ? onIdleClipEnded : undefined}
                    onError={key === 'idle' ? onIdleVideoError : undefined}
                  />
                ))
              )}
            </div>
          ) : null}
          {videoBroken ? (
            <LegacyAvatarFace
              mouthState={mouthState}
              mouthGradId={mouthGradId}
              mouthPngOk={mouthPngOk}
              onMouthError={onMouthError}
            />
          ) : null}
        </div>
        <div className="impetus-avatar__glow" />
      </div>
    </div>
  );
}
