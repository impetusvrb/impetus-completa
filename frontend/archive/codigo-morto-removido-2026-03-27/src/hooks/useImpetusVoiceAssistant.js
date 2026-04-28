/**
 * Modo conversa por voz — Impetus IA (/app/chatbot).
 * processUtterance(text) = mesma lógica do chat (ex.: dashboard.chat) + TTS.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useImpetusVoiceAssistant({
  enabled,
  paused = false,
  processUtterance,
  onTurnComplete,
  onError,
  onListeningChange
}) {
  const [isListening, setIsListening] = useState(false);
  const [isWaitingReply, setIsWaitingReply] = useState(false);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const processingRef = useRef(false);
  const audioRef = useRef(null);
  const lastFinalRef = useRef({ text: '', t: 0 });
  const pendingUtteranceRef = useRef('');
  const silenceTimerRef = useRef(null);
  const recognitionRef = useRef(null);
  const processRef = useRef(processUtterance);
  const onCompleteRef = useRef(onTurnComplete);
  const onErrRef = useRef(onError);
  const onListenRef = useRef(onListeningChange);
  const playSeqRef = useRef(0);
  const activeBlobUrlRef = useRef(null);
  const allowBrowserTtsFallback =
    String(import.meta.env.VITE_VOICE_ALLOW_BROWSER_TTS_FALLBACK || '').toLowerCase() === 'true';

  useEffect(() => {
    processRef.current = processUtterance;
  }, [processUtterance]);
  useEffect(() => {
    onCompleteRef.current = onTurnComplete;
  }, [onTurnComplete]);
  useEffect(() => {
    onErrRef.current = onError;
  }, [onError]);
  useEffect(() => {
    onListenRef.current = onListeningChange;
  }, [onListeningChange]);

  const stopPlayback = useCallback(() => {
    playSeqRef.current += 1;
    setIsSpeakingTts(false);
    if (audioRef.current) {
      try {
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (_) {}
      audioRef.current = null;
    }
    if (activeBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(activeBlobUrlRef.current);
      } catch (_) {}
      activeBlobUrlRef.current = null;
    }
    if (allowBrowserTtsFallback) {
      try {
        window.speechSynthesis?.cancel();
      } catch (_) {}
    }
  }, [allowBrowserTtsFallback]);

  const toAudioBlobUrl = useCallback((base64) => {
    const b64 = typeof base64 === 'string' ? base64.replace(/\s+/g, '').trim() : '';
    if (b64.length < 1200 || b64.length % 4 === 1) return null;
    // Evita ruído digital por payload inválido/corrompido.
    if (!/^[A-Za-z0-9+/=]+$/.test(b64)) return null;
    try {
      const raw = atob(b64);
      if (!raw || raw.length < 900) return null;
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      if (blob.size < 900) return null;
      return URL.createObjectURL(blob);
    } catch (_) {
      return null;
    }
  }, []);

  const playReply = useCallback((base64, textFallback) => {
    const seq = ++playSeqRef.current;
    stopPlayback();
    setIsSpeakingTts(true);
    return new Promise((resolve) => {
      const done = () => {
        if (seq !== playSeqRef.current) return resolve();
        setIsSpeakingTts(false);
        if (activeBlobUrlRef.current) {
          try {
            URL.revokeObjectURL(activeBlobUrlRef.current);
          } catch (_) {}
          activeBlobUrlRef.current = null;
        }
        audioRef.current = null;
        resolve();
      };
      const blobUrl = toAudioBlobUrl(base64);
      if (blobUrl) {
        activeBlobUrlRef.current = blobUrl;
        const a = new Audio(blobUrl);
        a.preload = 'auto';
        audioRef.current = a;
        a.onended = done;
        a.onerror = done;
        a.play().catch(() => {
          if (allowBrowserTtsFallback && textFallback && window.speechSynthesis) {
            const u = new SpeechSynthesisUtterance(textFallback.slice(0, 5000));
            u.lang = 'pt-BR';
            u.onend = done;
            u.onerror = done;
            window.speechSynthesis.speak(u);
          } else {
            done();
          }
        });
      } else if (allowBrowserTtsFallback && textFallback && window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(textFallback.slice(0, 5000));
        u.lang = 'pt-BR';
        u.onend = done;
        u.onerror = done;
        window.speechSynthesis.speak(u);
      } else {
        setIsSpeakingTts(false);
        resolve();
      }
    });
  }, [allowBrowserTtsFallback, stopPlayback, toAudioBlobUrl]);

  const sendTurn = useCallback(
    async (text) => {
      const t = String(text || '').trim();
      if (!t || processingRef.current) return;
      if (typeof processRef.current !== 'function') {
        onErrRef.current?.(new Error('processUtterance não configurado'));
        return;
      }
      processingRef.current = true;
      setIsWaitingReply(true);
      try {
        const { assistantText, audioBase64 } = await processRef.current(t);
        const reply = assistantText || 'Sem resposta.';
        onCompleteRef.current?.({ userText: t, assistantText: reply });
        await playReply(audioBase64 || null, reply);
      } catch (e) {
        onErrRef.current?.(e);
        const msg =
          e?.response?.data?.error ||
          e?.message ||
          'Não consegui responder agora.';
        onCompleteRef.current?.({ userText: t, assistantText: msg });
        await playReply(null, msg);
      } finally {
        processingRef.current = false;
        setIsWaitingReply(false);
      }
    },
    [playReply]
  );

  const submitSpokenText = useCallback(
    (text) => {
      return sendTurn(text);
    },
    [sendTurn]
  );

  useEffect(() => {
    if (!enabled) {
      stopPlayback();
      setIsListening(false);
      onListenRef.current?.(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
        recognitionRef.current = null;
      }
      return;
    }

    if (paused) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (_) {}
        recognitionRef.current = null;
      }
      setIsListening(false);
      onListenRef.current?.(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onErrRef.current?.(
        new Error('Reconhecimento de voz indisponível. Use Chrome e HTTPS (ou localhost).')
      );
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    let debounceTimer = null;

    const scheduleSilenceCommit = (text) => {
      const s = String(text || '').trim();
      if (s.length < 2) return;
      pendingUtteranceRef.current = s;
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        silenceTimerRef.current = null;
        const u = pendingUtteranceRef.current.trim();
        pendingUtteranceRef.current = '';
        if (u.length < 2 || processingRef.current) return;
        const now = Date.now();
        if (u === lastFinalRef.current.text && now - lastFinalRef.current.t < 4000) return;
        lastFinalRef.current = { text: u, t: now };
        stopPlayback();
        sendTurn(u);
      }, 1500);
    };

    rec.onstart = () => {
      setIsListening(true);
      onListenRef.current?.(true);
    };
    rec.onend = () => {
      setIsListening(false);
      onListenRef.current?.(false);
      if (enabled && recognitionRef.current === rec) {
        try {
          rec.start();
        } catch (_) {}
      }
    };

    rec.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const tr = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalTranscript += tr;
      }
      const last = event.results[event.results.length - 1];
      const latestInterim = last && !last.isFinal ? String(last[0].transcript || '').trim() : '';
      if (latestInterim && audioRef.current) {
        stopPlayback();
      }
      if (latestInterim) {
        scheduleSilenceCommit(latestInterim);
      }
      if (!finalTranscript.trim()) return;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      pendingUtteranceRef.current = '';
      const clean = finalTranscript.trim();
      if (clean.length < 2) return;
      const now = Date.now();
      if (clean === lastFinalRef.current.text && now - lastFinalRef.current.t < 2500) return;
      lastFinalRef.current = { text: clean, t: now };
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (processingRef.current) return;
        stopPlayback();
        sendTurn(clean);
      }, 450);
    };

    rec.onerror = (ev) => {
      if (ev.error === 'no-speech' || ev.error === 'aborted') return;
      if (ev.error === 'not-allowed') {
        onErrRef.current?.(
          new Error('Microfone bloqueado. Clique de novo no botão de voz e permita o microfone.')
        );
      } else if (ev.error === 'network') {
        onErrRef.current?.(
          new Error('Rede: o reconhecimento de voz do Chrome precisa de internet.')
        );
      }
    };

    recognitionRef.current = rec;
    const t = setTimeout(() => {
      try {
        rec.start();
      } catch (err) {
        onErrRef.current?.(new Error('Não foi possível iniciar o microfone. Tente clicar de novo.'));
      }
    }, 200);

    return () => {
      clearTimeout(t);
      clearTimeout(debounceTimer);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
      pendingUtteranceRef.current = '';
      recognitionRef.current = null;
      try {
        rec.stop();
      } catch (_) {}
      stopPlayback();
      setIsListening(false);
      onListenRef.current?.(false);
    };
  }, [enabled, paused, sendTurn, stopPlayback]);

  const stopPlaybackStable = stopPlayback;

  return {
    stopPlayback: stopPlaybackStable,
    submitSpokenText,
    isVoiceListening: isListening,
    isWaitingVoiceReply: isWaitingReply,
    isSpeakingTts
  };
}
