/**
 * Google Cloud Text-to-Speech — núcleo usado por voiceTtsService (PM2: impetus_complete/backend).
 * Prosódia: speakingRate, volumeGainDb; pitch na API só fora de Chirp.
 * Chirp3: SSML com prosody em % (BASE/FALL), ênfase em Impetus, pausas e queda de tom no remate.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.join(__dirname, '..', '..');
const DEFAULT_KEY_FILE = path.join(BACKEND_ROOT, 'config', 'google-tts.json');

/** Padrão: Neural2 feminina pt-BR (override: GOOGLE_TTS_VOICE). Masculina: pt-BR-Neural2-B. */
const DEFAULT_VOICE = 'pt-BR-Neural2-C';

function getVoiceLang() {
  return (process.env.GOOGLE_TTS_LANG || 'pt-BR').trim();
}
function getVoiceName() {
  return (process.env.GOOGLE_TTS_VOICE || DEFAULT_VOICE).trim();
}

/** Chirp / algumas vozes premium não aceitam `pitch` na API (INVALID_ARGUMENT). */
function voiceSupportsPitch(name) {
  const n = String(name || '');
  if (/chirp/i.test(n)) return false;
  return true;
}

function isChirpVoice() {
  return /chirp/i.test(getVoiceName());
}

/** Envelope SSML em vozes Neural/Wavenet: tom mais firme (pitch st + rate %). Desligar: GOOGLE_TTS_SSML_NEURAL_OUTER=false */
function neuralSsmlOuterEnabled() {
  if (String(process.env.GOOGLE_TTS_SSML_NEURAL_OUTER || '').trim().toLowerCase() === 'false') {
    return false;
  }
  return voiceSupportsPitch(getVoiceName()) && !isChirpVoice();
}

function neuralOuterPitchSt() {
  const st = parseFloat(process.env.GOOGLE_TTS_SSML_NEURAL_OUTER_PITCH_ST ?? '-8');
  return Number.isFinite(st) ? Math.min(20, Math.max(-20, st)) : -8;
}

function neuralOuterRatePctAttr() {
  const raw = String(process.env.GOOGLE_TTS_SSML_NEURAL_OUTER_RATE_PCT ?? '-17').trim();
  if (!raw) return '-17%';
  return raw.endsWith('%') ? raw : `${raw}%`;
}

const NEURAL_SSML_VOLUME_ENUM = new Set(['silent', 'x-soft', 'soft', 'medium', 'loud', 'x-loud']);

/** Atributo SSML `volume` no envelope Neural. Só aplica se definido (padrão: sem atributo). */
function neuralOuterVolumeAttr() {
  const raw = String(process.env.GOOGLE_TTS_SSML_NEURAL_OUTER_VOLUME ?? '').trim();
  if (!raw || raw.toLowerCase() === 'omit' || raw === '-') return '';
  const v = raw.toLowerCase();
  if (NEURAL_SSML_VOLUME_ENUM.has(v)) return ` volume="${v}"`;
  if (/^[+-]?\d+(\.\d+)?dB$/i.test(raw)) return ` volume="${raw}"`;
  return '';
}

function neuralOuterProsodyOpen() {
  const pst = neuralOuterPitchSt();
  const rp = neuralOuterRatePctAttr();
  const vol = neuralOuterVolumeAttr();
  return `<prosody pitch="${pst}st" rate="${rp}"${vol}>`;
}

/** Modo externo SSML no Chirp: `pct` (pitch/rate em %) ou `st` (semitons, legado). */
function chirpSsmlOuterMode() {
  const m = String(process.env.GOOGLE_TTS_SSML_OUTER_MODE || 'pct').trim().toLowerCase();
  return m === 'st' ? 'st' : 'pct';
}

/** Semitons no wrapper externo (só Chirp + GOOGLE_TTS_SSML_OUTER_MODE=st). */
function chirpSsmlOuterSemitones() {
  if (!isChirpVoice() || chirpSsmlOuterMode() !== 'st') return null;
  const stRaw = parseFloat(process.env.GOOGLE_TTS_SSML_PITCH_ST ?? process.env.GOOGLE_TTS_PITCH ?? '-0.5');
  return Number.isFinite(stRaw) ? Math.min(20, Math.max(-20, stRaw)) : -0.5;
}

function pctAttr(raw, fallbackNum) {
  const s = String(raw != null ? raw : fallbackNum).trim();
  if (!s) return `${fallbackNum}%`;
  return s.endsWith('%') ? s : `${s}%`;
}

/** Pausa curta só após o último trecho (respiro final; 0 = desliga). */
function chunkClosureMs() {
  const n = parseInt(process.env.GOOGLE_TTS_SSML_CHUNK_CLOSURE_MS, 10);
  if (!Number.isFinite(n)) return 280;
  return Math.min(520, Math.max(0, n));
}

/** Perfil de prosódia para invalidar cache quando .env mudar. */
function ttsProsodyFingerprint() {
  const pRaw = String(process.env.GOOGLE_TTS_PITCH ?? '-0.5').trim();
  const p = voiceSupportsPitch(getVoiceName()) ? pRaw : 'na';
  const chirp = isChirpVoice();
  const outer = chirp ? (chirpSsmlOuterMode() === 'st' ? `st${chirpSsmlOuterSemitones()}` : `bp${String(process.env.GOOGLE_TTS_SSML_BASE_PITCH_PCT ?? '-1').trim()}:br${String(process.env.GOOGLE_TTS_SSML_BASE_RATE_PCT ?? '98').trim()}`) : 'na';
  const fall = chirp
    ? `fp${String(process.env.GOOGLE_TTS_SSML_FALL_PITCH_PCT ?? '-2').trim()}:fr${String(process.env.GOOGLE_TTS_SSML_FALL_RATE_PCT ?? '93').trim()}`
    : 'na';
  const emph = String(process.env.GOOGLE_TTS_SSML_EMPHASIS || 'moderate').trim().toLowerCase();
  const r = String(process.env.GOOGLE_TTS_DEFAULT_SPEAKING_RATE ?? '0.95').trim();
  const v = String(process.env.GOOGLE_TTS_VOLUME_GAIN_DB ?? '1.5').trim();
  const ssml = process.env.GOOGLE_TTS_USE_SSML === 'false' ? '0' : '1';
  const fallOn = process.env.GOOGLE_TTS_SSML_SENTENCE_FALL === 'false' ? '0' : '1';
  const breath = String(process.env.GOOGLE_TTS_SSML_BREATH_MAX ?? '2').trim();
  const nv = neuralSsmlOuterEnabled()
    ? `n${neuralOuterPitchSt()}:nr${neuralOuterRatePctAttr()}:nv${String(process.env.GOOGLE_TTS_SSML_NEURAL_OUTER_VOLUME ?? '').trim() || 'omit'}`
    : 'na';
  const nat = `bp${breakAfterPunctuationMs()}:bc${breakBetweenChunksMs()}:cl${chunkClosureMs()}:rh${String(process.env.GOOGLE_TTS_SSML_RHYTHM_ALT_RATE_PCT ?? '+6').trim()}:fs${String(process.env.GOOGLE_TTS_SSML_FINAL_SLOW_RATE_PCT ?? '-5').trim()}`;
  return `p${p}:chirp${outer}:${fall}:emph${emph}:fall${fallOn}:br${breath}:r${r}:v${v}:ssml${ssml}:neural${nv}:nat${nat}`;
}

let client = null;

function resolveKeyFilenameFromEnv() {
  if (!process.env.GOOGLE_TTS_KEYFILE) return null;
  const p = process.env.GOOGLE_TTS_KEYFILE.trim();
  return path.isAbsolute(p) ? path.resolve(p) : path.resolve(BACKEND_ROOT, p);
}

function resolveServiceAccountJsonPath() {
  const fromKeyFile = resolveKeyFilenameFromEnv();
  if (fromKeyFile && fs.existsSync(fromKeyFile)) return fromKeyFile;

  if (fs.existsSync(DEFAULT_KEY_FILE)) return path.resolve(DEFAULT_KEY_FILE);

  const adc = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();
  if (!adc) return null;

  if (path.isAbsolute(adc)) {
    const abs = path.resolve(adc);
    return fs.existsSync(abs) ? abs : null;
  }

  const trimmed = adc.trim();
  const noDot = trimmed.replace(/^\.\//, '');
  const candidates = new Set([
    path.resolve(process.cwd(), trimmed),
    path.resolve(BACKEND_ROOT, trimmed),
    path.resolve(process.cwd(), noDot),
    path.resolve(BACKEND_ROOT, noDot)
  ]);

  if (noDot.startsWith('backend/') || noDot.startsWith('backend\\')) {
    candidates.add(path.resolve(BACKEND_ROOT, noDot.replace(/^backend[/\\]/, '')));
  }

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function getTextToSpeechClient() {
  if (client) return client;
  try {
    const jsonPath = resolveServiceAccountJsonPath();
    if (!jsonPath) return null;
    const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
    client = new TextToSpeechClient({ keyFilename: jsonPath });
    return client;
  } catch (e) {
    console.warn('[googleTtsCore] client init failed:', e?.message || e);
    return null;
  }
}

function getTtsAvailable() {
  return resolveServiceAccountJsonPath() != null;
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function emphasisLevel() {
  const e = String(process.env.GOOGLE_TTS_SSML_EMPHASIS || 'moderate').trim().toLowerCase();
  return e === 'strong' || e === 'moderate' || e === 'reduced' ? e : 'moderate';
}

function breakAfterPunctuationMs() {
  const n = parseInt(process.env.GOOGLE_TTS_BREAK_MS, 10);
  return Number.isFinite(n) ? Math.min(720, Math.max(80, n)) : 300;
}

function breakBetweenChunksMs() {
  const n = parseInt(process.env.GOOGLE_TTS_SENTENCE_BREAK_MS, 10);
  return Number.isFinite(n) ? Math.min(800, Math.max(100, n)) : 320;
}

/**
 * Queda suave de tom no remate da frase (última cláusula ou ~últimos 30% das palavras).
 */
function wrapSentenceTail(escapedSentence) {
  if (process.env.GOOGLE_TTS_SSML_SENTENCE_FALL === 'false') return escapedSentence;
  const s = String(escapedSentence || '').trim();
  if (s.length < 8) return s;

  const neuralSerious = neuralSsmlOuterEnabled();
  const fp = pctAttr(
    process.env.GOOGLE_TTS_SSML_FALL_PITCH_PCT,
    neuralSerious ? '-5' : '-3'
  );
  const fr = pctAttr(
    process.env.GOOGLE_TTS_SSML_FALL_RATE_PCT,
    neuralSerious ? '88' : '92'
  );

  const lc = s.lastIndexOf(',');
  if (lc >= Math.floor(s.length * 0.25) && lc < s.length - 8) {
    const head = s.slice(0, lc + 1);
    const tail = s.slice(lc + 1).trim();
    if (tail.length >= 5) {
      return `${head} <prosody pitch="${fp}" rate="${fr}">${tail}</prosody>`;
    }
  }

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 4) return s;
  const tailFrac = neuralSerious ? 0.74 : 0.76;
  const k = Math.max(1, Math.ceil(words.length * tailFrac));
  const head = words.slice(0, k).join(' ');
  const tail = words.slice(k).join(' ');
  if (tail.length < 6) return s;
  return `${head} <prosody pitch="${fp}" rate="${fr}">${tail}</prosody>`;
}

/**
 * “Respiração” após vírgulas — Chirp e Neural (desligar: GOOGLE_TTS_SSML_BREATH=false).
 */
function insertBreathingBreaks(escapedChunk) {
  if (process.env.GOOGLE_TTS_SSML_BREATH === 'false') return escapedChunk;
  const maxB = parseInt(process.env.GOOGLE_TTS_SSML_BREATH_MAX ?? '2', 10);
  const limit = Number.isFinite(maxB) ? Math.min(4, Math.max(0, maxB)) : 2;
  if (limit <= 0) return escapedChunk;
  const allow = isChirpVoice() || neuralSsmlOuterEnabled();
  if (!allow) return escapedChunk;

  const s = String(escapedChunk || '');
  const minLen = neuralSsmlOuterEnabled() ? 36 : 42;
  if (s.length < minLen) return escapedChunk;

  let n = 0;
  const base = neuralSsmlOuterEnabled() ? 130 : 150;
  const span = neuralSsmlOuterEnabled() ? 70 : 120;
  return s.replace(/,\s+/g, (match, offset) => {
    if (n >= limit) return ', ';
    const rest = s.slice(offset + match.length);
    if (rest.length < 16) return ', ';
    n += 1;
    const ms = base + ((offset * 31 + n * 47) % span);
    return `,<break time="${ms}ms"/> `;
  });
}

/** Quebra texto em trechos com pausas naturais (linhas, ; e vírgulas em blocos longos). */
function expandTextChunksForNaturalPauses(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const seeds = lines.length ? lines : [raw];
  const out = [];
  for (const line of seeds) {
    let parts = [line];
    if (line.length > 145 && /;\s/.test(line)) {
      const semi = line.split(/\s*;\s+/).map((x) => x.trim()).filter(Boolean);
      if (semi.length > 1) parts = semi;
    }
    for (const part of parts) {
      if (part.length > 195 && /,\s/.test(part)) {
        const bits = part.split(/,\s+/).map((x) => x.trim()).filter(Boolean);
        if (bits.length >= 2 && bits.length <= 3 && bits.every((b) => b.length >= 14)) {
          bits.forEach((b, j) => {
            out.push(j < bits.length - 1 ? `${b},` : b);
          });
          continue;
        }
      }
      out.push(part);
    }
  }
  return out.length ? out : [raw];
}

/** Prefixo SSML por sentimento (uma vez por resposta completa; stream só no 1º chunk). */
function intentLeadInSsml(sentiment) {
  if (String(process.env.GOOGLE_TTS_INTENT_PREFIX || '').trim().toLowerCase() === 'false') {
    return '';
  }
  const s = String(sentiment || '').toLowerCase().trim();
  if (s === 'urgente') {
    return `${escapeXml('Atenção.') }<break time="300ms"/> `;
  }
  if (s === 'positivo') {
    return `${escapeXml('Solicitação recebida.') }<break time="260ms"/> `;
  }
  if (s === 'negativo') {
    return `${escapeXml('Entendido.') }<break time="240ms"/> `;
  }
  return '';
}

/**
 * Micro variação: só trechos ímpares ganham leve “empurrão” (+rate); pares ficam limpos (mais fluxo).
 * Último trecho recebe desaceleração em wrapFinalChunkSlow (não duplicar aqui).
 */
function wrapNeuralRhythmVariation(rhythmIndex, innerXml, opts = {}) {
  if (!neuralSsmlOuterEnabled()) return innerXml;
  if (String(process.env.GOOGLE_TTS_SSML_RHYTHM_ALT || '').trim().toLowerCase() === 'false') {
    return innerXml;
  }
  const idx = Number.isFinite(rhythmIndex) ? rhythmIndex : 0;
  if (opts.isLastChunk) return innerXml;
  if (idx % 2 === 0) return innerXml;
  const liftRaw = String(process.env.GOOGLE_TTS_SSML_RHYTHM_ALT_RATE_PCT ?? '+6').trim();
  const lift = liftRaw.endsWith('%') ? liftRaw : `${liftRaw}%`;
  return `<prosody rate="${lift}">${innerXml}</prosody>`;
}

function wrapFinalChunkSlow(innerXml) {
  if (!neuralSsmlOuterEnabled()) return innerXml;
  if (String(process.env.GOOGLE_TTS_SSML_FINAL_SLOW || '').trim().toLowerCase() === 'false') {
    return innerXml;
  }
  const slowRaw = String(process.env.GOOGLE_TTS_SSML_FINAL_SLOW_RATE_PCT ?? '-5').trim();
  const sp = slowRaw.endsWith('%') ? slowRaw : `${slowRaw}%`;
  return `<prosody rate="${sp}">${innerXml}</prosody>`;
}

/**
 * Texto → SSML: muitas pausas, trechos curtos, queda no remate, variação de ritmo (Neural).
 * Frases vêm de newlines (preprocess) + ; e vírgulas em blocos longos.
 */
function plainTextToSsml(text, ssmlOpts = {}) {
  const brPunct = breakAfterPunctuationMs();
  const brChunk = breakBetweenChunksMs();
  const closure = chunkClosureMs();
  const raw = String(text || '').trim();
  const lead =
    ssmlOpts.skipIntentLeadIn === true ? '' : intentLeadInSsml(ssmlOpts.sentiment);
  const baseIdx = Number.isFinite(ssmlOpts.streamChunkIndex) ? ssmlOpts.streamChunkIndex : 0;

  let chunks = expandTextChunksForNaturalPauses(raw);
  if (!chunks.length) chunks = [raw];
  const nCh = chunks.length;

  const processed = chunks
    .map((c, idx) => {
      let e = escapeXml(c);
      e = insertBreathingBreaks(e);
      e = wrapSentenceTail(e);
      const isLast = idx === nCh - 1;
      e = wrapNeuralRhythmVariation(baseIdx + idx, e, { isLastChunk: isLast });
      if (isLast) e = wrapFinalChunkSlow(e);
      const tailBreak =
        closure > 0 && isLast ? `<break time="${closure}ms"/>` : '';
      return `${e}${tailBreak}`;
    })
    .join(` <break time="${brChunk}ms"/> `);

  let inner = lead + processed;
  const emph = emphasisLevel();
  inner = inner.replace(/\bImpetus\b/gi, (m) => `<emphasis level="${emph}">${m}</emphasis>`);
  inner = inner.replace(/([!?]|…)(\s+)/g, `$1<break time="${brPunct}ms"/>$2`);

  if (isChirpVoice()) {
    if (chirpSsmlOuterMode() === 'st') {
      const st = chirpSsmlOuterSemitones();
      if (st != null) {
        inner = `<prosody pitch="${st}st">${inner}</prosody>`;
      }
    } else {
      const bp = pctAttr(process.env.GOOGLE_TTS_SSML_BASE_PITCH_PCT, '-1');
      const br = pctAttr(process.env.GOOGLE_TTS_SSML_BASE_RATE_PCT, '98');
      inner = `<prosody pitch="${bp}" rate="${br}">${inner}</prosody>`;
    }
  } else if (neuralSsmlOuterEnabled()) {
    inner = `${neuralOuterProsodyOpen()}${inner}</prosody>`;
  }

  return `<speak>${inner}</speak>`;
}

function resolveAudioConfig(opts = {}) {
  const pitchRaw = parseFloat(process.env.GOOGLE_TTS_PITCH);
  let pitch = Number.isFinite(pitchRaw) ? Math.min(20, Math.max(-20, pitchRaw)) : -0.5;
  if (!voiceSupportsPitch(getVoiceName())) pitch = undefined;

  const defaultRate = parseFloat(process.env.GOOGLE_TTS_DEFAULT_SPEAKING_RATE);
  const baseRate = Number.isFinite(defaultRate) ? defaultRate : 0.95;
  let rate = parseFloat(opts.speed);
  if (!Number.isFinite(rate)) rate = baseRate;
  rate = Math.min(1.25, Math.max(0.75, rate));

  const volRaw = parseFloat(process.env.GOOGLE_TTS_VOLUME_GAIN_DB);
  const volumeGainDb = Number.isFinite(volRaw) ? Math.min(16, Math.max(-96, volRaw)) : 1.5;

  return { pitch, speakingRate: rate, volumeGainDb };
}

async function synthesizeMp3(text, opts = {}) {
  const tts = getTextToSpeechClient();
  if (!tts) return null;

  const cleaned = String(text || '')
    .replace(/[*_`#]/g, '')
    .trim()
    .slice(0, 5000);
  if (!cleaned) return null;

  const useSsml = process.env.GOOGLE_TTS_USE_SSML !== 'false';
  const isPregeneratedSsml = /^<speak[\s>]/i.test(cleaned);
  let { pitch, speakingRate, volumeGainDb } = resolveAudioConfig(opts);

  if (opts.prosodyInSsml && isPregeneratedSsml) {
    pitch = undefined;
    let r = parseFloat(opts.speed);
    if (!Number.isFinite(r)) r = 1.0;
    speakingRate = Math.min(1.25, Math.max(0.75, r));
  } else if (neuralSsmlOuterEnabled() && !isPregeneratedSsml && useSsml) {
    pitch = undefined;
  }

  const voice = { languageCode: getVoiceLang(), name: getVoiceName() };
  const audioConfig = {
    audioEncoding: 'MP3',
    speakingRate,
    volumeGainDb,
    ...(pitch != null ? { pitch } : {})
  };

  const tryOnce = async (input) => {
    const [response] = await tts.synthesizeSpeech({
      input,
      voice,
      audioConfig
    });
    const audio = response.audioContent;
    if (!audio) return null;
    return Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
  };

  try {
    if (useSsml) {
      const ssml = /^<speak[\s>]/i.test(cleaned)
        ? cleaned
        : plainTextToSsml(cleaned, {
            sentiment: opts.sentiment,
            skipIntentLeadIn: opts.skipIntentLeadIn === true,
            streamChunkIndex: opts.streamChunkIndex
          });
      const buf = await tryOnce({ ssml });
      if (buf?.length) return buf;
    }
    return await tryOnce({ text: cleaned });
  } catch (e) {
    if (useSsml) {
      try {
        return await tryOnce({ text: cleaned });
      } catch (e2) {
        console.warn('[googleTtsCore] synthesizeSpeech:', e2?.message || e2);
        return null;
      }
    }
    console.warn('[googleTtsCore] synthesizeSpeech:', e?.message || e);
    return null;
  }
}

function ttsEngineFingerprint() {
  return `google:${getVoiceLang()}:${getVoiceName()}:${ttsProsodyFingerprint()}`;
}

module.exports = {
  synthesizeMp3,
  getTtsAvailable,
  ttsEngineFingerprint,
  getVoiceName,
  getVoiceLang,
  resolveServiceAccountJsonPath,
  escapeXml,
  /** SSML `<prosody …>` de abertura (Neural) — fecha com `</prosody>` no template. */
  neuralOuterProsodyOpen,
  expandTextChunksForNaturalPauses
};
