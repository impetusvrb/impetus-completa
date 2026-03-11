/**
 * useVoiceOutput - Text to Speech via Web Speech Synthesis
 * IA responde por voz
 */
import { useCallback, useRef, useState } from 'react';

export function useVoiceOutput({ lang = 'pt-BR', rate = 1, pitch = 1 }) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef(null);

  const speak = useCallback((text) => {
    if (!text || typeof text !== 'string') return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [lang, rate, pitch]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
}
