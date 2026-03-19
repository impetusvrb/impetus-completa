/**
 * IMPETUS - Hook para Web Speech API (reconhecimento de voz)
 * Pesquisa por voz no ManuIA e em campos de busca
 */
import { useState, useCallback, useEffect, useRef } from 'react';

const isSupported = () =>
  typeof window !== 'undefined' &&
  ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

export default function useSpeechRecognition(options = {}) {
  const {
    lang = 'pt-BR',
    continuous = false,
    interimResults = false,
    onResult,
    onError
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [supported] = useState(isSupported());
  const recognitionRef = useRef(null);

  const start = useCallback(() => {
    if (!supported) {
      setError('Reconhecimento de voz não suportado neste navegador');
      return;
    }
    try {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript('');
      };
      recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const text = event.results[last][0].transcript;
        const isFinal = event.results[last].isFinal;
        setTranscript(text);
        if (isFinal && onResult) onResult(text);
      };
      recognition.onerror = (e) => {
        if (e.error === 'no-speech') return; // Silenciar "no-speech"
        setError(e.error === 'not-allowed' ? 'Microfone negado' : e.error);
        onError?.(e);
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError(err?.message || 'Erro ao iniciar microfone');
    }
  }, [supported, lang, continuous, interimResults, onResult, onError]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (_) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  return { isListening, transcript, error, supported, start, stop };
}
