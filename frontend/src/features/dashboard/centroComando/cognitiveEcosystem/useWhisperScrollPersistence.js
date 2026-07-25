import { useEffect, useState } from 'react';

/**
 * INC-017 — Persistência de scroll da mensagem cognitiva (desktop).
 * Observa a linha de continuidade (não o whisper) para evitar unpin quando
 * o whisper passa a position:fixed e reentra no viewport.
 */
export default function useWhisperScrollPersistence(enabled, elementRef) {
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setPinned(false);
      return undefined;
    }

    const el = elementRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    const observeTarget = el.closest('.cc-cognitive-continuity-row') || el;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const scrolledPast = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setPinned(scrolledPast);
      },
      { root: null, threshold: 0, rootMargin: '0px' }
    );

    observer.observe(observeTarget);
    return () => observer.disconnect();
  }, [enabled, elementRef]);

  return pinned;
}
