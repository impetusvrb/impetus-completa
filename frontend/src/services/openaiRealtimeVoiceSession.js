/**
 * Sessão OpenAI Realtime via proxy Impetus (ws /impetus-realtime).
 * Áudio: PCM16 mono 24 kHz (input_audio_format pcm16) + fila de playback para o modelo.
 *
 * Half-duplex + reabertura do mic só quando o playback local realmente terminou (+ margens anti-eco).
 *
 * Ajustes de voz (env VITE_* — ver getRealtimeVoiceRuntimeConfig):
 * - VITE_REALTIME_VOICE_SPEED (ex.: 0.85 ou 0.9)
 * - VITE_REALTIME_MAX_SPEECH_MS (default = REALTIME_MAX_SPEECH_MS)
 * - VITE_REALTIME_MAX_RESPONSE_TOKENS
 * - VITE_REALTIME_INTERRUPT_RESPONSE
 * - VITE_REALTIME_RESPONSE_DELAY_MS (pausa extra antes de criar resposta — simula «pensar»)
 * - VITE_REALTIME_VOICE_DEBUG=true
 */
const REALTIME_PATH = import.meta.env.VITE_REALTIME_WS_PATH || '/impetus-realtime';
const OUTPUT_SAMPLE_RATE = 24000;

/** Limite máximo de fala por resposta (~10 s de áudio). Sobrescrevível por VITE_REALTIME_MAX_SPEECH_MS. */
export const REALTIME_MAX_SPEECH_MS = 10000;

function envBool(key, defaultVal) {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === null || String(raw).trim() === '') return defaultVal;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function envFloat(key, defaultVal) {
  const n = parseFloat(String(import.meta.env[key] ?? '').trim());
  return Number.isFinite(n) ? n : defaultVal;
}

function envInt(key, defaultVal) {
  const n = parseInt(String(import.meta.env[key] ?? '').trim(), 10);
  return Number.isFinite(n) ? n : defaultVal;
}

/** Config ativa (documentação + testes). */
export function getRealtimeVoiceRuntimeConfig() {
  const delayRaw = envInt('VITE_REALTIME_RESPONSE_DELAY_MS', 380);
  return {
    voiceSpeed: clampVoiceSpeed(envFloat('VITE_REALTIME_VOICE_SPEED', 0.9)),
    maxSpeechMs: Math.max(2000, envInt('VITE_REALTIME_MAX_SPEECH_MS', REALTIME_MAX_SPEECH_MS)),
    maxResponseTokens: Math.max(16, envInt('VITE_REALTIME_MAX_RESPONSE_TOKENS', 88)),
    interruptResponse: envBool('VITE_REALTIME_INTERRUPT_RESPONSE', true),
    voiceDebug: envBool('VITE_REALTIME_VOICE_DEBUG', false),
    localBargeRms: envFloat('VITE_REALTIME_LOCAL_BARGE_RMS', 0.03),
    localBargeBlocks: Math.max(2, envInt('VITE_REALTIME_LOCAL_BARGE_BLOCKS', 4)),
    /** Pausa após o utilizador parar de falar antes de pedir/generar resposta (naturalidade). */
    responseDelayMs: Math.min(2200, Math.max(0, delayRaw))
  };
}

function clampVoiceSpeed(s) {
  if (!Number.isFinite(s)) return 0.9;
  return Math.min(1.5, Math.max(0.25, s));
}

/** Quando true, o cliente envia `response.create` após `responseDelayMs` em `speech_stopped` (pausa natural). */
function shouldDeferResponseCreateToClient() {
  if (isRealtimeMeetingMode()) return false;
  return getRealtimeVoiceRuntimeConfig().responseDelayMs > 0;
}

function voiceDebugLog(...args) {
  if (!getRealtimeVoiceRuntimeConfig().voiceDebug) return;
  console.debug('[impetus-realtime-voice]', ...args);
}

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

const VOICE_ASSISTANT_CORE_PT =
  'Você é a assistente de voz do sistema IMPETUS.\n\n' +
  'Fale sempre em português do Brasil.\n\n' +
  'Sua comunicação deve ser:\n' +
  '- curta\n' +
  '- direta\n' +
  '- natural\n' +
  '- humana\n\n' +
  'Responda sempre com no máximo 1 ou 2 frases curtas.\n\n' +
  'Nunca faça respostas longas.\n\n' +
  'Nunca explique demais.\n\n' +
  'Nunca fale como robô.\n\n' +
  'Evite:\n' +
  '- introduções\n' +
  '- formalidade excessiva\n' +
  '- repetição\n' +
  '- frases longas\n' +
  '- listas faladas\n' +
  '- parágrafos ou explicações extensas por voz\n\n' +
  'Fale como um humano em uma conversa real: calmo, sem pressa, sem atropelar.\n\n' +
  'Seja clara e objetiva.\n\n' +
  'Prefira silêncio do que excesso de fala.\n\n' +
  'Nunca use encerramentos vazios nem clichês de assistente (ex.: «Com base nos dados analisados», «De acordo com a sua solicitação», «Posso te ajudar com mais alguma coisa»).\n\n' +
  'Exemplos de tom: «Já vi aqui.», «Te mostro agora.», «Tem uma queda na linha A.», «Produção está normal.».';

const IMPETUS_DATA_GOVERNANCE_PT =
  'GOVERNANÇA DE DADOS IMPETUS (obrigatório):\n' +
  'Só podes informar com base em dados internos do IMPETUS fornecidos nesta sessão (bloco «CONTEXTO IMPETUS» do servidor, quando existir).\n' +
  'Não uses conhecimento externo genérico nem inventes números, estados de linha, stocks, pessoas ou eventos.\n' +
  'Respeita o cargo, o perfil e as permissões descritas nesse contexto.\n' +
  'Se não houver dado interno para a pergunta, diz: «Não encontrei essa informação no sistema.»\n' +
  'Se o utilizador pedir algo fora da permissão dele, recusa educadamente: não estás autorizada a fornecer isso.\n' +
  'Para valores operacionais, só afirma o que constar no contexto IMPETUS; senão não afirmes.';

const PT_BR_HARD_LOCK =
  'IDIOMA OBRIGATÓRIO: português do Brasil (pt-BR) em todas as respostas faladas. ' +
  'Proibido espanhol, inglês, português de Portugal ou outro idioma — mesmo palavras soltas. ' +
  'Se houver ambiguidade, use vocabulário brasileiro (ex.: celular, não móvil). ' +
  'Contexto industrial/corporativo: segura e simples, sem formalidade forçada.';

const BASE_INSTRUCTIONS = `${VOICE_ASSISTANT_CORE_PT}\n\n${IMPETUS_DATA_GOVERNANCE_PT}\n\n${PT_BR_HARD_LOCK}`;

const MEETING_INSTRUCTIONS =
  `${VOICE_ASSISTANT_CORE_PT}\n\n${IMPETUS_DATA_GOVERNANCE_PT}\n\n` +
  'Modo reunião: no máximo uma frase curta por turno; tom ainda mais calmo.\n\n' +
  PT_BR_HARD_LOCK;

/**
 * Monta o session.update inicial (VAD + instruções). `envInstructions` sobrescreve o texto se não vazio.
 * `serverContextAppend` — texto do GET /dashboard/voice-realtime-context (dados + acesso).
 */
export function buildImpetusRealtimeSessionUpdate(envInstructions = '', serverContextAppend = '') {
  const meeting = isRealtimeMeetingMode();
  const cfg = getRealtimeVoiceRuntimeConfig();
  const instr = String(envInstructions || '').trim();
  let instructions = instr || (meeting ? MEETING_INSTRUCTIONS : BASE_INSTRUCTIONS);
  const server = String(serverContextAppend || '').trim();
  if (server) {
    instructions = `${instructions}\n\n--- CONTEXTO IMPETUS (servidor: dados reais e limites de acesso) ---\n\n${server}`;
  }

  /* Mais silêncio após o utilizador = menos resposta precoce; reunião ainda mais paciente. */
  const silenceMs = meeting ? 1020 : 920;
  const threshold = meeting ? 0.53 : 0.52;
  const prefixPaddingMs = meeting ? 520 : 480;
  const deferCreate = shouldDeferResponseCreateToClient();

  voiceDebugLog('session.update build', {
    speed: cfg.voiceSpeed,
    maxSpeechMs: cfg.maxSpeechMs,
    maxResponseTokens: cfg.maxResponseTokens,
    interruptResponse: cfg.interruptResponse,
    responseDelayMs: cfg.responseDelayMs,
    deferResponseCreate: deferCreate,
    silenceMs,
    threshold,
    prefixPaddingMs
  });
  const turnDetection = {
    type: 'server_vad',
    threshold,
    prefix_padding_ms: prefixPaddingMs,
    silence_duration_ms: silenceMs,
    /* Se deferCreate: pausa = VITE_REALTIME_RESPONSE_DELAY_MS antes de response.create (cliente). */
    create_response: !deferCreate,
    interrupt_response: cfg.interruptResponse
  };

  return {
    type: 'session.update',
    session: {
      instructions,
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      speed: cfg.voiceSpeed,
      max_response_output_tokens: cfg.maxResponseTokens,
      // Transcrição do microfone em português — reduz confusão com espanhol no pipeline.
      input_audio_transcription: {
        model: 'whisper-1',
        language: 'pt',
        prompt: 'Português do Brasil. Operador industrial. Não transcrever em espanhol.'
      },
      turn_detection: turnDetection
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
    /** Item da assistente na conversa (truncate em interrupção). */
    this._assistantItemId = null;
    this._speechStartedAtFirstDelta = null;
    /** Após cap / barge-in: ignorar mais deltas PCM até nova resposta. */
    this._suppressIncomingAssistantAudio = false;
    this._bargeInBlockStreak = 0;
    this._lastInterruptAt = 0;
    /** Duração PCM agendada na resposta atual (corte mesmo com poucos deltas). */
    this._assistantPcmSecondsAccumulated = 0;
    /** `response.create` diferido após speech_stopped (pausa antes da IA falar). */
    this._pendingResponseTimer = null;
  }

  getPhase() {
    return this.phase;
  }

  /** Resolve quando a fila PCM local da assistente esvaziou (para lipsync / D-ID depois do áudio). */
  waitUntilPlaybackIdle(maxMs = 90000) {
    return new Promise((resolve) => {
      const t0 = Date.now();
      const step = () => {
        if (Date.now() - t0 > maxMs) {
          resolve();
          return;
        }
        const p = this.player;
        if (!p || p.isPlaybackIdle()) {
          resolve();
          return;
        }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
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

  _clearPendingResponseTimer() {
    if (this._pendingResponseTimer) {
      clearTimeout(this._pendingResponseTimer);
      this._pendingResponseTimer = null;
    }
  }

  /** Agenda resposta após o utilizador calar (só com deferResponseCreate + delay > 0). */
  _scheduleResponseCreateAfterUserSilence() {
    this._clearPendingResponseTimer();
    if (!shouldDeferResponseCreateToClient()) return;
    const delayMs = getRealtimeVoiceRuntimeConfig().responseDelayMs;
    if (delayMs <= 0) return;
    this._pendingResponseTimer = setTimeout(() => {
      this._pendingResponseTimer = null;
      if (!this.connected) return;
      try {
        this.send({ type: 'response.create' });
        console.info('[impetus-realtime-voice] response.create after user silence', {
          delayMs,
          speed: getRealtimeVoiceRuntimeConfig().voiceSpeed
        });
      } catch (_) {}
    }, delayMs);
  }

  _resetAssistantSpeechBudget() {
    this._speechStartedAtFirstDelta = null;
    this._suppressIncomingAssistantAudio = false;
    this._assistantPcmSecondsAccumulated = 0;
  }

  _noteAssistantItemFromServerEvent(ev) {
    const t = ev?.type || '';
    if (t === 'response.output_item.added' && ev.item) {
      const role = ev.item.role;
      const typ = ev.item.type;
      if (role === 'assistant' || typ === 'message') {
        this._assistantItemId = ev.item.id || null;
        voiceDebugLog('assistant output item', this._assistantItemId);
      }
    }
  }

  /**
   * Utilizador fala por cima da assistente (ou corte por tempo máximo).
   * Half-duplex: sem isto o servidor quase não vê áudio durante playback — por isso também há barge-in local (RMS).
   */
  _interruptAssistantForUserSpeech(reason) {
    const cfg = getRealtimeVoiceRuntimeConfig();
    if (!cfg.interruptResponse) return;
    const now = Date.now();
    if (now - this._lastInterruptAt < 95) return;
    this._lastInterruptAt = now;

    this._clearPendingResponseTimer();

    const elapsed = this._speechStartedAtFirstDelta != null ? now - this._speechStartedAtFirstDelta : null;
    console.info('[impetus-realtime-voice] interrupt (user / cap)', {
      reason,
      phase: this.phase,
      assistantItemId: this._assistantItemId,
      assistantSpeechElapsedMs: elapsed,
      speed: cfg.voiceSpeed,
      maxSpeechMs: cfg.maxSpeechMs
    });

    try {
      this.player?.stopAllQueued?.();
    } catch (_) {}
    try {
      if (this.connected) this.send({ type: 'response.cancel' });
    } catch (_) {}
    /* output_audio_buffer.clear existe só nalguns modos/WebRTC; o proxy Realtime HTTP rejeita. Basta cancel + PCM local. */

    const itemId = this._assistantItemId;
    if (itemId && this.connected) {
      try {
        this.send({
          type: 'conversation.item.truncate',
          item_id: itemId,
          content_index: 0,
          audio_end_ms: 0
        });
      } catch (_) {}
    }

    this._suppressIncomingAssistantAudio = true;
    this.appendMicToApi = true;
    this._clearUnsuppressTimer();
    this._setPhase('listening');
  }

  _onAssistantAudioDelta() {
    const cfg = getRealtimeVoiceRuntimeConfig();
    if (this._suppressIncomingAssistantAudio) return;
    const now = Date.now();
    if (this._speechStartedAtFirstDelta == null) {
      this._speechStartedAtFirstDelta = now;
      console.info('[impetus-realtime-voice] assistant speech started (first PCM delta)', {
        speed: cfg.voiceSpeed,
        maxSpeechMs: cfg.maxSpeechMs,
        maxResponseTokens: cfg.maxResponseTokens,
        atMs: now
      });
      voiceDebugLog('assistant PCM stream started');
      return;
    }
    const elapsed = now - this._speechStartedAtFirstDelta;
    if (elapsed >= cfg.maxSpeechMs) {
      console.info('[impetus-realtime-voice] speech cut — wall-clock limit', {
        assistantSpeechElapsedMs: elapsed,
        maxMs: cfg.maxSpeechMs,
        speed: cfg.voiceSpeed
      });
      this._interruptAssistantForUserSpeech('max_speech_ms');
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
    const ir = getRealtimeVoiceRuntimeConfig().interruptResponse;
    const defer = shouldDeferResponseCreateToClient();
    try {
      this.send({
        type: 'session.update',
        session: {
          turn_detection: {
            type: 'server_vad',
            threshold,
            prefix_padding_ms: 420,
            silence_duration_ms: silence,
            create_response: !defer,
            interrupt_response: ir
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
        sessionUpdate ||
          buildImpetusRealtimeSessionUpdate(String(import.meta.env.VITE_REALTIME_INSTRUCTIONS || ''), '');

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
            console.info('[impetus-realtime-voice] connected; session.update sent', getRealtimeVoiceRuntimeConfig());
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

        this._noteAssistantItemFromServerEvent(ev);

        if (t === 'input_audio_buffer.speech_started') {
          this._clearPendingResponseTimer();
          if (this.phase === 'speaking' || !this.appendMicToApi) {
            this._interruptAssistantForUserSpeech('server_speech_started');
          }
        }

        if (t === 'input_audio_buffer.speech_stopped') {
          this._scheduleResponseCreateAfterUserSilence();
        }

        if (t === 'response.created') {
          this._resetAssistantSpeechBudget();
          voiceDebugLog('response.created', ev.response?.id);
          const c = getRealtimeVoiceRuntimeConfig();
          console.info('[impetus-realtime-voice] response.created (assistant turn)', {
            responseId: ev.response?.id,
            speed: c.voiceSpeed,
            maxSpeechMs: c.maxSpeechMs,
            maxResponseTokens: c.maxResponseTokens
          });
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
          const doneAt = Date.now();
          const spokeFor =
            this._speechStartedAtFirstDelta != null ? doneAt - this._speechStartedAtFirstDelta : null;
          console.info('[impetus-realtime-voice] assistant speech ended (response.done)', {
            assistantSpeechDurationMs: spokeFor,
            speed: getRealtimeVoiceRuntimeConfig().voiceSpeed,
            maxSpeechMs: getRealtimeVoiceRuntimeConfig().maxSpeechMs
          });
          this._assistantItemId = null;
          this._resetAssistantSpeechBudget();
          this._scheduleMicUnsuppress();
        }

        this.onEvent(ev);

        const isAudioDelta =
          t === 'response.output_audio.delta' ||
          t === 'response.audio.delta';
        if (isAudioDelta && ev.delta) {
          const cfgAudio = getRealtimeVoiceRuntimeConfig();
          if (!this._suppressIncomingAssistantAudio) {
            try {
              const ab = base64ToArrayBuffer(ev.delta);
              const pcmSec = new Int16Array(ab).length / OUTPUT_SAMPLE_RATE;
              this._assistantPcmSecondsAccumulated += pcmSec;
              if (this._assistantPcmSecondsAccumulated * 1000 >= cfgAudio.maxSpeechMs) {
                console.info('[impetus-realtime-voice] speech cut — PCM limit reached', {
                  pcmSeconds: this._assistantPcmSecondsAccumulated,
                  maxMs: cfgAudio.maxSpeechMs,
                  speed: cfgAudio.voiceSpeed
                });
                this._interruptAssistantForUserSpeech('max_speech_pcm');
              }
            } catch (_) {}
            this._onAssistantAudioDelta();
          }
          if (!this._suppressIncomingAssistantAudio) {
            if (!this.player) {
              this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              this.player = new Pcm24kPlayer(this.audioCtx);
            }
            if (this.audioCtx.state === 'suspended') {
              this.audioCtx.resume().catch(() => {});
            }
            this.player.pushBase64Delta(ev.delta);
          }
        }

        if (t === 'error') {
          this.appendMicToApi = true;
          this._suppressIncomingAssistantAudio = false;
          this._assistantItemId = null;
          this._clearUnsuppressTimer();
          this._setPhase('listening');
          console.warn('[impetus-realtime-voice] server error event', ev.error || ev);
        }
      };
    });
  }

  send(obj) {
    if (!this.connected) throw new Error('WebSocket fechado');
    this.ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
  }

  cancelResponse() {
    this._clearPendingResponseTimer();
    if (!this.connected) return;
    try {
      this.send({ type: 'response.cancel' });
    } catch (_) {}
    try {
      this.player?.resetSchedule();
    } catch (_) {}
    this._suppressIncomingAssistantAudio = true;
    this._speechStartedAtFirstDelta = null;
  }

  /** Corta fila PCM local (evita «duas vozes» sobrepostas). */
  stopAssistantPlayback() {
    try {
      this.player?.stopAllQueued?.();
    } catch (_) {}
    try {
      this.player?.resetSchedule?.();
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
      let sum = 0;
      for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
      const rms = Math.sqrt(sum / (input.length || 1));
      const cfg = getRealtimeVoiceRuntimeConfig();

      if (this.appendMicToApi) {
        this._ambientNoiseEma = this._ambientNoiseEma * 0.92 + rms * 0.08;
      }

      /* Barge-in local: durante playback a API não recebe mic — VAD do servidor não corta a tempo. */
      if (!this.appendMicToApi && this.phase === 'speaking' && cfg.interruptResponse) {
        if (rms > cfg.localBargeRms) {
          this._bargeInBlockStreak += 1;
        } else {
          this._bargeInBlockStreak = Math.max(0, this._bargeInBlockStreak - 1);
        }
        if (this._bargeInBlockStreak >= cfg.localBargeBlocks) {
          this._bargeInBlockStreak = 0;
          voiceDebugLog('local barge-in RMS', rms.toFixed(4));
          this._interruptAssistantForUserSpeech('local_mic_rms');
        }
      } else {
        this._bargeInBlockStreak = 0;
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
    this._clearPendingResponseTimer();
    this._clearUnsuppressTimer();
    this._clearVadTuneTimer();
    this._assistantItemId = null;
    this._resetAssistantSpeechBudget();
    this._bargeInBlockStreak = 0;
    this._lastInterruptAt = 0;
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
