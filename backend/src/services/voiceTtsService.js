/**
 * TTS — gpt-4o-mini-tts + instructions (PT-BR natural) ou fallback tts-1-hd
 */
'use strict';
const OpenAI = require('openai').default;

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const TTS_INSTRUCTIONS =
  (process.env.OPENAI_TTS_INSTRUCTIONS || '').trim() ||
  [
    'Voz feminina brasileira, tom calmo, natural e amigável.',
    'Fala como uma assistente humana de verdade, em português do Brasil.',
    'Usa pausas leves entre ideias — nunca leitura corrida.',
    'Entonação suave e conversacional; nunca robótica nem de narração.',
    'Quando o texto tiver várias frases curtas, respeita esse ritmo, com micro-pausas entre elas.'
  ].join(' ');

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

async function synthesizeMp3(text, opts = {}) {
  if (!openaiClient) return null;
  const input = String(text || '')
    .replace(/[*_`#]/g, '')
    .trim()
    .slice(0, 4096);
  if (!input) return null;
  const voice = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].includes(opts.voice)
    ? opts.voice
    : 'nova';
  const defaultSp = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 0.98;
  const speed = Math.min(1.25, Math.max(0.75, parseFloat(opts.speed) || defaultSp));
  const modelEnv = (process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts').trim();
  const useMini = modelEnv.includes('gpt-4o') || modelEnv === 'gpt-4o-mini-tts';

  if (useMini) {
    try {
      const speech = await openaiClient.audio.speech.create({
        model: 'gpt-4o-mini-tts',
        voice,
        input,
        instructions: TTS_INSTRUCTIONS,
        response_format: 'mp3'
      });
      return Buffer.from(await speech.arrayBuffer());
    } catch (e) {
      console.warn('[voiceTts]', e?.message || e);
    }
  }
  try {
    const speech = await openaiClient.audio.speech.create({
      model: modelEnv === 'tts-1' ? 'tts-1' : 'tts-1-hd',
      voice,
      input,
      speed,
      response_format: 'mp3'
    });
    return Buffer.from(await speech.arrayBuffer());
  } catch (e) {
    console.warn('[voiceTts] fallback', e?.message || e);
    return null;
  }
}

module.exports = { synthesizeMp3, splitForNaturalTts, getOpenaiAvailable: () => !!openaiClient };
