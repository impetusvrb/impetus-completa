/**
 * Motor central de voz — STT (Whisper ou Web Speech), TTS OpenAI via WebSocket (streaming) ou HTTP.
 * Interrupção (barge-in): usuário fala → para TTS e volta a ouvir. Proibido: speechSynthesis na resposta principal.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import { WakeWordDetector } from '../services/wakeWordDetector';
import {
  pickThinkingPhrase,
  pickListeningPhrase,
  pickProcessingPhrase,
  pickSpeakingPhrase
} from '../constants/voiceResponses';
import { applyPronunciation } from '../constants/pronunciationMap';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/** Base HTTP do backend (sem /api) para Socket.IO */
function voiceIoBase() {
  let b = import.meta.env.VITE_API_URL || '';
  if (!b || b.startsWith('/')) {
    b = `${typeof window !== 'undefined' ? window.location.origin : ''}${b || '/api'}`;
  }
  return b.replace(/\/api\/?$/, '').replace(/\/$/, '') || '';
}

const STOP_WORDS = /^(parar|para|desligar|sair|stop)\b/i;

/** Só ativação ("Ok, Impetus" / "Ok Impetus" / …) — sem pergunta extra */
function isOnlyActivationPhrase(t) {
  const s = String(t || '')
    .trim()
    .replace(/[.!?…]+$/g, '')
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return false;
  if (/^(ok|oi|olá|ola|hey)\s+impetus$/.test(s)) return true;
  if (/^impetus$/.test(s)) return true;
  return false;
}

/** Alinhado ao backend — frases curtas + pausas naturais entre elas */
function splitIntoSpeechChunks(text) {
  let t = String(text || '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\r\n?/g, '\n')
    // Mantém \n como fronteira de pausa; normaliza apenas espaços/tabs.
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (!t) return [];
  // Divide por fim de frase OU por linha em branco/linha.
  const raw = t
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const chunks = [];
  for (const s of raw) {
    if (s.length <= 130) chunks.push(s);
    else {
      s.split(/,\s+/).forEach((part) => {
        const p = part.trim();
        if (p) chunks.push(p.length > 150 ? `${p.slice(0, 147)}...` : p);
      });
    }
  }
  return chunks.length ? chunks : [t.slice(0, 400)];
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.3;
    o.start();
    o.stop(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close().catch(() => {}), 200);
  } catch (_) {}
}

/**
 * Micro-pausas de cadencia natural entre chunks (sem travar fluxo).
 * Valores curtos para manter conversa fluida.
 */
function lightweightCadencePauseMs(chunkText) {
  const s = String(chunkText || '').trim();
  if (!s) return 50;
  if (/,$/.test(s)) return 70;
  if (/;$/u.test(s)) return 110;
  if (/:$/u.test(s)) return 130;
  if (/[.!?…]$/.test(s)) return 170;
  if (/[—–]$/u.test(s)) return 90;
  return 60;
}

function authHeaders() {
  const token = localStorage.getItem('impetus_token');
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function postTranscribe(blob) {
  const fd = new FormData();
  fd.append('audio', blob, 'voice.webm');
  fd.append('language', 'pt');
  fd.append(
    'prompt',
    'sistema industrial, manutenção, alertas, produção, linha, máquina, Impetus'
  );
  const token = localStorage.getItem('impetus_token');
  const res = await fetch(`${API_BASE}/dashboard/chat/voice/transcribe`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: fd
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Transcrição falhou');
  return (data.transcript || '').trim();
}

async function recordUntilSilence(onRms, shouldStop) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1
    }
  });
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.start(120);

  let silentMs = 0;
  const TH = 0.012;
  const NEED_SILENCE_MS = 1700;
  const TICK = 100;
  const GRACE_MS = 4000;
  const SPEECH_RMS = 0.038;
  let heardSpeech = false;
  const t0 = Date.now();

  return new Promise((resolve) => {
    const iv = setInterval(() => {
      if (shouldStop?.()) {
        clearInterval(iv);
        if (rec.state === 'recording') rec.stop();
        return;
      }
      const elapsed = Date.now() - t0;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      onRms?.(rms);
      if (rms >= SPEECH_RMS) heardSpeech = true;

      if (elapsed < GRACE_MS) {
        silentMs = 0;
      } else if (rms < TH) silentMs += TICK;
      else silentMs = 0;

      if (heardSpeech && silentMs >= NEED_SILENCE_MS && rec.state === 'recording') {
        rec.stop();
      }
      if (!heardSpeech && elapsed >= 18000 && rec.state === 'recording') {
        rec.stop();
      }
      if (elapsed >= 52000 && rec.state === 'recording') {
        rec.stop();
      }
    }, TICK);

    const cleanup = async () => {
      clearInterval(iv);
      stream.getTracks().forEach((t) => t.stop());
      try {
        await ctx.close();
      } catch (_) {}
    };

    rec.onstop = async () => {
      await cleanup();
      const blob = new Blob(chunks, { type: 'webm' });
      resolve(blob.size > 400 ? blob : null);
    };

    setTimeout(() => {
      if (rec.state === 'recording') rec.stop();
    }, 55000);
  });
}

/** Uma tomada curta (navegador encerra após pausa). */
function captureWebSpeech(onPartial, shouldStop) {
  return new Promise((resolve) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      resolve('');
      return;
    }
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = true;
    let finalText = '';
    rec.onresult = (e) => {
      if (shouldStop?.()) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText = (finalText + ' ' + t).trim();
        else onPartial?.(((finalText ? finalText + ' ' : '') + t).trim());
      }
    };
    rec.onend = () => resolve(finalText.trim());
    rec.onerror = () => resolve(finalText.trim());
    try {
      rec.start();
    } catch (_) {
      resolve('');
    }
  });
}

/**
 * Escuta contínua Web Speech: acumula até ~silenceMs sem novo áudio após fala (frases longas / pausas internas).
 */
function captureWebSpeechUntilPause(onPartial, shouldStop, opts = {}) {
  const silenceMs = opts.silenceMs ?? 1550;
  const maxMs = opts.maxMs ?? 34000;
  return new Promise((resolve) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      resolve('');
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'pt-BR';
    let aggregated = '';
    let hasHeard = false;
    let lastActivity = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(iv);
      try {
        rec.stop();
      } catch (_) {}
    };

    const iv = setInterval(() => {
      if (shouldStop?.()) {
        finish();
        return;
      }
      if (hasHeard && lastActivity && Date.now() - lastActivity >= silenceMs) {
        finish();
      }
    }, 160);

    rec.onresult = (e) => {
      if (shouldStop?.()) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = (e.results[i][0].transcript || '').trim();
        if (!t) continue;
        hasHeard = true;
        lastActivity = Date.now();
        if (e.results[i].isFinal) {
          aggregated = (aggregated + ' ' + t).trim();
        }
        const line = e.results[i].isFinal ? aggregated : `${aggregated} ${t}`.trim();
        onPartial?.(line);
      }
    };

    rec.onend = () => {
      clearInterval(iv);
      resolve(aggregated.trim());
    };
    rec.onerror = () => {
      clearInterval(iv);
      resolve(aggregated.trim());
    };

    try {
      rec.start();
    } catch (_) {
      clearInterval(iv);
      resolve('');
      return;
    }
    setTimeout(() => {
      if (!finished) finish();
    }, maxMs);
  });
}

/**
 * @param {object} options
 * @param {function(string): Promise<string>} options.chatRound - envia texto à IA, retorna resposta
 * @param {function} [options.onSensitiveBlock] - quando conteúdo sensível interrompe o fluxo
 */
export function useVoiceEngine(options = {}) {
  const { chatRound, onSensitiveBlock } = options;
  const chatRoundRef = useRef(chatRound);
  useEffect(() => {
    chatRoundRef.current = chatRound;
  }, [chatRound]);

  const [voiceState, setVoiceState] = useState({
    status: 'idle',
    isActive: false,
    isContinuous: false,
    currentTranscript: '',
    lastAlert: null,
    alertsEnabled: true,
    audioBlocked: false,
    // Flash curto na UI quando o usuário faz barge-in durante TTS.
    bargeInFlash: false
  });

  /**
   * UI para modo imersivo (Nível B):
   * - mouthState: 4 bocas (closed/open/o/e)
   * - speechText: texto completo digitando progressivamente (opção B)
   * - targetText: texto-alvo (vai crescendo conforme chegam chunks via WS)
   */
  const [ttsUi, setTtsUi] = useState({
    mouthState: 'closed',
    speechText: '',
    targetText: '',
    isTyping: false
  });
  const ttsTargetRef = useRef('');
  const typingTimerRef = useRef(null);
  const typingActiveRef = useRef(false);

  const [badge, setBadge] = useState({ text: '', visible: false });
  const badgeTimer = useRef(null);

  // No modo contínuo (voz ativada/loop), fixamos um ritmo ligeiramente mais lento.
  // Isso evita sensação de pressa logo após o usuário falar.
  const CONTINUOUS_SPEED_OVERRIDE = 1.02;

  const showBadge = useCallback((text) => {
    if (badgeTimer.current) clearTimeout(badgeTimer.current);
    setBadge({ text, visible: true });
    badgeTimer.current = setTimeout(() => {
      setBadge((b) => ({ ...b, visible: false }));
      setTimeout(() => setBadge({ text: '', visible: false }), 400);
    }, 2200);
  }, []);

  const continuousRef = useRef(false);
  const loopRunningRef = useRef(false);
  const failStreakRef = useRef(0);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const wakeRef = useRef(null);
  const wakeActiveRef = useRef(false);
  const [isWakeWordActive, setIsWakeWordActive] = useState(false);
  const voiceIdRef = useRef('nova');
  const speedRef = useRef(1.02);
  const audioBlockedRef = useRef(false);
  const speakAbortedRef = useRef(false);
  const voiceSocketRef = useRef(null);
  const voiceSocketConnectingRef = useRef(null);
  const bargeInDetectedRef = useRef(false);
  const ttsAbortControllerRef = useRef(null);
  const bargeMonitorCleanupRef = useRef(null);
  const bargeInFlashTimeoutRef = useRef(null);
  const lastHeardTextRef = useRef('');
  const lastHeardAtRef = useRef(0);
  const lastSpokeAtRef = useRef(0);
  const voiceLoopWindowRef = useRef({ startAt: Date.now(), count: 0 });
  useEffect(() => {
    audioBlockedRef.current = voiceState.audioBlocked;
  }, [voiceState.audioBlocked]);

  function normalizeSpeech(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^0-9A-Za-zÀ-ÿ\s]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async function monitorBargeinDuringTts(onDetected) {
    // Só faz sentido em modo contínuo (enquanto estamos ouvindo do usuário).
    if (!continuousRef.current) return () => {};
    if (bargeMonitorCleanupRef.current) {
      try { bargeMonitorCleanupRef.current(); } catch (_) {}
      bargeMonitorCleanupRef.current = null;
    }

    const MIC_RMS_THRESHOLD = 0.015;
    const CONSECUTIVE_MS = 180;
    const TICK_MS = 30;

    let mediaStream = null;
    let bargeCtx = null;
    let analyser = null;
    let intervalId = null;

    const stop = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
      try { analyser?.disconnect?.(); } catch (_) {}
      analyser = null;
      try {
        mediaStream?.getTracks?.().forEach((t) => t.stop());
      } catch (_) {}
      mediaStream = null;
      try { bargeCtx?.close?.(); } catch (_) {}
      bargeCtx = null;
    };

    bargeMonitorCleanupRef.current = stop;

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
      });
      bargeCtx = new (window.AudioContext || window.webkitAudioContext)();
      const msrc = bargeCtx.createMediaStreamSource(mediaStream);
      analyser = bargeCtx.createAnalyser();
      // FFT pequeno => leitura mais rápida do tempo.
      analyser.fftSize = 256;
      msrc.connect(analyser);

      const data = new Uint8Array(analyser.fftSize);
      let consecutive = 0;

      intervalId = setInterval(() => {
        if (speakAbortedRef.current) return;
        if (!analyser) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        if (rms > MIC_RMS_THRESHOLD) consecutive += TICK_MS;
        else consecutive = 0;

        if (!bargeInDetectedRef.current && consecutive >= CONSECUTIVE_MS) {
          bargeInDetectedRef.current = true;
          try {
            voiceSocketRef.current?.emit('voice:cancel');
          } catch (_) {}
          try {
            ttsAbortControllerRef.current?.abort?.();
          } catch (_) {}
          try {
            onDetected?.();
          } catch (_) {}
          stop();
        }
      }, TICK_MS);
    } catch (_) {
      // Se não der permissão/acesso, não bloqueia o TTS.
      stop();
    }

    return stop;
  }

  const setPartial = useCallback((t) => {
    setVoiceState((s) => ({ ...s, currentTranscript: t }));
  }, []);

  const stopSpeaking = useCallback(() => {
    speakAbortedRef.current = true;
    try {
      voiceSocketRef.current?.emit('voice:cancel');
    } catch (_) {}
    try {
      sourceRef.current?.stop();
    } catch (_) {}
    sourceRef.current = null;
    typingActiveRef.current = false;
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    ttsTargetRef.current = '';
    if (bargeInFlashTimeoutRef.current) {
      clearTimeout(bargeInFlashTimeoutRef.current);
      bargeInFlashTimeoutRef.current = null;
    }
    setTtsUi((u) => ({
      ...u,
      mouthState: 'closed',
      isTyping: false
    }));
    setVoiceState((s) => ({ ...s, bargeInFlash: false }));
  }, []);

  const startTypingLoop = useCallback(() => {
    if (typingTimerRef.current) return;
    typingActiveRef.current = true;
    setTtsUi((u) => ({ ...u, isTyping: true }));
    const getTypingDelayMs = (lastChar) => {
      // Ritmo visual próximo ao da fala: menos "metralhado", com pausas por pontuação.
      if (lastChar === ',') return 85;
      if (lastChar === ';') return 120;
      if (lastChar === ':') return 180;
      if (lastChar === '\n') return 140;
      if (lastChar === '.' || lastChar === '!' || lastChar === '?') return 220;
      if (lastChar === '…') return 240;
      return 26;
    };
    const tick = () => {
      if (!typingActiveRef.current) return;
      const target = ttsTargetRef.current || '';
      setTtsUi((u) => {
        if (!typingActiveRef.current) return { ...u, isTyping: false };
        if (!target) return { ...u, isTyping: false };
        if (u.speechText.length >= target.length) return { ...u, targetText: target };
        const nextChar = target[u.speechText.length];
        const next = u.speechText + nextChar;
        return { ...u, speechText: next, targetText: target };
      });

      const curLen = ttsTargetRef.current ? (ttsTargetRef.current.length || 0) : 0;
      // atraso variável (pausas humanas)
      const lastChar = target[Math.min(target.length - 1, Math.max(0, curLen - 1))] || '';
      const delay = getTypingDelayMs(lastChar);
      typingTimerRef.current = setTimeout(tick, delay);
    };
    typingTimerRef.current = setTimeout(tick, 45);
  }, []);

  const setTypingTarget = useCallback((text) => {
    const t = String(text || '').replace(/\s+/g, ' ').trim();
    ttsTargetRef.current = t;
    setTtsUi((u) => ({
      ...u,
      targetText: t
    }));
    if (t && !typingTimerRef.current) startTypingLoop();
  }, [startTypingLoop]);

  function cleanChunkForUi(s) {
    let t = String(s || '')
      .replace(/\s+/g, ' ')
      .trim();
    // remove pontuação sobrando no início (ex.: ". A manutenção...")
    t = t.replace(/^[\s.]+/, '');
    // corrige duplicações comuns de pontuação
    t = t.replace(/(\.\s*){2,}/g, '. ');
    t = t.replace(/(\s\.){2,}/g, '. ');
    t = t.replace(/\.\s+\./g, '. ');
    t = t.replace(/\s+([,!?…])/g, '$1');
    return t.trim();
  }

  function joinChunksSmart(prev, next) {
    const a = String(prev || '').trim();
    const b = cleanChunkForUi(next);
    if (!b) return a;
    if (!a) return b;
    const last = a[a.length - 1];
    const sep = /[.!?…]/.test(last) ? ' ' : '. ';
    return (a + sep + b).replace(/\s+/g, ' ').trim();
  }

  /** Garante Socket.IO /impetus-voice (streaming TTS em tempo real) */
  const ensureVoiceSocket = useCallback(() => {
    if (import.meta.env.VITE_VOICE_WEBSOCKET === 'false') return Promise.resolve(null);
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('impetus_token') : null;
    if (!token) return Promise.resolve(null);
    if (voiceSocketRef.current?.connected) return Promise.resolve(voiceSocketRef.current);
    if (voiceSocketConnectingRef.current) return voiceSocketConnectingRef.current;
    const base = voiceIoBase();
    voiceSocketConnectingRef.current = new Promise((resolve) => {
      const s = io(`${base}/impetus-voice`, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 2,
        timeout: 8000
      });
      const done = (sock) => {
        voiceSocketConnectingRef.current = null;
        resolve(sock);
      };
      s.on('connect', () => {
        voiceSocketRef.current = s;
        done(s);
      });
      s.on('connect_error', () => {
        try {
          s.close();
        } catch (_) {}
        done(null);
      });
      setTimeout(() => {
        if (!s.connected) {
          try {
            s.close();
          } catch (_) {}
          if (voiceSocketConnectingRef.current) done(null);
        }
      }, 6000);
    });
    return voiceSocketConnectingRef.current;
  }, []);

  const playMp3Buffer = useCallback(async (arrayBuffer) => {
    if (audioBlockedRef.current || !arrayBuffer?.byteLength) return;
    let ctx = audioCtxRef.current;
    if (!ctx || ctx.state === 'closed') {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
    }
    if (ctx.state === 'suspended') await ctx.resume();

    const audioBuf = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const src = ctx.createBufferSource();
    src.buffer = audioBuf;
    // Destino + Analyser (lip-sync Nível B)
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(ctx.destination);
    src.connect(analyser);
    sourceRef.current = src;
    setVoiceState((s) => ({ ...s, status: 'speaking' }));
    showBadge(pickSpeakingPhrase());

    // Lip sync Nível B (closed/open/o/e) — heurística por energia + centroide
    let raf = null;
    let lastMouth = 'closed';
    let lastSwitch = 0;
    let emaRms = 0;
    let emaCent = 1400;
    const freq = new Uint8Array(analyser.frequencyBinCount);
    const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const minHoldMs = 90;
    const alpha = 0.18;
    const sampleRate = ctx.sampleRate || 48000;
    const binHz = sampleRate / analyser.fftSize;

    const updateMouth = () => {
      if (!sourceRef.current || speakAbortedRef.current) return;
      analyser.getByteFrequencyData(freq);
      let sum = 0;
      let wsum = 0;
      for (let i = 0; i < freq.length; i++) {
        const v = freq[i] / 255;
        const p = v * v;
        sum += p;
        wsum += p * (i * binHz);
      }
      const rms = Math.sqrt(sum / (freq.length || 1));
      const centroid = sum > 0 ? wsum / sum : 1400;
      emaRms = emaRms + alpha * (rms - emaRms);
      emaCent = emaCent + alpha * (centroid - emaCent);

      let next = 'closed';
      // thresholds calibrados para MP3/AudioContext (ajustáveis depois)
      if (emaRms < 0.09) next = 'closed';
      else if (emaRms > 0.16) next = 'open';
      else next = emaCent < 1250 ? 'o' : 'e';

      const t = nowMs();
      if (next !== lastMouth && t - lastSwitch >= minHoldMs) {
        lastMouth = next;
        lastSwitch = t;
        setTtsUi((u) => ({ ...u, mouthState: next }));
      }
      raf = requestAnimationFrame(updateMouth);
    };
    setTtsUi((u) => ({ ...u, mouthState: 'open' }));
    raf = requestAnimationFrame(updateMouth);

    // Barge-in em produção: monitora energia do microfone durante o TTS.
    bargeInDetectedRef.current = false;
    let stopBargeMonitor = () => {};
    if (continuousRef.current) {
      // Inicia em paralelo para não atrasar o começo da fala.
      monitorBargeinDuringTts(() => {
        // Interrompe áudio imediatamente.
        speakAbortedRef.current = true;
        try { src.stop(); } catch (_) {}
        sourceRef.current = null;
        // Feedback visual: volta a "ouvindo" instantaneamente.
        setVoiceState((s) => ({ ...s, status: 'listening', isActive: true, isContinuous: true, bargeInFlash: true }));
        if (bargeInFlashTimeoutRef.current) clearTimeout(bargeInFlashTimeoutRef.current);
        bargeInFlashTimeoutRef.current = setTimeout(() => {
          // Mantemos status listening, apenas reduzimos o destaque visual.
          setVoiceState((s) => ({ ...s, bargeInFlash: false }));
        }, 500);
      }).then((cleanup) => {
        stopBargeMonitor = cleanup;
      });
    }

    return new Promise((resolve) => {
      src.onended = () => {
        if (raf) cancelAnimationFrame(raf);
        try { stopBargeMonitor?.(); } catch (_) {}
        try {
          bargeMonitorCleanupRef.current?.();
        } catch (_) {}
        bargeMonitorCleanupRef.current = null;
        sourceRef.current = null;
        setTtsUi((u) => ({ ...u, mouthState: 'closed' }));
        resolve();
      };
      try {
        src.start(0);
      } catch (_) {
        resolve();
      }
    });
  }, [showBadge]);

  const fetchSpeakAudio = useCallback(async (text) => {
    const clean = String(text || '')
      .replace(/[*_`#]/g, '')
      .replace(/\r\n?/g, '\n')
      // Mantém quebras de linha como pausas para o TTS processar natural.
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 4000);
    if (!clean) return null;
    // Forca leitura de termos/nome de marca em PT-BR, reduzindo “pronunciacao torta”.
    const pronunciationText = applyPronunciation(clean);
    const effectiveSpeed = continuousRef.current ? CONTINUOUS_SPEED_OVERRIDE : speedRef.current;
    const ac = new AbortController();
    ttsAbortControllerRef.current = ac;
    try {
      const res = await fetch(`${API_BASE}/dashboard/chat/voice/speak`, {
        method: 'POST',
        headers: authHeaders(),
        signal: ac.signal,
        body: JSON.stringify({
          text: pronunciationText,
          voice: voiceIdRef.current,
          speed: effectiveSpeed
        })
      });
      if (!res.ok) {
        console.warn('[voiceEngine] TTS HTTP', res.status);
        return null;
      }
      const buf = await res.arrayBuffer();
      return buf.byteLength ? buf : null;
    } catch (err) {
      // Abort do barge-in: apenas interrompe o áudio e segue.
      if (String(err?.name || '').toLowerCase().includes('abort')) return null;
      console.warn('[voiceEngine] TTS HTTP error', err?.message || err);
      return null;
    } finally {
      if (ttsAbortControllerRef.current === ac) ttsAbortControllerRef.current = null;
    }
  }, []);

  const speakText = useCallback(
    async (text) => {
      if (audioBlockedRef.current) return;
      speakAbortedRef.current = false;
      const buf = await fetchSpeakAudio(text);
      if (!buf) return;
      await playMp3Buffer(buf);
    },
    [fetchSpeakAudio, playMp3Buffer]
  );

  const speakNaturalReply = useCallback(
    async (reply) => {
      speakAbortedRef.current = false;
      const full = String(reply || '').trim();
      if (!full) return;

      const pronunciationFull = applyPronunciation(full);

      const useWs = import.meta.env.VITE_VOICE_WEBSOCKET !== 'false';
      if (useWs) {
        const socket = await ensureVoiceSocket();
        if (socket?.connected) {
          const queue = [];
          let streamDone = false;
          let notify = null;
          let mp3Count = 0;
          // typing: reseta texto e cresce conforme chunks chegam (opção B)
          ttsTargetRef.current = '';
          setTtsUi((u) => ({ ...u, speechText: '', targetText: '', isTyping: false }));
          const onMp3 = (p) => {
            mp3Count++;
            queue.push(p);
            notify?.();
          };
          const onEnd = () => {
            streamDone = true;
            notify?.();
          };
          const onAbort = () => {
            speakAbortedRef.current = true;
            notify?.();
          };
          socket.on('voice:mp3', onMp3);
          socket.once('voice:stream_end', onEnd);
          socket.once('voice:stream_aborted', onAbort);
          socket.emit('voice:speak_stream', {
            text: pronunciationFull,
            voice: voiceIdRef.current,
            speed: continuousRef.current ? CONTINUOUS_SPEED_OVERRIDE : speedRef.current
          });

          const wsDeadline = Date.now() + 120000;
          while (
            Date.now() < wsDeadline &&
            !speakAbortedRef.current &&
            (queue.length > 0 || !streamDone)
          ) {
            while (!queue.length && !streamDone && !speakAbortedRef.current) {
              await new Promise((r) => {
                notify = r;
                // Poll curto para reduzir gap entre chunks quando há jitter de rede.
                setTimeout(r, 60);
              });
            }
            if (speakAbortedRef.current) break;
            const item = queue.shift();
            if (!item) {
              if (streamDone) break;
              continue;
            }
            const bin = atob(item.b64);
            const bytes = new Uint8Array(bin.length);
            for (let j = 0; j < bin.length; j++) bytes[j] = bin.charCodeAt(j);
            // Texto segue o início da fala (speech-driven), não a chegada do payload.
            if (item?.text) {
              const nextTarget = joinChunksSmart(ttsTargetRef.current, item.text);
              setTypingTarget(nextTarget);
            }
            await playMp3Buffer(bytes.buffer);
            if (speakAbortedRef.current) break;
            const moreExpected = queue.length > 0 || !streamDone;
            if (moreExpected) {
              await new Promise((r) =>
                setTimeout(r, lightweightCadencePauseMs(item?.text))
              );
            }
          }
          socket.off('voice:mp3', onMp3);
          if (speakAbortedRef.current) return;
          if (mp3Count > 0) return;
        }
      }

      speakAbortedRef.current = false;
      const parts = splitIntoSpeechChunks(full);
      // HTTP fallback speech-driven: texto cresce conforme cada chunk começa a tocar.
      ttsTargetRef.current = '';
      setTtsUi((u) => ({ ...u, speechText: '', targetText: '', isTyping: false }));
      let nextBuf = null;
      for (let i = 0; i < parts.length; i++) {
        if (!continuousRef.current && i > 0) break;
        if (speakAbortedRef.current) break;
        const cur =
          i === 0
            ? await fetchSpeakAudio(parts[0])
            : nextBuf
              ? await nextBuf
              : await fetchSpeakAudio(parts[i]);
        nextBuf =
          i + 1 < parts.length ? fetchSpeakAudio(parts[i + 1]) : null;
        if (!cur) continue;
        const nextTarget = joinChunksSmart(ttsTargetRef.current, parts[i]);
        setTypingTarget(nextTarget);
        await playMp3Buffer(cur);
        if (speakAbortedRef.current) break;
        if (i < parts.length - 1) {
          await new Promise((r) =>
            setTimeout(r, lightweightCadencePauseMs(parts[i]))
          );
        }
      }
    },
    [ensureVoiceSocket, fetchSpeakAudio, playMp3Buffer, setTypingTarget]
  );

  const speakActivationReply = useCallback(async () => {
    let name = 'Usuário';
    try {
      const raw = localStorage.getItem('impetus_user') || '{}';
      const u = JSON.parse(raw);
      name = u?.name || u?.full_name || u?.email || 'Usuário';
    } catch (_) {}
    const shortName = String(name || 'Usuário').trim().split(/\s+/)[0] || 'Usuário';

    const options = [
      `Oi, ${shortName}. Pode falar. Estou aqui com você.`,
      `Olá, ${shortName}. Pode falar. Estou pronta para ouvir.`,
      `Oi, ${shortName}. Pode falar agora. Estou aqui.`
    ];
    const msg = options[Math.floor(Math.random() * options.length)];
    await speakNaturalReply(msg);
    lastSpokeAtRef.current = Date.now();
  }, [speakNaturalReply]);

  const stopVoiceCapture = useCallback(() => {
    continuousRef.current = false;
    loopRunningRef.current = false;
  }, []);

  const runContinuousLoop = useCallback(async () => {
    if (loopRunningRef.current) return;
    loopRunningRef.current = true;
    const preferWhisper = import.meta.env.VITE_USE_WHISPER_STT === 'true';
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const USER_TURN_END_GRACE_MS = 300;

    while (continuousRef.current) {
      setVoiceState((s) => ({
        ...s,
        status: 'listening',
        isActive: true,
        isContinuous: true,
        currentTranscript: ''
      }));
      showBadge(pickListeningPhrase());

      let text = '';
      try {
        if (preferWhisper) {
          const blob = await recordUntilSilence(null, () => !continuousRef.current);
          if (!continuousRef.current) break;
          if (blob) {
            setVoiceState((s) => ({ ...s, status: 'processing' }));
            showBadge(pickProcessingPhrase());
            try {
              text = await postTranscribe(blob);
            } catch (e) {
              console.warn('[voiceEngine] Whisper:', e?.message || e);
            }
          }
          if (!(text || '').trim() && SR) {
            setVoiceState((s) => ({ ...s, status: 'listening' }));
            showBadge(pickListeningPhrase());
            text = await captureWebSpeechUntilPause(setPartial, () => !continuousRef.current);
          }
        } else if (SR) {
          text = await captureWebSpeechUntilPause(setPartial, () => !continuousRef.current);
        } else {
          const blob = await recordUntilSilence(null, () => !continuousRef.current);
          if (!continuousRef.current) break;
          if (blob) {
            setVoiceState((s) => ({ ...s, status: 'processing' }));
            showBadge(pickProcessingPhrase());
            try {
              text = await postTranscribe(blob);
            } catch (e) {
              console.warn('[voiceEngine] transcribe', e);
            }
          }
        }
      } catch (e) {
        console.warn('[voiceEngine] capture', e);
        failStreakRef.current++;
        if (failStreakRef.current >= 3) {
          continuousRef.current = false;
          break;
        }
        continue;
      }

      if (!continuousRef.current) break;
      text = (text || '').trim();
      if (!text) {
        failStreakRef.current++;
        if (failStreakRef.current >= 3) {
          continuousRef.current = false;
          break;
        }
        continue;
      }

      // Anti-eco / repetição: ignora entrada que acontece logo após a IA terminar de falar.
      const now = Date.now();
      if (now - lastSpokeAtRef.current < 1500) {
        const n = normalizeSpeech(text);
        if (n.length < 16) continue;
      }

      const nText = normalizeSpeech(text);
      const sameAsLast = nText && nText === normalizeSpeech(lastHeardTextRef.current);
      const repeatedQuickly = now - lastHeardAtRef.current < 4500;
      if (sameAsLast && repeatedQuickly) continue;
      lastHeardTextRef.current = text;
      lastHeardAtRef.current = now;

      if (STOP_WORDS.test(text)) {
        continuousRef.current = false;
        break;
      }
      if (isOnlyActivationPhrase(text)) {
        failStreakRef.current = 0;
        await speakActivationReply();
        continue;
      }
      failStreakRef.current = 0;
      setVoiceState((s) => ({ ...s, currentTranscript: '', status: 'processing' }));
      showBadge(pickProcessingPhrase());
      // Pequena pausa depois que o usuário terminou de falar.
      // Ajuda a reduzir eco/ruído residual e melhora a sensação de "turn-taking".
      await new Promise((r) => setTimeout(r, USER_TURN_END_GRACE_MS));

      if (text.length > 40) {
        await speakText(pickThinkingPhrase());
        lastSpokeAtRef.current = Date.now();
        showBadge(pickProcessingPhrase());
      }

      let reply = '';
      try {
        const fn = chatRoundRef.current;
        if (fn) reply = await fn(text);
      } catch (e) {
        if (
          e?.__sensitive ||
          e?.response?.data?.code === 'SENSITIVE_CONTENT'
        ) {
          onSensitiveBlock?.();
          continuousRef.current = false;
          break;
        }
        reply = e?.message || 'Erro ao processar.';
      }

      if (!continuousRef.current) break;
      await speakNaturalReply(reply);
      lastSpokeAtRef.current = Date.now();

      // Anti-loop: se estiver falando várias vezes sem entrada nova, encerra contínuo.
      const w = voiceLoopWindowRef.current;
      if (Date.now() - w.startAt > 30000) {
        w.startAt = Date.now();
        w.count = 0;
      }
      w.count += 1;
      if (w.count >= 8) {
        continuousRef.current = false;
        stopSpeaking();
        break;
      }
    }

    loopRunningRef.current = false;
    setVoiceState((s) => ({
      ...s,
      status: 'idle',
      isActive: false,
      isContinuous: false,
      currentTranscript: ''
    }));
  }, [onSensitiveBlock, setPartial, showBadge, speakText, speakNaturalReply, speakActivationReply]);

  const toggleVoice = useCallback(async () => {
    if (continuousRef.current) {
      continuousRef.current = false;
      stopSpeaking();
      showBadge('');
      setVoiceState((s) => ({
        ...s,
        status: 'idle',
        isActive: false,
        isContinuous: false
      }));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      localStorage.setItem('impetus_mic_granted', '1');
    } catch (e) {
      setVoiceState((s) => ({ ...s, lastAlert: 'Permita o microfone nas configurações do navegador.' }));
      return;
    }
    wakeRef.current?.stop();
    wakeRef.current = null;
    wakeActiveRef.current = false;
    setIsWakeWordActive(false);

    continuousRef.current = true;
    failStreakRef.current = 0;
    setVoiceState((s) => ({
      ...s,
      isActive: true,
      isContinuous: true,
      status: 'listening'
    }));
    runContinuousLoop();
  }, [runContinuousLoop, stopSpeaking, showBadge]);

  const startListening = useCallback(() => {
    if (!continuousRef.current) toggleVoice();
  }, [toggleVoice]);

  const stopListening = useCallback(() => {
    continuousRef.current = false;
    stopSpeaking();
    setVoiceState((s) => ({
      ...s,
      status: 'idle',
      isActive: false,
      isContinuous: false,
      bargeInFlash: false
    }));
  }, [stopSpeaking]);

  const setAlertsEnabled = useCallback((v) => {
    setVoiceState((s) => ({ ...s, alertsEnabled: !!v }));
  }, []);

  const startWakeWord = useCallback(() => {
    if (wakeRef.current || !localStorage.getItem('impetus_mic_granted')) return;
    let w;
    w = new WakeWordDetector(() => {
      stopSpeaking();
      speakAbortedRef.current = false;
      w.stop();
      playBeep();
      window.dispatchEvent(new CustomEvent('impetus-wake-toast', { detail: { text: 'Oi, pode falar.' } }));
      (async () => {
        if (continuousRef.current) {
          w.start();
          return;
        }
        await speakActivationReply();
        let text = '';
        try {
          const useWhisper = import.meta.env.VITE_USE_WHISPER_STT === 'true';
          if (useWhisper) {
            const blob = await recordUntilSilence(null, () => false);
            if (blob) text = await postTranscribe(blob);
          }
          if (!text) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SR) {
              text = await captureWebSpeechUntilPause(null, () => false, { silenceMs: 1600 });
            }
          }
        } catch (_) {}
        text = (text || '').trim();
        const fn = chatRoundRef.current;
        if (text && !STOP_WORDS.test(text) && fn && !isOnlyActivationPhrase(text)) {
          await speakText(pickThinkingPhrase());
          const reply = await fn(text).catch(() => '');
          if (reply) await speakNaturalReply(reply);
        }
        if (!continuousRef.current && localStorage.getItem('impetus_mic_granted')) {
          w.start();
        }
      })();
    });
    wakeRef.current = w;
    wakeActiveRef.current = true;
    setIsWakeWordActive(true);
    w.start();
  }, [stopSpeaking, speakText, speakNaturalReply, speakActivationReply]);

  const stopWakeWord = useCallback(() => {
    wakeRef.current?.stop();
    wakeRef.current = null;
    wakeActiveRef.current = false;
    setIsWakeWordActive(false);
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        /* pausa: não encerra contínuo */
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    return () => {
      continuousRef.current = false;
      stopSpeaking();
      try {
        voiceSocketRef.current?.disconnect();
      } catch (_) {}
      voiceSocketRef.current = null;
      typingActiveRef.current = false;
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
      wakeRef.current?.stop();
      if (badgeTimer.current) clearTimeout(badgeTimer.current);
    };
  }, [stopSpeaking]);

  return {
    voiceState,
    voiceBadge: badge,
    ttsUi,
    startListening,
    stopListening,
    toggleVoice,
    speakText,
    stopSpeaking,
    setAlertsEnabled,
    setVoicePrefs: (p) => {
      if (p.voice_id) voiceIdRef.current = p.voice_id;
      if (p.speed != null) speedRef.current = parseFloat(p.speed) || 1;
      if (typeof p.alerts_enabled === 'boolean')
        setVoiceState((s) => ({ ...s, alertsEnabled: p.alerts_enabled }));
    },
    isWakeWordActive,
    startWakeWord,
    stopWakeWord,
    stopVoiceCapture,
    speakNaturalReply
  };
}
