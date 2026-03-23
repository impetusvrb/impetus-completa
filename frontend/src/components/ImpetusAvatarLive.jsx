/**
 * Avatar live da Impetus — modo voz (overlay /app/chatbot).
 * Vídeos em /videos/ ou assets; clipe hero opcional (VITE_AVATAR_HERO_SPEAKING_VIDEO) na fala + lipsync por volume.
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
const SPEAKING_VIDEO = `${VIDEOS_BASE}speaking.mp4`;

const HERO_FLAG = String(import.meta.env.VITE_AVATAR_HERO_SPEAKING_VIDEO ?? '')
  .trim()
  .toLowerCase();
const heroSpeakingEnvOn = HERO_FLAG === 'true' || HERO_FLAG === '1';
const HERO_SPEAKING_SRC =
  String(import.meta.env.VITE_AVATAR_HERO_SPEAKING_SRC ?? '').trim() || `${VIDEOS_BASE}hero-speaking.mp4`;

/** Ouvindo o utilizador (ex.: piscar natural) — URL em /videos/ ou absoluto. */
const LISTEN_VIDEO = String(import.meta.env.VITE_AVATAR_LISTEN_VIDEO ?? '').trim();
/** A processar resposta (analise) — vídeo até o modelo / D-ID responder. */
const ANALYZE_VIDEO = String(import.meta.env.VITE_AVATAR_ANALYZE_VIDEO ?? '').trim();

const SPEED_MIN = 0.15;
const SPEED_IDLE = 0.42;
const SPEED_MAX = 1.85;
const LERP_SPEED = 0.12;
const VOLUME_SCALE = 3.1;

const IDLE_POOL_NINE = [
  `${VIDEOS_BASE}idle-subtle.mp4`,
  `${VIDEOS_BASE}idle-eyes-left.mp4`,
  `${VIDEOS_BASE}idle-breathing.mp4`,
  `${VIDEOS_BASE}idle-head-turn.mp4`,
  `${VIDEOS_BASE}idle-head-turn2.mp4`,
  `${VIDEOS_BASE}idle-alive.mp4`
];

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
  if (clipKey === 'thinking') {
    return ANALYZE_VIDEO || `${VIDEOS_BASE}idle-subtle.mp4`;
  }
  if (clipKey === 'attention') {
    return LISTEN_VIDEO || `${VIDEOS_BASE}idle-eyes-left.mp4`;
  }
  if (clipKey === 'speaking') return SPEAKING_VIDEO;
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
  /** Modo overlay de voz: ativa clipe hero + lipsync quando configurado. */
  immersiveVoice = false,
  /** { targetVolume, drive } — Realtime (PCM) ou TTS (analisador). */
  videoLipSyncRef = null,
  /** URL MP4 retornada pela D-ID (via backend); exibida por cima dos clipes locais. */
  didVideoUrl = null,
  /** D-ID após Realtime: URL chega com estado “listening” — manter camada visível até novo turno. */
  didReplayOverlay = false,
  /** Realtime: não usar hero/speaking como boca; idle até haver didVideoUrl (ex. D-ID). */
  didPrimarySpeaking = false
}) {
  const [mouthPngOk, setMouthPngOk] = useState(true);
  const [videoBroken, setVideoBroken] = useState(false);
  const [heroSpeakingFailed, setHeroSpeakingFailed] = useState(false);
  /** Só esconder vídeos locais quando o MP4 D-ID já tem frames (evita círculo preto). */
  const [didMediaReady, setDidMediaReady] = useState(false);
  const onMouthError = useCallback(() => setMouthPngOk(false), []);
  const mouthGradId = `impMouthGrad-${useId().replace(/:/g, '')}`;
  const videoRefs = useRef({});
  const [idlePoolIdx, setIdlePoolIdx] = useState(() => pickNextIdleIndex(-1));
  /** URLs custom ouvir/analisar falharam (404/codec): volta aos clipes em /videos/ para não ficar rosto preto. */
  const [attentionSrcBroken, setAttentionSrcBroken] = useState(false);
  const [thinkingSrcBroken, setThinkingSrcBroken] = useState(false);

  const rawClipFromState = STATE_TO_CLIP[state] || 'idle';
  const activeClip =
    didPrimarySpeaking && state === 'speaking' && !didVideoUrl
      ? 'idle'
      : rawClipFromState;
  const activeClipRef = useRef(activeClip);
  useEffect(() => {
    activeClipRef.current = activeClip;
  }, [activeClip]);

  const useHeroSpeakingClip =
    !didPrimarySpeaking && heroSpeakingEnvOn && immersiveVoice && !heroSpeakingFailed;

  const videoSrcByKey = useMemo(() => {
    const speakingSrc = useHeroSpeakingClip ? HERO_SPEAKING_SRC : null;
    if (useNineVideos) {
      return {
        idle: IDLE_POOL_NINE[idlePoolIdx],
        thinking: thinkingSrcBroken
          ? `${VIDEOS_BASE}idle-subtle.mp4`
          : nineVideoSrcForClip('thinking'),
        attention: attentionSrcBroken
          ? `${VIDEOS_BASE}idle-eyes-left.mp4`
          : nineVideoSrcForClip('attention'),
        speaking: speakingSrc || nineVideoSrcForClip('speaking')
      };
    }
    const o = {};
    CLIP_ORDER.forEach((k) => {
      if (k === 'speaking' && speakingSrc) o[k] = speakingSrc;
      else if (k === 'attention') {
        o[k] = LISTEN_VIDEO && !attentionSrcBroken ? LISTEN_VIDEO : resolveVideoSrc('attention');
      } else if (k === 'thinking') {
        o[k] = ANALYZE_VIDEO && !thinkingSrcBroken ? ANALYZE_VIDEO : resolveVideoSrc('thinking');
      } else o[k] = resolveVideoSrc(k);
    });
    return o;
  }, [
    useNineVideos,
    idlePoolIdx,
    useHeroSpeakingClip,
    attentionSrcBroken,
    thinkingSrcBroken
  ]);

  const onIdleClipEnded = useCallback(() => {
    if (!useNineVideos) return;
    if (activeClip !== 'idle') return;
    setIdlePoolIdx((prev) => pickNextIdleIndex(prev));
  }, [useNineVideos, activeClip]);

  useEffect(() => {
    if (!immersiveVoice) {
      setHeroSpeakingFailed(false);
      setAttentionSrcBroken(false);
      setThinkingSrcBroken(false);
    }
  }, [immersiveVoice]);

  /** D-ID: durante fala (TTS/Realtime) ou replay pós-resposta (URL chegou em “listening”). */
  const didLayerActive =
    Boolean(didVideoUrl) && (state === 'speaking' || didReplayOverlay);

  useEffect(() => {
    setDidMediaReady(false);
  }, [didVideoUrl]);

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
  }, [activeClip, videoBroken, videoSrcByKey]);

  /** playbackRate do clipe de fala ~ energia da voz (Realtime ou TTS). */
  useEffect(() => {
    if (videoBroken || !videoLipSyncRef || activeClip !== 'speaking') {
      const el = videoRefs.current.speaking;
      if (el) el.playbackRate = 1;
      return;
    }
    const syncRef = videoLipSyncRef;
    let rafId = null;
    let smooth = 0;

    const tick = () => {
      const video = videoRefs.current.speaking;
      const { targetVolume, drive } = syncRef.current;
      const goal = drive ? targetVolume : 0;
      smooth += (goal - smooth) * LERP_SPEED;
      const curve = Math.pow(Math.max(0, smooth), 0.68);
      const speed =
        SPEED_IDLE + curve * (SPEED_MAX - SPEED_IDLE) * VOLUME_SCALE * 0.38;
      if (video) {
        video.playbackRate = Math.min(SPEED_MAX, Math.max(SPEED_MIN, speed));
      }
      if (drive || smooth > 0.01) {
        rafId = requestAnimationFrame(tick);
      } else {
        if (video) video.playbackRate = 1;
        rafId = null;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      const el = videoRefs.current.speaking;
      if (el) el.playbackRate = 1;
    };
  }, [activeClip, videoBroken, videoLipSyncRef]);

  const onSpeakingVideoError = useCallback(() => {
    if (useHeroSpeakingClip) setHeroSpeakingFailed(true);
  }, [useHeroSpeakingClip]);

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
            <div
              className={`impetus-avatar__video-stack${
                didMediaReady && didLayerActive ? ' impetus-avatar__video-stack--under-did' : ''
              }`}
              aria-hidden="true"
            >
              {CLIP_ORDER.map((key) => (
                <video
                  key={useNineVideos && key === 'idle' ? `${key}-${idlePoolIdx}` : key}
                  ref={(el) => {
                    if (el) videoRefs.current[key] = el;
                    else delete videoRefs.current[key];
                  }}
                  className={`impetus-avatar__vid ${key === activeClip ? 'impetus-avatar__vid--active' : ''}`}
                  src={videoSrcByKey[key]}
                  muted
                  playsInline
                  loop={!(useNineVideos && key === 'idle')}
                  preload="auto"
                  onCanPlay={(e) => {
                    const el = e.currentTarget;
                    if (videoRefs.current[key] !== el || key !== activeClipRef.current || videoBroken) return;
                    el.play().catch(() => {});
                  }}
                  onEnded={useNineVideos && key === 'idle' ? onIdleClipEnded : undefined}
                  onError={
                    key === 'idle'
                      ? onIdleVideoError
                      : key === 'speaking'
                        ? onSpeakingVideoError
                        : key === 'attention'
                          ? () => setAttentionSrcBroken(true)
                          : key === 'thinking'
                            ? () => setThinkingSrcBroken(true)
                            : undefined
                  }
                />
              ))}
              {didVideoUrl ? (
                <video
                  key={didVideoUrl}
                  className={`impetus-avatar__did${
                    didMediaReady && didLayerActive ? ' impetus-avatar__did--visible' : ''
                  }`}
                  src={didVideoUrl}
                  muted
                  playsInline
                  loop
                  autoPlay
                  preload="auto"
                  onLoadedData={(e) => {
                    setDidMediaReady(true);
                    e.currentTarget.play().catch(() => {});
                  }}
                  onPlaying={() => setDidMediaReady(true)}
                  onError={() => setDidMediaReady(false)}
                />
              ) : null}
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
