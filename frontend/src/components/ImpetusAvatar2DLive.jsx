import React, { useEffect, useMemo, useRef, useState } from 'react';
import './ImpetusAvatar2DLive.css';

const MOUTH_BASE = '/assets/impetus-mouth';
const MOUTH_FRAMES = {
  closed: `${MOUTH_BASE}/mouth-closed.png`,
  mid: `${MOUTH_BASE}/mouth-e.png`,
  open: `${MOUTH_BASE}/mouth-open.png`
};

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export default function ImpetusAvatar2DLive({
  state = 'standby',
  sourceUrl = '/impetus-did-source.jpg',
  videoLipSyncRef = null
}) {
  const rootRef = useRef(null);
  const rafRef = useRef(null);
  const smoothVolumeRef = useRef(0);
  const speechEnergyRef = useRef(0);
  const gazeRef = useRef({ x: 0, y: 0, tx: 0, ty: 0, nextAt: 0 });
  const blinkRef = useRef({ phase: 0, startAt: 0, nextAt: 0 });
  const [mouthFrame, setMouthFrame] = useState('closed');
  const [mouthPngOk, setMouthPngOk] = useState(true);

  const speaking = state === 'speaking';
  const listening = state === 'listening';
  const processing = state === 'processing';

  const motionProfile = useMemo(() => {
    if (speaking) {
      return { blinkMin: 3.0, blinkMax: 6.0, gazeAmp: 0.32, headAmp: 1.08, pulse: 0.52 };
    }
    if (listening) {
      return { blinkMin: 3.0, blinkMax: 6.0, gazeAmp: 0.42, headAmp: 0.9, pulse: 0.62 };
    }
    if (processing) {
      return { blinkMin: 3.0, blinkMax: 6.0, gazeAmp: 0.24, headAmp: 0.78, pulse: 0.92 };
    }
    return { blinkMin: 3.0, blinkMax: 6.0, gazeAmp: 0.35, headAmp: 0.82, pulse: 0.34 };
  }, [listening, processing, speaking]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const startAt = performance.now();
    const mouthBucketRef = { current: 'closed' };

    const tick = (now) => {
      const t = (now - startAt) / 1000;
      const sync = videoLipSyncRef?.current;
      const rawVolume = sync?.drive ? Number(sync?.targetVolume || 0) : 0;

      // Volume smoothing for stable mouth animation.
      smoothVolumeRef.current += (rawVolume - smoothVolumeRef.current) * (speaking ? 0.26 : 0.13);
      if (speaking) {
        const procedural =
          0.14 +
          Math.max(0, Math.sin(t * 10.2)) * 0.13 +
          Math.max(0, Math.sin(t * 16.8 + 0.7)) * 0.1;
        const target = Math.max(smoothVolumeRef.current, procedural);
        speechEnergyRef.current += (target - speechEnergyRef.current) * 0.22;
      } else {
        speechEnergyRef.current += (0 - speechEnergyRef.current) * 0.1;
      }

      // Eyes gaze target (random micro-saccades).
      const g = gazeRef.current;
      if (g.nextAt === 0 || t >= g.nextAt) {
        g.tx = (Math.random() * 2 - 1) * motionProfile.gazeAmp;
        g.ty = (Math.random() * 2 - 1) * motionProfile.gazeAmp * 0.55;
        g.nextAt = t + 0.8 + Math.random() * 1.8;
      }
      g.x += (g.tx - g.x) * 0.06;
      g.y += (g.ty - g.y) * 0.06;

      // Blink FSM.
      const b = blinkRef.current;
      if (b.nextAt === 0) {
        b.nextAt = t + motionProfile.blinkMin + Math.random() * (motionProfile.blinkMax - motionProfile.blinkMin);
      }
      let blink = 0;
      if (b.phase === 0 && t >= b.nextAt) {
        b.phase = 1;
        b.startAt = t;
        b.nextAt = t + motionProfile.blinkMin + Math.random() * (motionProfile.blinkMax - motionProfile.blinkMin);
      } else if (b.phase === 1) {
        const u = (t - b.startAt) / 0.12;
        if (u >= 1) {
          b.phase = 0;
        } else {
          blink = Math.sin(Math.PI * u);
        }
      }

      const breathe = Math.sin(t * 1.15) * 0.011;
      const headX = Math.sin(t * 0.9) * 1.05 * motionProfile.headAmp;
      const headY = Math.sin(t * 0.72 + 0.8) * 1.45 * motionProfile.headAmp;
      const sway = Math.sin(t * 0.45) * 1.35;
      const pulse = (0.5 + 0.5 * Math.sin(t * (processing ? 2.5 : 1.4))) * motionProfile.pulse;
      const speakMix = speaking ? clamp(Math.max(smoothVolumeRef.current, speechEnergyRef.current), 0, 1) : 0;

      root.style.setProperty('--ia-breathe', String(breathe));
      root.style.setProperty('--ia-head-x', `${headX + sway}px`);
      root.style.setProperty('--ia-head-y', `${headY}px`);
      root.style.setProperty('--ia-gaze-x', `${g.x * 3.8}px`);
      root.style.setProperty('--ia-gaze-y', `${g.y * 2.8}px`);
      root.style.setProperty('--ia-blink', String(blink));
      root.style.setProperty('--ia-pulse', String(pulse));
      root.style.setProperty('--ia-speak', String(speakMix));

      const nextBucket = speakMix > 0.38 ? 'open' : speakMix > 0.18 ? 'mid' : 'closed';
      if (mouthBucketRef.current !== nextBucket) {
        mouthBucketRef.current = nextBucket;
        setMouthFrame(nextBucket);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [motionProfile, processing, speaking, videoLipSyncRef]);

  return (
    <div ref={rootRef} className={`impetus-2d-avatar impetus-2d-avatar--${state}`}>
      <div className="impetus-2d-avatar__layer impetus-2d-avatar__layer--base">
        <img className="impetus-2d-avatar__img" src={sourceUrl} alt="Avatar Impetus IA" draggable="false" />
      </div>
      <div className="impetus-2d-avatar__blink-mask" aria-hidden="true">
        <span className="impetus-2d-avatar__blink-lid impetus-2d-avatar__blink-lid--top" />
        <span className="impetus-2d-avatar__blink-lid impetus-2d-avatar__blink-lid--bottom" />
      </div>
      <div className="impetus-2d-avatar__eyes" aria-hidden="true">
        <span className="impetus-2d-avatar__eye impetus-2d-avatar__eye--left" />
        <span className="impetus-2d-avatar__eye impetus-2d-avatar__eye--right" />
      </div>
      {mouthPngOk ? (
        <img
          className={`impetus-2d-avatar__mouth impetus-2d-avatar__mouth--${mouthFrame}`}
          src={MOUTH_FRAMES[mouthFrame]}
          alt=""
          aria-hidden="true"
          draggable="false"
          onError={() => setMouthPngOk(false)}
        />
      ) : null}
      <span className="impetus-2d-avatar__mouth-fallback" aria-hidden="true" />
      <div className="impetus-2d-avatar__fx" aria-hidden="true" />
    </div>
  );
}

