#!/usr/bin/env node
/**
 * Teste de naturalidade: gera UM mp3 por frase → ouves em sequência com ~300 ms entre ficheiros.
 *
 * Modo padrão (recomendado para alinhar com o app Impetus):
 *   cd backend && npm run test:voz
 *   → usa voiceTtsService + Google TTS (SSML/pausas como em produção), se google-tts.json existir.
 *
 * Modo OpenAI:
 *   TTS_TEST_ENGINE=openai npm run test:voz
 *   → precisa OPENAI_API_KEY no .env
 *
 * Opções .env / ambiente:
 *   TTS_TEST_ENGINE=openai|impetus   (impetus = default)
 *   TTS_TEST_VOICE=alloy|nova|shimmer|…  (só OpenAI)
 *   TTS_TEST_FRASES='["a","b"]'       JSON opcional — senão usa lista default
 */
'use strict';

const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const OUT_DIR = path.join(__dirname, 'test-voz-out');

const DEFAULT_FRASES = [
  'Entendi.',
  'Vamos resolver isso.',
  'Me diga o que aconteceu.'
];

const ALT_FRASES = [
  'Certo.',
  'Vamos verificar isso.',
  'Pode me explicar o que aconteceu?'
];

function parseFrases() {
  const raw = process.env.TTS_TEST_FRASES;
  if (raw && raw.trim().startsWith('[')) {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j) && j.length) return j.map(String);
    } catch (_) {}
  }
  if (process.env.TTS_TEST_ALT === '1' || process.env.TTS_TEST_ALT === 'true') {
    return ALT_FRASES;
  }
  return DEFAULT_FRASES;
}

async function runOpenAI(frases) {
  const OpenAI = require('openai').default;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error('OPENAI_API_KEY em falta no .env');
    process.exit(1);
  }
  const openai = new OpenAI({ apiKey: key });
  const voice = (process.env.TTS_TEST_VOICE || 'alloy').trim();
  const model = (process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts').trim();

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (let i = 0; i < frases.length; i++) {
    const frase = frases[i];
    const speech = await openai.audio.speech.create({
      model,
      voice,
      input: frase,
      response_format: 'mp3'
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    const file = path.join(OUT_DIR, `openai_${i}.mp3`);
    fs.writeFileSync(file, buffer);
    console.log('Gerado:', file, '←', frase);
  }
}

async function runImpetus(frases) {
  const voiceTts = require('../src/services/voiceTtsService');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!voiceTts.getTtsAvailable()) {
    console.error(
      'TTS Impetus indisponível (Google sem credenciais e sem OpenAI). Usa TTS_TEST_ENGINE=openai ou configura config/google-tts.json'
    );
    process.exit(1);
  }

  for (let i = 0; i < frases.length; i++) {
    const frase = frases[i];
    const buf = await voiceTts.synthesizeMp3(frase, {
      voice: 'nova',
      speed: parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED) || 1.02,
      sentimentContext: null
    });
    if (!buf || !buf.length) {
      console.error('Falhou:', frase);
      continue;
    }
    const file = path.join(OUT_DIR, `impetus_${i}.mp3`);
    fs.writeFileSync(file, buf);
    console.log('Gerado:', file, '←', frase);
  }
}

async function main() {
  const engine = (process.env.TTS_TEST_ENGINE || 'impetus').trim().toLowerCase();
  const frases = parseFrases();

  console.log('');
  console.log('Frases:', frases);
  console.log('Motor:', engine);
  console.log('Pasta:', OUT_DIR);
  console.log('');
  console.log('▶ Toca na ordem com ~300 ms entre ficheiros (não juntes num só áudio).');
  console.log('');

  if (engine === 'openai') {
    await runOpenAI(frases);
  } else {
    await runImpetus(frases);
  }

  console.log('');
  console.log('Pronto.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
