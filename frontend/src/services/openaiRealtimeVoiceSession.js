/**
 * Sessão OpenAI Realtime via proxy Impetus (ws /impetus-realtime).
 * Áudio: PCM16 mono 24 kHz (input_audio_format pcm16) + fila de playback para o modelo.
 *
 * Half-duplex + reabertura do mic só quando o playback local realmente terminou (+ margens anti-eco).
 */
const REALTIME_PATH = import.meta.env.VITE_REALTIME_WS_PATH || '/impetus-realtime';
const OUTPUT_SAMPLE_RATE = 24000;

function isRealtimeMeetingMode() {
  const v = String(import.meta.env.VITE_REALTIME_MEETING || '').trim().toLowerCase();
  return v === 'true' || v === '1';
}

/** Mesma base que useVoiceEngine (HTTP do backend). */
function apiBaseUrl() {
  let b = import.meta.env.VITE_API_URL || '';
  if (!b || b.startsWith('/')) {
    b = `${typeof window !== 'undefined' ? window.location.origin : ''}${b || '/api'}`;
  }
  return b.replace(/\/$/, '');
}

export function buildImpetusRealtimeWsUrl() {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('impetus_token') || '' : '';
  const httpBase = apiBaseUrl();
  let u;
  try {
    u = new URL(httpBase);
  } catch {
    return '';
  }
  const wsProto = u.protocol === 'https:' ? 'wss:' : 'ws:';
  const enc = encodeURIComponent(token);
  return `${wsProto}//${u.host}${REALTIME_PATH}?token=${enc}`;
}

const BASE_INSTRUCTIONS =
  'IDIOMA OBRIGATÓRIO: português do Brasil (pt-BR) em todas as respostas faladas. ' +
  'Proibido espanhol, inglês, português de Portugal ou qualquer outro idioma — mesmo palavras soltas. ' +
  'Se houver ambiguidade, escolha sempre o vocabulário brasileiro (ex.: celular, não móvil). ' +
  'Fale de forma natural, profissional e direta. Contexto industrial/corporativo: segura e objetiva. ' +
  'Evite respostas longas; não interrompa o raciocínio no meio. ' +
  'Quando fizer sentido, finalize com uma pergunta curta para manter o diálogo.';

const MEETING_INSTRUCTIONS =
  BASE_INSTRUCTIONS +
  ' Modo reunião: respostas ainda mais curtas, uma ideia por vez, tom calmo.';

/**
 * Monta o session.update inicial (VAD + instruções). `envInstructions` sobrescreve o texto se não vazio.
 */
export function buildImpetusRealtimeSessionUpdate(envInstructions = '') {
  const meeting = isRealtimeMeetingMode();
  const instr = String(envInstructions || '').trim();
  const instructions = instr || (meeting ? MEETING_INSTRUCTIONS : BASE_INSTRUCTIONS);

  const silenceMs = meeting ? 900 : 700;
  const threshold = meeting ? 0.52 : 0.48;

  return {
    type: 'session.update',
    session: {
      type: 'realtime',
      instructions,
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      // Transcrição do microfone em português — reduz confusão com espanhol no pipeline.
      input_audio_transcription: {
        model: 'whisper-1',
        language: 'pt',
        prompt: 'Português do Brasil. Operador industrial. Não transcrever em espanhol.'
      },
      turn_detection: {
        type: 'server_vad',
        threshold,
        prefix_padding_ms: meeting ? 450 : 400,
        silence_duration_ms: silenceMs
      }
    }
  };
}

/** @deprecated use buildImpetusRealtimeSessionUpdate — mantido para imports antigos */
export const DEFAULT_REALTIME_SESSION = buildImpetusRealtimeSessionUpdate();

function downsampleFloat32(input, inputRate, outputRate) {
  if (inputRate === outputRate) return new Float32Array(input);
  const ratio = inputRate / outputRate;
  const length = Math.floor(input.length / ratio);
  const out = new Float32Array(length);
  let pos = 0;
  for (let i = 0; i < length; i++) {
    const srcIdx = Math.min(Math.floor(pos), input.length - 1);
    out[i] = input[srcIdx];
    pos += ratio;
  }
  return out;
}

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

class Pcm24kPlayer {
  constructor(audioContext) {
    this.ctx = audioContext;
    this.nextTime = 0;
    this.playingCount = 0;
    /** @type {Set<AudioBufferSourceNode>} */
    this._sources = new Set();
  }

  pushBase64Delta(b64) {
    if (!b64 || !this.ctx) return;
    const ab = base64ToArrayBuffer(b64);
    const int16 = new Int16Array(ab);
    if (!int16.length) return;
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    const buf = this.ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buf.copyToChannel(float32, 0);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    if (this.nextTime < now) this.nextTime = now;

    this.playingCount++;
    this._sources.add(src);
    src.onended = () => {
      this._sources.delete(src);
      this.playingCount = Math.max(0, this.playingCount - 1);
    };
    src.start(this.nextTime);
    this.nextTime += buf.duration;
  }

  /** Para reprodução imediata (cancel / parar) — evita isPlaybackIdle “falso positivo”. */
  stopAllQueued() {
    for (const s of [...this._sources]) {
      try {
        s.stop();
      } catch (_) {}
    }
    this._sources.clear();
    this.playingCount = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime;
    else this.nextTime = 0;
  }

  resetSchedule() {
    this.stopAllQueued();
  }

  /** Fila local esvaziada e nenhum trecho ainda tocando. */
  isPlaybackIdle() {
    if (!this.ctx) return true;
    const slackSec = 0.045;
    return (
      this.playingCount === 0 &&
      this._sources.size === 0 &&
      this.nextTime <= this.ctx.currentTime + slackSec
    );
  }
}

export class OpenaiRealtimeVoiceSession {
  /**
   * @param {{
   *   onEvent?: (ev: object) => void,
   *   onError?: (e: Error) => void,
   *   onClose?: () => void,
   *   onPhaseChange?: (phase: 'listening' | 'speaking') => void
   * }} hooks
   */
  constructor(hooks = {}) {
    this.onEvent = hooks.onEvent || (() => {});
    this.onError = hooks.onError || (() => {});
    this.onClose = hooks.onClose || (() => {});
    this.onPhaseChange = hooks.onPhaseChange || (() => {});
    this.ws = null;
    this.audioCtx = null;
    this.player = null;
    this.mediaStream = null;
    this.scriptNode = null;
    this.muteGain = null;
    this.sourceNode = null;
    this.appendMicToApi = true;
    /** Estado explícito para half-duplex */
    this.phase = 'listening';
    this._unsuppressTimer = null;
    this._unsuppressRaf = null;
    this._ambientNoiseEma = 0;
    this._vadTuneTimer = null;
  }

  getPhase() {
    return this.phase;
  }

  _setPhase(phase) {
    if (this.phase === phase) return;
    this.phase = phase;
    try {
      this.onPhaseChange(phase);
    } catch (_) {}
  }

  _clearUnsuppressTimer() {
    if (this._unsuppressTimer) {
      clearTimeout(this._unsuppressTimer);
      this._unsuppressTimer = null;
    }
    if (this._unsuppressRaf != null) {
      cancelAnimationFrame(this._unsuppressRaf);
      this._unsuppressRaf = null;
    }
  }

  _clearVadTuneTimer() {
    if (this._vadTuneTimer) {
      clearTimeout(this._vadTuneTimer);
      this._vadTuneTimer = null;
    }
  }

  /**
   * Depois de response.done: espera playback local real → margem → clear → margem anti-eco → reabre mic.
   */
  _scheduleMicUnsuppress() {
    this._clearUnsuppressTimer();
    const meeting = isRealtimeMeetingMode();
    const postDoneMs = meeting ? 650 : 500;
    const clearTailMs = meeting ? 280 : 200;

    const armTimeouts = () => {
      this._unsuppressTimer = setTimeout(() => {
        try {
          if (this.connected) {
            this.send({ type: 'input_audio_buffer.clear' });
          }
        } catch (_) {}
        this._unsuppressTimer = setTimeout(() => {
          this.appendMicToApi = true;
          this._setPhase('listening');
          this._unsuppressTimer = null;
        }, clearTailMs);
      }, postDoneMs);
    };

    const pollIdle = () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      if (this.player && !this.player.isPlaybackIdle()) {
        this._unsuppressRaf = requestAnimationFrame(pollIdle);
        return;
      }
      this._unsuppressRaf = null;
      armTimeouts();
    };

    this._unsuppressRaf = requestAnimationFrame(pollIdle);
  }

  _beginAssistantSpeaking() {
    this.appendMicToApi = false;
    this._setPhase('speaking');
    this._clearUnsuppressTimer();
    try {
      if (this.connected) {
        this.send({ type: 'input_audio_buffer.clear' });
      }
    } catch (_) {}
  }

  /** Ajuste fino de VAD no servidor conforme ruído ambiente (uma vez por sessão). */
  _maybeSendAdaptiveVad() {
    if (!this.connected || isRealtimeMeetingMode()) return;
    const n = this._ambientNoiseEma;
    let silence = 700;
    let threshold = 0.48;
    if (n > 0.038) {
      silence = 880;
      threshold = 0.52;
    } else if (n < 0.014) {
      silence = 600;
      threshold = 0.46;
    }
    try {
      this.send({
        type: 'session.update',
        session: {
          turn_detection: {
            type: 'server_vad',
            threshold,
            prefix_padding_ms: 400,
            silence_duration_ms: silence
          }
        }
      });
    } catch (_) {}
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * @param {boolean | { skipSession?: boolean, sessionUpdate?: object }} opts
   */
  connect(opts = true) {
    const url = buildImpetusRealtimeWsUrl();
    if (!url || !url.includes('token=')) {
      return Promise.reject(new Error('Sem token — faça login para usar Realtime'));
    }
    let skipSession = false;
    let sessionUpdate = null;
    if (opts === false) skipSession = true;
    else if (opts && typeof opts === 'object') {
      skipSession = opts.skipSession === true;
      sessionUpdate = opts.sessionUpdate || null;
    }

    const sessionPayload =
      sessionUpdate || buildImpetusRealtimeSessionUpdate(String(import.meta.env.VITE_REALTIME_INSTRUCTIONS || ''));

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      let settled = false;
      const finish = (err) => {
        if (settled) return;
        settled = true;
        if (err) reject(err);
        else resolve();
      };

      ws.onopen = () => {
        if (!skipSession) {
          try {
            ws.send(JSON.stringify(sessionPayload));
          } catch (e) {
            finish(e);
            return;
          }
        }
        finish();
      };

      ws.onerror = () => {
        finish(new Error('Falha no WebSocket Realtime'));
      };

      ws.onclose = (ev) => {
        this.stopMic();
        try {
          this.onClose();
        } catch (_) {}
        if (!settled) finish(new Error(ev.reason || 'WebSocket Realtime fechado'));
      };

      ws.onmessage = (evt) => {
        let data = evt.data;
        if (typeof data !== 'string') {
          try {
            data = new TextDecoder().decode(data);
          } catch {
            return;
          }
        }
        let ev;
        try {
          ev = JSON.parse(data);
        } catch {
          return;
        }
        const t = ev.type || '';

        if (t === 'response.created') {
          this._beginAssistantSpeaking();
        }
        if (
          (t === 'response.output_audio.delta' || t === 'response.audio.delta') &&
          ev.delta
        ) {
          if (this.appendMicToApi) {
            this._beginAssistantSpeaking();
          }
        }
        if (t === 'response.done') {
          this._scheduleMicUnsuppress();
        }

        this.onEvent(ev);

        const isAudioDelta =
          t === 'response.output_audio.delta' ||
          t === 'response.audio.delta';
        if (isAudioDelta && ev.delta) {
          if (!this.player) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.player = new Pcm24kPlayer(this.audioCtx);
          }
          if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
          this.player.pushBase64Delta(ev.delta);
        }

        if (t === 'error') {
          this.appendMicToApi = true;
          this._clearUnsuppressTimer();
          this._setPhase('listening');
        }
      };
    });
  }

  send(obj) {
    if (!this.connected) throw new Error('WebSocket fechado');
    this.ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
  }

  cancelResponse() {
    if (!this.connected) return;
    try {
      this.send({ type: 'response.cancel' });
    } catch (_) {}
    try {
      this.send({ type: 'output_audio_buffer.clear' });
    } catch (_) {}
    try {
      this.player?.resetSchedule();
    } catch (_) {}
  }

  async startMic() {
    if (!this.connected) throw new Error('Conecte antes de startMic');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1
      }
    });
    this.mediaStream = stream;

    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = this.audioCtx;
    if (ctx.state === 'suspended') await ctx.resume();

    this.sourceNode = ctx.createMediaStreamSource(stream);
    const bufferSize = 4096;
    const processor = ctx.createScriptProcessor(bufferSize, 1, 1);
    this.scriptNode = processor;

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      if (this.appendMicToApi) {
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / (input.length || 1));
        this._ambientNoiseEma = this._ambientNoiseEma * 0.92 + rms * 0.08;
      }
      if (!this.connected || !this.appendMicToApi) return;
      const down = downsampleFloat32(input, ctx.sampleRate, OUTPUT_SAMPLE_RATE);
      const pcm = floatTo16BitPCM(down);
      const audio = arrayBufferToBase64(pcm);
      try {
        this.ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio }));
      } catch (_) {}
    };

    this.muteGain = ctx.createGain();
    this.muteGain.gain.value = 0;
    this.sourceNode.connect(processor);
    processor.connect(this.muteGain);
    this.muteGain.connect(ctx.destination);

    if (!this.player) this.player = new Pcm24kPlayer(ctx);

    this._clearVadTuneTimer();
    this._vadTuneTimer = setTimeout(() => {
      this._vadTuneTimer = null;
      this._maybeSendAdaptiveVad();
    }, 2800);
  }

  stopMic() {
    this._clearVadTuneTimer();
    try {
      this.scriptNode?.disconnect();
    } catch (_) {}
    try {
      this.muteGain?.disconnect();
    } catch (_) {}
    try {
      this.sourceNode?.disconnect();
    } catch (_) {}
    this.scriptNode = null;
    this.muteGain = null;
    this.sourceNode = null;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  disconnect() {
    this._clearUnsuppressTimer();
    this._clearVadTuneTimer();
    this.appendMicToApi = true;
    this.phase = 'listening';
    this.stopMic();
    try {
      this.ws?.close();
    } catch (_) {}
    this.ws = null;
    try {
      this.audioCtx?.close();
    } catch (_) {}
    this.audioCtx = null;
    this.player = null;
  }
}
