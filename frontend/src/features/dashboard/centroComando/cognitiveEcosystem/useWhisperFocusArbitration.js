import { useCallback, useEffect, useRef, useState } from 'react';
import {
  isWhisperTarget,
  rectsIntersect,
  resolveWhisperFocusSurface,
} from './whisperFocusUtils';

/**
 * INC-020 — Arbitragem de foco: foreground | yielding | dismissed.
 * Um único caminho pointerdown; whisper clicável; cards reais resolvidos via closest/walk-up.
 */
export default function useWhisperFocusArbitration({ enabled, whisperRef, messageKey }) {
  const [focusMode, setFocusMode] = useState('foreground');
  const focusedSurfaceRef = useRef(null);
  const focusModeRef = useRef('foreground');

  const setMode = useCallback((mode) => {
    focusModeRef.current = mode;
    setFocusMode(mode);
  }, []);

  useEffect(() => {
    if (!enabled) {
      focusedSurfaceRef.current = null;
      setMode('foreground');
    }
  }, [enabled, setMode]);

  useEffect(() => {
    if (!enabled || focusModeRef.current !== 'dismissed') return;
    setMode('foreground');
  }, [enabled, messageKey, setMode]);

  useEffect(() => {
    if (!enabled) return undefined;

    const root = document.querySelector('.cc.cc--premium');
    if (!root) return undefined;

    const onPointerDown = (event) => {
      const whisperEl = whisperRef.current;
      if (!whisperEl?.classList.contains('cog-whispers--scroll-persist')) return;

      const target = event.target;

      if (isWhisperTarget(target)) {
        event.stopPropagation();
        focusedSurfaceRef.current = null;
        setMode('dismissed');
        return;
      }

      const surface = resolveWhisperFocusSurface(target, root);

      if (!surface) {
        if (focusModeRef.current === 'dismissed' || focusModeRef.current === 'yielding') {
          focusedSurfaceRef.current = null;
          setMode('foreground');
        }
        return;
      }

      const intersects = rectsIntersect(
        whisperEl.getBoundingClientRect(),
        surface.getBoundingClientRect()
      );

      if (intersects) {
        focusedSurfaceRef.current = surface;
        setMode('yielding');
        return;
      }

      focusedSurfaceRef.current = null;
      setMode('foreground');
    };

    const onFocusIn = (event) => {
      const whisperEl = whisperRef.current;
      if (!whisperEl?.classList.contains('cog-whispers--scroll-persist')) return;
      if (isWhisperTarget(event.target)) return;

      const surface = resolveWhisperFocusSurface(event.target, root);
      if (!surface) return;

      if (
        rectsIntersect(
          whisperEl.getBoundingClientRect(),
          surface.getBoundingClientRect()
        )
      ) {
        focusedSurfaceRef.current = surface;
        setMode('yielding');
      }
    };

    let raf = 0;
    const onScroll = () => {
      if (focusModeRef.current !== 'yielding' || !focusedSurfaceRef.current) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const surface = focusedSurfaceRef.current;
        const whisperEl = whisperRef.current;
        if (!surface || !whisperEl) {
          focusedSurfaceRef.current = null;
          setMode('foreground');
          return;
        }
        if (
          !rectsIntersect(
            whisperEl.getBoundingClientRect(),
            surface.getBoundingClientRect()
          )
        ) {
          focusedSurfaceRef.current = null;
          setMode('foreground');
        }
      });
    };

    root.addEventListener('pointerdown', onPointerDown, true);
    root.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('scroll', onScroll, true);

    return () => {
      root.removeEventListener('pointerdown', onPointerDown, true);
      root.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('scroll', onScroll, true);
      cancelAnimationFrame(raf);
    };
  }, [enabled, setMode, whisperRef]);

  return focusMode;
}
