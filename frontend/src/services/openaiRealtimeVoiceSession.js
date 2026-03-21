/**
 * Sessão OpenAI Realtime via proxy Impetus (ws /impetus-realtime).
 * Áudio: PCM16 mono 24 kHz (input_audio_format pcm16) + fila de playback para output.
 *
 * Não expõe API key no browser — só JWT igual ao resto do app.
 */
const REALTIME_PATH = import.meta.env.VITE_REALTIME_WS_PATH || '/impetus-realtime';
const OUTPUT_SAMPLE_RATE = 24000;

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

export const DEFAULT_REALTIME_SESSION = {
  type: 'session.update',
  session: {
    type: 'realtime',
    instructions:
      'Fale como uma assistente industrial brasileira. Natural, direta e profissional. ' +
      'Frases curtas e pausas naturais. Responda em português do Brasil.',
    input_audio_format: 'pcm16',
    output_audio_format: 'pcm16'
  }
};

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
    src.start(this.nextTime);
    this.nextTime += buf.duration;
  }

  resetSchedule() {
    this.nextTime = 0;
  }
}

export class OpenaiRealtimeVoiceSession {
  /**
   * @param {{ onEvent?: (ev: object) => void, onError?: (e: Error) => void, onClose?: () => void }} hooks
   */
  constructor(hooks = {}) {
    this.onEvent = hooks.onEvent || (() => {});
    this.onError = hooks.onError || (() => {});
    this.onClose = hooks.onClose || (() => {});
    this.ws = null;
    this.audioCtx = null;
    this.player = null;
    this.mediaStream = null;
    this.scriptNode = null;
    this.muteGain = null;
    this.sourceNode = null;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * @param {boolean | { skipSession?: boolean, sessionUpdate?: object }} opts
   *        — `true`/`{}` envia sessão padrão; `{ sessionUpdate }` mescla instruções; `false` não envia session.update
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

    const sessionPayload = sessionUpdate || DEFAULT_REALTIME_SESSION;

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
          } catch (_) {
            return;
          }
        }
        let ev;
        try {
          ev = JSON.parse(data);
        } catch {
          return;
        }
        this.onEvent(ev);

        const t = ev.type;
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

        if (t === 'response.output_audio.done' || t === 'response.done' || t === 'error') {
          /* opcional: this.player?.resetSchedule() em barge-in agressivo */
        }
      };
    });
  }

  send(obj) {
    if (!this.connected) throw new Error('WebSocket fechado');
    this.ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
  }

  /** Interrompe resposta em andamento (barge-in / parar). */
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
      if (!this.connected) return;
      const input = e.inputBuffer.getChannelData(0);
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
  }

  stopMic() {
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
