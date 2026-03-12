/**
 * useVoiceInput - Speech to Text via Web Speech API
 * Permite o usuário falar e o texto é inserido automaticamente
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export function useVoiceInput({ onResult, onError, lang = 'pt-BR' }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.onresult = (e) => {
      const last = e.results.length - 1;
      const text = e.results[last][0].transcript;
      if (e.results[last].isFinal && text.trim()) {
        onResult?.(text.trim());
      }
    };
    recognition.onerror = (e) => {
      if (e.error !== 'aborted') onError?.(e.error);
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => {
      try { recognition.abort(); } catch (_) {}
    };
  }, [lang, onResult, onError]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) {
      onError?.(e.message);
    }
  }, [isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
      setIsListening(false);
    }
  }, [isListening]);

  return { isListening, isSupported, startListening, stopListening };
}
