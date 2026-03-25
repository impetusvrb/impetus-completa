/**
 * Boas-vindas — fluxo contínuo (pausas 250–350 ms), frases semi-naturais, último trecho um pouco mais lento.
 */
'use strict';

const googleTtsCore = require('./googleTtsCore');

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function firstName(displayName) {
  const s = String(displayName || '').trim();
  if (!s) return '';
  return s.split(/\s+/)[0] || '';
}

function variantIndex(displayName, variant) {
  const s = String(displayName || '').trim();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const mod = variant === 'short' ? 2 : 4;
  return Math.abs(h) % mod;
}

function emMod(text) {
  return `<emphasis level="moderate">${text}</emphasis>`;
}

function isChirpVoiceFromEnv() {
  return /chirp/i.test(String(process.env.GOOGLE_TTS_VOICE || ''));
}

function wrapWelcomeOuter(innerBody) {
  if (isChirpVoiceFromEnv()) {
    const bp = String(process.env.GOOGLE_TTS_SSML_BASE_PITCH_PCT ?? '-4').trim();
    const br = String(process.env.GOOGLE_TTS_SSML_BASE_RATE_PCT ?? '86').trim();
    const bpx = bp.endsWith('%') ? bp : `${bp}%`;
    const brx = br.endsWith('%') ? br : `${br}%`;
    return `<speak><prosody pitch="${bpx}" rate="${brx}">${innerBody}</prosody></speak>`;
  }
  return `<speak>${googleTtsCore.neuralOuterProsodyOpen()}${innerBody}</prosody></speak>`;
}

/** Última linha levemente mais lenta (fechamento humano). */
function slowOutro(text) {
  const raw = String(process.env.GOOGLE_TTS_SSML_FINAL_SLOW_RATE_PCT ?? '-5').trim();
  const r = raw.endsWith('%') ? raw : `${raw}%`;
  return `<prosody rate="${r}">${text}</prosody>`;
}

function buildWelcomeSsml(displayName, opts = {}) {
  const variant = opts.variant === 'short' ? 'short' : 'full';
  const spell =
    opts.spellName === true ||
    String(process.env.GOOGLE_TTS_WELCOME_SPELL_NAME || '').toLowerCase() === 'true';

  const n = firstName(displayName);
  const nameSsml = !n
    ? 'você'
    : spell
      ? `<say-as interpret-as="characters">${escapeXml(n)}</say-as>`
      : escapeXml(n);

  const namePause = n && n.length > 10 && !spell ? '<break time="120ms"/>' : '';

  const idx = variantIndex(displayName, variant);

  if (variant === 'short') {
    const shorts = [
      `<break time="260ms"/>Olá, ${namePause}${nameSsml}.<break time="280ms"/>${emMod('Sistema ativo.')}<break time="240ms"/>${slowOutro(escapeXml('Pode me dizer o que precisa?'))}`,
      `<break time="280ms"/>${namePause}${nameSsml}.<break time="260ms"/>${emMod('Tudo certo por aqui.')}<break time="220ms"/>${slowOutro(escapeXml('Me informe a solicitação.'))}`
    ];
    return wrapWelcomeOuter(shorts[idx]);
  }

  const longBodies = [
    `<break time="280ms"/>Olá, ${namePause}${nameSsml}.<break time="260ms"/>${emMod('Sistema ativo.')}<break time="280ms"/>Pronto para ajudar.<break time="320ms"/>${slowOutro(escapeXml('O que você precisa agora?'))}`,
    `<break time="260ms"/>${namePause}${nameSsml}.<break time="250ms"/>${emMod('Sistema operacional ativo.')}<break time="270ms"/>Pode informar a solicitação.<break time="300ms"/>${slowOutro(escapeXml('Estou ouvindo.'))}`,
    `<break time="270ms"/>Olá, ${namePause}${nameSsml}.<break time="280ms"/>${emMod('Tudo operacional.')}<break time="260ms"/>Como posso ajudar.<break time="300ms"/>${slowOutro(escapeXml('Me diga o próximo passo.'))}`,
    `<break time="280ms"/>${namePause}${nameSsml}.<break time="270ms"/>${emMod('Sistema online.')}<break time="250ms"/>Seguindo com você.<break time="320ms"/>${slowOutro(escapeXml('O que precisa neste momento?'))}`
  ];
  return wrapWelcomeOuter(longBodies[idx]);
}

/** Mesmas variantes que o SSML, em texto puro (OpenAI TTS não interpreta SSML). */
function buildWelcomePlainText(displayName, opts = {}) {
  const variant = opts.variant === 'short' ? 'short' : 'full';
  const spell =
    opts.spellName === true ||
    String(process.env.GOOGLE_TTS_WELCOME_SPELL_NAME || '').toLowerCase() === 'true';
  const n = firstName(displayName);
  const namePart = !n ? 'você' : spell ? n.split('').join(' ') : n;
  const idx = variantIndex(displayName, variant);

  if (variant === 'short') {
    const shorts = [
      `Olá, ${namePart}. Sistema ativo. Pode me dizer o que precisa?`,
      `${namePart}. Tudo certo por aqui. Me informe a solicitação.`
    ];
    return shorts[idx];
  }
  const longs = [
    `Olá, ${namePart}. Sistema ativo. Pronto para ajudar. O que você precisa agora?`,
    `${namePart}. Sistema operacional ativo. Pode informar a solicitação. Estou ouvindo.`,
    `Olá, ${namePart}. Tudo operacional. Como posso ajudar. Me diga o próximo passo.`,
    `${namePart}. Sistema online. Seguindo com você. O que precisa neste momento?`
  ];
  return longs[idx];
}

module.exports = { buildWelcomeSsml, buildWelcomePlainText, firstName, escapeXml, variantIndex };
