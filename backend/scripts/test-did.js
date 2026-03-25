#!/usr/bin/env node
/**
 * Teste D-ID: cria talk e faz poll até done ou timeout.
 * Uso:
 *   D_ID_SOURCE_URL="https://..." node scripts/test-did.js "Olá, sou a assistente Impetus."
 *
 * Carrega .env da pasta backend.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });

const { createTalk, getTalk } = require('../src/services/didService');

const sourceUrl = process.env.D_ID_SOURCE_URL || '';
const text = process.argv.slice(2).join(' ') || 'Olá. Este é um teste da API D-ID.';

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  if (!sourceUrl || !String(sourceUrl).startsWith('https://')) {
    console.error('Defina D_ID_SOURCE_URL com uma imagem pública HTTPS (PNG/JPG).');
    process.exit(1);
  }
  console.log('Criando talk…');
  const created = await createTalk({ sourceUrl, text });
  console.log('Resposta create:', created);
  const id = created.id;
  if (!id) {
    console.error('Sem id na resposta');
    process.exit(1);
  }
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    await sleep(2500);
    let st;
    try {
      st = await getTalk(id);
    } catch (e) {
      console.error('getTalk:', e.message);
      continue;
    }
    console.log('Status:', st.status, st.result_url ? `url=${st.result_url}` : '');
    if (st.status === 'done' && st.result_url) {
      console.log('Pronto:', st.result_url);
      process.exit(0);
    }
    if (st.status === 'error' || st.status === 'rejected') {
      console.error('Falhou:', st);
      process.exit(1);
    }
  }
  console.error('Timeout aguardando vídeo');
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
