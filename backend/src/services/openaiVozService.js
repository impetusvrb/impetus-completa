/**
 * IMPETUS - Geração de áudio (TTS) via OpenAI
 * Modelo padrão: gpt-4o-mini-tts
 * Voz padrão: nova
 *
 * Retorna Buffer (mp3) para o caller decidir como entregar ao frontend.
 */
const OpenAI = require('openai').default;

const VALID_VOICES = new Set(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']);

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function gerarAudio(texto) {
  if (!client) {
    console.warn('[OpenAI TTS] OPENAI_API_KEY não configurada');
    return null;
  }
  if (!texto || typeof texto !== 'string') return null;
  const input = String(texto)
    .replace(/[*_`#]/g, '')
    .replace(/\s*([,;:])\s*/g, '$1 ')
    .replace(/\s*([.!?])\s*/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4096);
  if (!input) return null;
  const modelEnv = String(process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts').trim();
  const forcedVoice = String(process.env.FORCE_TTS_VOICE || '').trim().toLowerCase();
  const defaultVoice = String(process.env.OPENAI_TTS_VOICE || 'nova').trim().toLowerCase();
  const voice = VALID_VOICES.has(forcedVoice)
    ? forcedVoice
    : VALID_VOICES.has(defaultVoice)
      ? defaultVoice
      : 'nova';
  const defaultSp = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 0.98;
  const speed = Math.min(1.25, Math.max(0.75, defaultSp));

  try {
    const useMini = modelEnv.includes('gpt-4o') || modelEnv === 'gpt-4o-mini-tts';
    const response = await client.audio.speech.create(useMini
      ? {
          model: 'gpt-4o-mini-tts',
          voice,
          input,
          response_format: 'mp3'
        }
      : {
          model: modelEnv === 'tts-1' ? 'tts-1' : 'tts-1-hd',
          voice,
          input,
          speed,
          response_format: 'mp3'
        });
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer || buffer.length < 900) {
      console.warn('[OpenAI TTS] áudio inválido descartado');
      return null;
    }
    return buffer;
  } catch (e) {
    console.warn('[OpenAI TTS] erro:', e?.message || e);
    return null;
  }
}

module.exports = { gerarAudio };

