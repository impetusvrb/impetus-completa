/**
 * useVoiceOutput - TTS via backend (OpenAI) com fallback para Web Speech
 * IA fala apenas quando o modo voz está ativo (botão "Ativar voz").
 */
import { useCallback, useRef, useState } from 'react';
import { dashboard } from '../services/api';

function tocarAudio(base64, onStart, onEnd) {
  if (!base64) return;
  const audio = new Audio('data:audio/mp3;base64,' + base64);
  audio.onplay = () => onStart?.();
  audio.onended = () => onEnd?.();
  audio.onerror = () => onEnd?.();
  audio.play().catch(() => onEnd?.());
  return audio;
}

export function useVoiceOutput({ lang = 'pt-BR', rate = 1, pitch = 1 } = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  const speakWithFallback = useCallback((text) => {
    if (!text || typeof text !== 'string') return;
    const t = text.trim().slice(0, 5000);
    if (!t) return;

    const fallback = () => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = lang;
      u.rate = rate;
      u.pitch = pitch;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    };

    dashboard
      .gerarVoz(t, true)
      .then((r) => {
        if (r?.data?.ok && r?.data?.audio) {
          audioRef.current = tocarAudio(r.data.audio, () => setIsSpeaking(true), () => setIsSpeaking(false));
        } else {
          fallback();
        }
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn('[Voz] Backend falhou, usando fallback:', err?.response?.status ?? err?.message);
        fallback();
      });
  }, [lang, rate, pitch]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (_) {}
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak: speakWithFallback, stop, isSpeaking };
}
