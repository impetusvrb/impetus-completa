/**
 * TTS — Google Cloud Text-to-Speech (pt-BR Neural2, voz feminina conversacional).
 * Credenciais: config/google-tts.json (ou GOOGLE_TTS_KEYFILE / GOOGLE_APPLICATION_CREDENTIALS).
 */
'use strict';

const fs = require('fs');
const path = require('path');

/** Raiz do pacote backend (…/backend), independente do cwd ao subir o processo */
const BACKEND_ROOT = path.join(__dirname, '..', '..');
const DEFAULT_KEY_FILE = path.join(BACKEND_ROOT, 'config', 'google-tts.json');

const DEFAULT_VOICE = 'pt-BR-Chirp3-HD-Aoede';

function getVoiceLang() {
  return (process.env.GOOGLE_TTS_LANG || 'pt-BR').trim();
}
function getVoiceName() {
  return (process.env.GOOGLE_TTS_VOICE || DEFAULT_VOICE).trim();
}

function voiceSupportsPitch(name) {
  const n = String(name || '');
  if (/chirp/i.test(n)) return false;
  return true;
}

function isChirpVoice() {
  return /chirp/i.test(getVoiceName());
}

function chirpSsmlOuterMode() {
  const m = String(process.env.GOOGLE_TTS_SSML_OUTER_MODE || 'pct').trim().toLowerCase();
  return m === 'st' ? 'st' : 'pct';
}

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

function ttsProsodyFingerprint() {
  const pRaw = String(process.env.GOOGLE_TTS_PITCH ?? '-0.5').trim();
  const p = voiceSupportsPitch(getVoiceName()) ? pRaw : 'na';
  const chirp = isChirpVoice();
  const outer = chirp
    ? chirpSsmlOuterMode() === 'st'
      ? `st${chirpSsmlOuterSemitones()}`
      : `bp${String(process.env.GOOGLE_TTS_SSML_BASE_PITCH_PCT ?? '-1').trim()}:br${String(process.env.GOOGLE_TTS_SSML_BASE_RATE_PCT ?? '98').trim()}`
    : 'na';
  const fall = chirp
    ? `fp${String(process.env.GOOGLE_TTS_SSML_FALL_PITCH_PCT ?? '-2').trim()}:fr${String(process.env.GOOGLE_TTS_SSML_FALL_RATE_PCT ?? '93').trim()}`
    : 'na';
  const emph = String(process.env.GOOGLE_TTS_SSML_EMPHASIS || 'moderate').trim().toLowerCase();
  const r = String(process.env.GOOGLE_TTS_DEFAULT_SPEAKING_RATE ?? '0.95').trim();
  const v = String(process.env.GOOGLE_TTS_VOLUME_GAIN_DB ?? '1.5').trim();
  const ssml = process.env.GOOGLE_TTS_USE_SSML === 'false' ? '0' : '1';
  const fallOn = process.env.GOOGLE_TTS_SSML_SENTENCE_FALL === 'false' ? '0' : '1';
  return `p${p}:chirp${outer}:${fall}:emph${emph}:fall${fallOn}:r${r}:v${v}:ssml${ssml}`;
}

let client = null;

function resolveKeyFilenameFromEnv() {
  if (!process.env.GOOGLE_TTS_KEYFILE) return null;
  const p = process.env.GOOGLE_TTS_KEYFILE.trim();
  return path.isAbsolute(p) ? path.resolve(p) : path.resolve(BACKEND_ROOT, p);
}

/**
 * Caminho absoluto do JSON da conta de serviço, ou null.
 * Aceita caminhos relativos ao cwd (ex.: raiz do repo) ou ao BACKEND_ROOT.
 */
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

  // ./backend/config/google-tts.json a partir da raiz do repo → …/backend/config/google-tts.json
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
    console.warn('[voiceTts] Google TTS client init failed:', e?.message || e);
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

const SENTENCE_SPLIT_RE = /(?<=[!?…])\s+|\n+/u;

function emphasisLevel() {
  const e = String(process.env.GOOGLE_TTS_SSML_EMPHASIS || 'moderate').trim().toLowerCase();
  return e === 'strong' || e === 'moderate' || e === 'reduced' ? e : 'moderate';
}

function breakAfterPunctuationMs() {
  const n = parseInt(process.env.GOOGLE_TTS_BREAK_MS, 10);
  return Number.isFinite(n) ? Math.min(800, Math.max(80, n)) : 220;
}

function breakBetweenChunksMs() {
  const n = parseInt(process.env.GOOGLE_TTS_SENTENCE_BREAK_MS, 10);
  return Number.isFinite(n) ? Math.min(900, Math.max(80, n)) : 200;
}

function wrapSentenceTail(escapedSentence) {
  if (process.env.GOOGLE_TTS_SSML_SENTENCE_FALL === 'false') return escapedSentence;
  const s = String(escapedSentence || '').trim();
  if (s.length < 14) return s;

  const fp = pctAttr(process.env.GOOGLE_TTS_SSML_FALL_PITCH_PCT, '-2');
  const fr = pctAttr(process.env.GOOGLE_TTS_SSML_FALL_RATE_PCT, '93');

  const lc = s.lastIndexOf(',');
  if (lc >= Math.floor(s.length * 0.28) && lc < s.length - 10) {
    const head = s.slice(0, lc + 1);
    const tail = s.slice(lc + 1).trim();
    if (tail.length >= 6) {
      return `${head} <prosody pitch="${fp}" rate="${fr}">${tail}</prosody>`;
    }
  }

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 5) return s;
  const k = Math.max(1, Math.ceil(words.length * 0.7));
  const head = words.slice(0, k).join(' ');
  const tail = words.slice(k).join(' ');
  if (tail.length < 8) return s;
  return `${head} <prosody pitch="${fp}" rate="${fr}">${tail}</prosody>`;
}

function plainTextToSsml(text) {
  const brPunct = breakAfterPunctuationMs();
  const brChunk = breakBetweenChunksMs();
  const raw = String(text || '').trim();
  const chunks = raw
    .split(SENTENCE_SPLIT_RE)
    .map((x) => x.trim())
    .filter(Boolean);
  const processed =
    chunks.length > 0
      ? chunks.map((c) => wrapSentenceTail(escapeXml(c))).join(`<break time="${brChunk}ms"/> `)
      : wrapSentenceTail(escapeXml(raw));

  let inner = processed;
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

function splitForNaturalTts(text) {
  let t = String(text || '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return [];
  const raw = t.split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter(Boolean);
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

/**
 * @param {string} text
 * @param {{ voice?: string, speed?: number }} _opts voz fixa via VOICE_NAME; speed → speakingRate
 */
async function synthesizeMp3(text, _opts = {}) {
  const tts = getTextToSpeechClient();
  if (!tts) return null;

  const cleaned = String(text || '')
    .replace(/[*_`#]/g, '')
    .trim()
    .slice(0, 5000);
  if (!cleaned) return null;

  const useSsml = process.env.GOOGLE_TTS_USE_SSML !== 'false';
  const { pitch, speakingRate, volumeGainDb } = resolveAudioConfig(_opts);

  const voice = { languageCode: getVoiceLang(), name: getVoiceName() };
  const audioConfig = {
    audioEncoding: 'MP3',
    speakingRate,
    volumeGainDb,
    ...(pitch != null ? { pitch } : {})
  };

  const tryOnce = async (input) => {
    const [response] = await tts.synthesizeSpeech({ input, voice, audioConfig });
    const audio = response.audioContent;
    if (!audio) return null;
    return Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
  };

  try {
    if (useSsml) {
      const ssml = /^<speak[\s>]/i.test(cleaned) ? cleaned : plainTextToSsml(cleaned);
      const buf = await tryOnce({ ssml });
      if (buf?.length) return buf;
    }
    return await tryOnce({ text: cleaned });
  } catch (e) {
    if (useSsml) {
      try {
        return await tryOnce({ text: cleaned });
      } catch (e2) {
        console.warn('[voiceTts] Google synthesizeSpeech:', e2?.message || e2);
        return null;
      }
    }
    console.warn('[voiceTts] Google synthesizeSpeech:', e?.message || e);
    return null;
  }
}

function ttsEngineFingerprint() {
  return `google:${getVoiceLang()}:${getVoiceName()}:${ttsProsodyFingerprint()}`;
}

module.exports = {
  synthesizeMp3,
  splitForNaturalTts,
  getTtsAvailable,
  /** @deprecated use getTtsAvailable */
  getOpenaiAvailable: getTtsAvailable,
  ttsEngineFingerprint,
  getVoiceName,
  getVoiceLang,
  /** útil para diagnóstico / health */
  resolveServiceAccountJsonPath
};
