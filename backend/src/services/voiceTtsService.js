/**
 * TTS centralizado — gpt-4o-mini-tts (natural + instructions) com fallback tts-1-hd.
 * Usado por /dashboard/chat/voice/speak e pelo WebSocket /impetus-voice.
 */
'use strict';
const OpenAI = require('openai').default;
const googleTts = require('./googleTtsCore');
const { escapeXml: escapeXmlForTts } = googleTts;

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Google só é usado se as credenciais existirem E não estiver forçado OpenAI.
 * .env: IMPETUS_TTS_PROVIDER=openai | google
 *      ou GOOGLE_TTS_ENABLED=false (equivale a preferir OpenAI quando houver chave).
 */
function preferOpenAiTts() {
  const p = String(process.env.IMPETUS_TTS_PROVIDER || process.env.TTS_ENGINE || '')
    .trim()
    .toLowerCase();
  if (p === 'openai') return true;
  if (p === 'google') return false;
  if (String(process.env.GOOGLE_TTS_ENABLED || '').trim().toLowerCase() === 'false') return true;
  return false;
}

function useGoogleCloudTts() {
  return googleTts.getTtsAvailable() && !preferOpenAiTts();
}

/**
 * Instruções padrão (Opção 1 — OpenAI): o segredo é RITMO + tom, não “clonar” voz.
 * Sobrescreva com OPENAI_TTS_INSTRUCTIONS no .env para A/B testar.
 */
const TTS_INSTRUCTIONS =
  (process.env.OPENAI_TTS_INSTRUCTIONS || '').trim() ||
  [
    'Voz feminina brasileira de assistente corporativa industrial: segura, objetiva, profissional.',
    'Comunicação clara e direta, com leve cordialidade. Sem entusiasmo exagerado, sem tom infantil.',
    'Ritmo firme; pausas curtas e reais após cada frase em ponto e entre mudanças de tópico.',
    'Entonação controlada e estável; nunca narração teatral nem falsa animação.',
    'Uma ideia por frase; respeite pontuação e quebras de linha como micro-pausas.'
  ].join(' ');

function clampNumber(v, min, max, fallback) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function buildExpressiveInstructions(baseInstructions, warmth, intonation, keywordEmphasis, syllabicVariation, finalFall) {
  const warmthStyle =
    warmth >= 0.75 ? 'calor humano evidente, acolhedora e próxima' :
    warmth >= 0.55 ? 'calor moderado, profissional e empática' :
    'calor contido, objetiva e neutra';
  const intonationStyle =
    intonation >= 0.75 ? 'entonação expressiva e variada, sem exagero teatral' :
    intonation >= 0.55 ? 'entonação natural e fluida, com variação moderada' :
    'entonação mais estável, ainda natural e não robótica';
  const emphasisStyle =
    keywordEmphasis >= 0.7
      ? 'dê leve destaque prosódico às palavras-chave operacionais (ex.: alerta, risco, prioridade, ação, próximo passo), sem teatralizar'
      : keywordEmphasis >= 0.45
        ? 'marque discretamente as palavras-chave operacionais mais importantes'
        : 'mantenha ênfase mínima e uniforme entre palavras';
  const syllableStyle =
    syllabicVariation >= 0.7
      ? 'aumente levemente o contraste entre sílabas tônicas e átonas para soar mais humano, mantendo naturalidade'
      : syllabicVariation >= 0.45
        ? 'aplique variação moderada entre sílabas para evitar fala plana'
        : 'mantenha variação silábica discreta e estável';
  const finalFallStyle =
    finalFall >= 0.7
      ? 'no fim de cada frase declarativa, faça uma queda suave de tom (entonação final decrescente), transmitindo conclusão natural e proximidade'
      : finalFall >= 0.45
        ? 'aplique leve queda de tom no final das frases para evitar término em tom alto constante'
        : 'mantenha queda final de tom mínima e discreta';
  return `${baseInstructions} Ajuste de expressividade: use ${warmthStyle}; mantenha ${intonationStyle}; ${emphasisStyle}; ${syllableStyle}; ${finalFallStyle}; varie levemente o ritmo entre frases curtas para evitar cadência robótica repetitiva.`;
}

// Ajustes de pronuncia PT-BR aplicados no backend para cobrir qualquer rota de TTS.
const PRONUNCIATION_RULES = [
  { re: /\bimpetus\b/gi, out: 'Im-pê-tus' },
  { re: /\bIA\b/g, out: 'i a' },
  { re: /\bOpenAI\b/g, out: 'O-pen-Ai' },
  { re: /\bTTS\b/g, out: 'T T S' }
];

function applyPronunciation(text) {
  let out = String(text || '');
  for (const { re, out: replacement } of PRONUNCIATION_RULES) {
    out = out.replace(re, replacement);
  }
  return out;
}

/** Primeiro nome para TTS / templates (evita ler nome completo em saudações). */
function firstNameFromDisplay(displayName) {
  const s = String(displayName || '').trim();
  if (!s) return '';
  return s.split(/\s+/)[0] || '';
}

/**
 * Substitui placeholders no texto antes do SSML.
 * Suporta `${usuario}`, `{{nome}}`, `{{tts_nome}}`, `__TTS_NOME__` (primeiro nome).
 * Não usa &lt;say-as interpret-as="characters"&gt; — isso soletra letra a letra.
 */
function applyTtsUserTemplates(text, displayName) {
  if (process.env.GOOGLE_TTS_TEMPLATE_NAME === 'false') return String(text || '');
  const first = firstNameFromDisplay(displayName);
  if (!first) return String(text || '');
  let out = String(text || '');
  const inSsml = /<speak[\s>]/i.test(out);
  const value = inSsml ? escapeXmlForTts(first) : first;
  const ph = ['${usuario}', '{{nome}}', '{{tts_nome}}', '__TTS_NOME__'];
  for (const p of ph) {
    if (out.includes(p)) out = out.split(p).join(value);
  }
  return out;
}

/**
 * Humaniza o texto ANTES do TTS, para tirar padrão “robótico” sem mudar a intenção.
 * Mantemos conservador: não adiciona pontos finais e evita criar novas sentenças.
 */
function humanizeForVoice(text, strength = 0.65) {
  let t = String(text || '');
  if (!t.trim()) return t;
  const s = Math.max(0, Math.min(1, Number(strength) || 0));
  if (s <= 0) return t;

  // Contrações e linguagem oral (sem alterar intenção).
  if (s >= 0.25) {
    t = t
      .replace(/\bpara\s+você\b/gi, 'pra você')
      .replace(/\bpara\s+o\s+senhor\b/gi, 'pro senhor')
      .replace(/\bpara\s+a\s+senhora\b/gi, 'pra senhora')
      .replace(/\bpor\s+favor\b/gi, '')
      .replace(/\bestou\s+verificando\b/gi, 'tô vendo')
      .replace(/\bestou\s+analisando\b/gi, 'tô analisando')
      .replace(/\bestou\s+chegando\b/gi, 'tô chegando')
      .replace(/\bverificando\b/gi, 'vendo')
      .replace(/\bRecomendo\b/gi, 'Eu recomendo')
      .replace(/\brecomendo\b/gi, 'eu recomendo');
  }

  // Troca bem específica para ganhar naturalidade sem criar nova frase.
  // Ex.: "Vou verificar X" -> "Deixa eu ver X"
  if (s >= 0.5) {
    t = t
      .replace(/\bVou\s+(verificar|checar|analisar)\b/gi, 'Deixa eu ver')
      .replace(/\bvou\s+(verificar|checar|analisar)\b/gi, 'deixa eu ver');
  }

  // Anti-gagueira: remove repetições do tipo "eu... eu" e "tô tô".
  if (s >= 0.45) {
    t = t
      .replace(/\b(eu|ah|é|uai|tá)\b\s*[.!?,;:\s…-]*\b(eu|ah|é|uai|tá)\b/gi, '$1')
      .replace(
        /\b([A-Za-zÀ-ÖØ-öø-ÿ]+)\b\s*[.!?,;:\s…-]+\s*\1\b/gi,
        '$1'
      )
      // remove início travado "eu..."/“ah...”
      .replace(/^\s*(?:eu|ah|é|uai|tá)\s*[.!?,;:\s…-]+\s*/i, '');
  }

  return t;
}

/** Quebra texto para streaming WS — mesma lógica de trechos curtos que o SSML do Google. */
function splitForNaturalTts(text) {
  let t = String(text || '')
    .replace(/\*\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\.{3,}/g, '…')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*([.!?…;:])\s*/g, '$1\n')
    .replace(/\s*;\s*/g, ';\n')
    .trim();
  if (!t) return [];
  const raw = googleTts.expandTextChunksForNaturalPauses(t);
  const chunks = [];
  for (const s of raw) {
    const part = s.trim();
    if (!part) continue;
    chunks.push(part.length > 150 ? `${part.slice(0, 147)}…` : part);
  }
  return chunks.length ? chunks : [t.slice(0, 400)];
}

function preprocessForNaturalSpeech(text) {
  const humanizeStrength = parseFloat(process.env.OPENAI_TTS_HUMANIZE_STRENGTH) || 0.65;
  return humanizeForVoice(applyPronunciation(String(text || '')), humanizeStrength)
    .replace(/[*_`#]/g, '')
    .replace(/\r\n?/g, '\n')
    // Normaliza elipses para um único caractere (pausa consistente).
    .replace(/\.{3,}/g, '…')
    // Após pontuação de frase, nova linha (fronteira natural; vírgula NÃO quebra — evita fala em micro-blocos).
    .replace(/\s*([.!?…])\s*/g, '$1\n')
    .replace(/\s*;\s*/g, ';\n')
    .replace(/\s*:\s*/g, ':\n')
    // Mantém espaço normal (sem destruir quebras de linha).
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * @param {string} text
 * @param {{ voice?: string, speed?: number, sentimentContext?: { sentiment?: string } }} opts
 * @returns {Promise<Buffer|null>}
 */
async function synthesizeMp3(text, opts = {}) {
  const rawIn = String(text || '').trim();
  const isRawSsml = /^<speak[\s>]/i.test(rawIn);
  const voiceUserFirst =
    opts.userDisplayName != null && String(opts.userDisplayName).trim()
      ? firstNameFromDisplay(opts.userDisplayName)
      : '';
  const withName = applyTtsUserTemplates(rawIn, voiceUserFirst || undefined);
  if (useGoogleCloudTts()) {
    const gInput = (isRawSsml ? withName : preprocessForNaturalSpeech(withName)).slice(0, 5000);
    if (!gInput.trim()) return null;
    const defaultSpG =
      parseFloat(process.env.GOOGLE_TTS_DEFAULT_SPEAKING_RATE) ||
      parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) ||
      1.02;
    let gSpeed = Math.min(1.25, Math.max(0.75, parseFloat(opts.speed) || defaultSpG));
    const rawSentG = opts?.sentimentContext?.sentiment ?? opts?.sentimentContext ?? '';
    const sentG = String(rawSentG || '').toLowerCase().trim();
    if (sentG === 'urgente') gSpeed = Math.min(1.25, gSpeed * 1.08);
    else if (sentG === 'negativo') gSpeed = Math.max(0.75, gSpeed * 0.95);
    const sent = String(opts?.sentimentContext?.sentiment ?? opts?.sentimentContext ?? '').trim();
    const sIdx = opts.streamChunkIndex;
    const gBuf = await googleTts.synthesizeMp3(gInput, {
      speed: gSpeed,
      prosodyInSsml: isRawSsml,
      sentiment: sent,
      skipIntentLeadIn: Number.isFinite(sIdx) && sIdx > 0,
      streamChunkIndex: Number.isFinite(sIdx) ? sIdx : undefined
    });
    if (gBuf?.length) {
      return gBuf;
    }
    console.warn('[TTS] GOOGLE returned empty buffer (fallback OpenAI).', {
      voice: googleTts.getVoiceName(),
      speed: gSpeed
    });
    // Quando Google está ativo, não cai para OpenAI: garante consistência de voz.
    return null;
  }

  if (!openaiClient) return null;
  const input = (isRawSsml ? withName : preprocessForNaturalSpeech(withName)).slice(0, 4096);
  if (!input) return null;

  const forcedVoice = String(process.env.FORCE_TTS_VOICE || '').trim().toLowerCase();
  const envVoice = String(process.env.OPENAI_TTS_VOICE || '').trim().toLowerCase();
  const allowed = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  const voice = allowed.includes(forcedVoice)
    ? forcedVoice
    : allowed.includes(String(opts.voice || '').toLowerCase())
      ? String(opts.voice).toLowerCase()
      : allowed.includes(envVoice)
        ? envVoice
        : 'nova';
  const defaultSp = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 1.02;
  const speed = Math.min(1.25, Math.max(0.75, parseFloat(opts.speed) || defaultSp));
  let warmth = clampNumber(
    opts.warmth ?? process.env.OPENAI_TTS_WARMTH ?? 0.52,
    0,
    1,
    0.52
  );
  let intonation = clampNumber(
    opts.intonation ?? process.env.OPENAI_TTS_INTONATION ?? 0.72,
    0,
    1,
    0.72
  );
  let keywordEmphasis = clampNumber(
    opts.keywordEmphasis ?? process.env.OPENAI_TTS_KEYWORD_EMPHASIS ?? 0.72,
    0,
    1,
    0.72
  );
  let syllabicVariation = clampNumber(
    opts.syllabicVariation ?? process.env.OPENAI_TTS_SYLLABIC_VARIATION ?? 0.68,
    0,
    1,
    0.68
  );
  let finalFall = clampNumber(
    opts.finalFall ?? process.env.OPENAI_TTS_FINAL_FALL ?? 0.74,
    0,
    1,
    0.74
  );

  // Ajuste de expressividade por sentimento (vem do frontend via sentimentContext).
  const rawSentiment = opts?.sentimentContext?.sentiment ?? opts?.sentimentContext ?? '';
  const sentiment = String(rawSentiment || '').toLowerCase().trim();
  if (sentiment === 'urgente') {
    warmth = 0.80;
    intonation = 0.93;
    keywordEmphasis = 0.82;
    syllabicVariation = 0.74;
    finalFall = 0.70;
  } else if (sentiment === 'positivo') {
    warmth = 0.81;
    intonation = 0.88;
    keywordEmphasis = 0.62;
    syllabicVariation = 0.76;
    finalFall = 0.76;
  } else if (sentiment === 'negativo') {
    warmth = 0.60;
    intonation = 0.70;
    keywordEmphasis = 0.48;
    syllabicVariation = 0.60;
    finalFall = 0.82;
  }

  const expressiveInstructions = buildExpressiveInstructions(
    TTS_INSTRUCTIONS,
    warmth,
    intonation,
    keywordEmphasis,
    syllabicVariation,
    finalFall
  );
  const modelEnv = (process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts').trim();
  const useMini = modelEnv.includes('gpt-4o') || modelEnv === 'gpt-4o-mini-tts';

  if (useMini) {
    try {
      const speech = await openaiClient.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice,
        input,
        instructions: expressiveInstructions,
        speed,
        response_format: 'mp3'
      });
      return Buffer.from(await speech.arrayBuffer());
    } catch (e) {
      console.warn('[voiceTts] gpt-4o-mini-tts:', e?.message || e);
    }
  }

  const fallbackModel = modelEnv === 'tts-1' ? 'tts-1' : 'tts-1-hd';
  try {
    const speech = await openaiClient.audio.speech.create({
      model: fallbackModel,
      voice,
      input,
      speed,
      response_format: 'mp3'
    });
    return Buffer.from(await speech.arrayBuffer());
  } catch (e) {
    console.warn('[voiceTts] fallback TTS:', e?.message || e);
    return null;
  }
}

function getEffectiveTtsConfig(opts = {}) {
  const forcedVoice = String(process.env.FORCE_TTS_VOICE || '').trim().toLowerCase();
  const envVoice = String(process.env.OPENAI_TTS_VOICE || '').trim().toLowerCase();
  const allowed = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  const voice = allowed.includes(forcedVoice)
    ? forcedVoice
    : allowed.includes(String(opts.voice || '').toLowerCase())
      ? String(opts.voice).toLowerCase()
      : allowed.includes(envVoice)
        ? envVoice
        : 'nova';
  const defaultSp = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 1.02;
  const speed = Math.min(1.25, Math.max(0.75, parseFloat(opts.speed) || defaultSp));

  if (useGoogleCloudTts()) {
    return {
      model_env: 'google-cloud-tts',
      api_model: 'google-cloud-text-to-speech',
      google_tts_voice: googleTts.getVoiceName(),
      force_tts_voice: forcedVoice || null,
      voice,
      speed
    };
  }

  const modelEnv = (process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts').trim();
  const apiModel = modelEnv.includes('gpt-4o') || modelEnv === 'gpt-4o-mini-tts' ? 'gpt-4o-mini-tts' : modelEnv === 'tts-1' ? 'tts-1' : 'tts-1-hd';
  return {
    model_env: modelEnv,
    api_model: apiModel,
    force_tts_voice: forcedVoice || null,
    voice,
    speed
  };
}

function getTtsAvailable() {
  return googleTts.getTtsAvailable() || !!openaiClient;
}

function ttsEngineFingerprint() {
  if (useGoogleCloudTts()) return googleTts.ttsEngineFingerprint();
  return `openai:${(process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts').slice(0, 32)}:${String(process.env.OPENAI_TTS_VOICE || 'nova').trim()}`;
}

module.exports = {
  synthesizeMp3,
  splitForNaturalTts,
  preprocessForNaturalSpeech,
  applyTtsUserTemplates,
  firstNameFromDisplay,
  getTtsAvailable,
  getOpenaiAvailable: getTtsAvailable,
  getEffectiveTtsConfig,
  ttsEngineFingerprint,
  usesGoogleCloudTts: useGoogleCloudTts
};
