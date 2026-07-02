#!/usr/bin/env node
'use strict';

/**
 * Smoke test — rotas ManuIA live-assistance (sem auth: valida existência e códigos HTTP).
 * Com IMPETUS_SMOKE_TOKEN: valida cadeia analyze-frame / chat / save-session.
 *
 * Uso:
 *   node backend/src/tests/manuia/liveAssistanceSmoke.js
 *   IMPETUS_SMOKE_TOKEN=... IMPETUS_API_BASE=http://localhost:3000 node backend/src/tests/manuia/liveAssistanceSmoke.js
 */

const BASE = (process.env.IMPETUS_API_BASE || 'http://localhost:3000').replace(/\/$/, '');
const TOKEN = process.env.IMPETUS_SMOKE_TOKEN || '';

const MIN_JPEG_B64 =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==';

let passed = 0;
let failed = 0;

function ok(name) {
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function fail(name, detail) {
  failed += 1;
  console.error(`  ✗ ${name}${detail ? `: ${detail}` : ''}`);
}

async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
}

async function main() {
  console.log('\n[MANUIA LIVE ASSISTANCE SMOKE]\n');

  const unauthAnalyze = await req('POST', '/api/manutencao-ia/live-assistance/analyze-frame', {
    imageBase64: MIN_JPEG_B64
  });
  if (unauthAnalyze.status === 401 || unauthAnalyze.data?.code === 'AUTH_TOKEN_MISSING') {
    ok('POST analyze-frame exige autenticação');
  } else {
    fail('POST analyze-frame deveria exigir auth', `status ${unauthAnalyze.status}`);
  }

  const unauthChat = await req('POST', '/api/manutencao-ia/live-assistance/chat', {
    messages: [{ role: 'user', content: 'teste' }]
  });
  if (unauthChat.status === 401 || unauthChat.data?.code === 'AUTH_TOKEN_MISSING') {
    ok('POST live-assistance/chat exige autenticação');
  } else {
    fail('POST chat deveria exigir auth', `status ${unauthChat.status}`);
  }

  const dtHealth = await req('GET', '/api/manutencao-ia/digital-twin/health');
  if (dtHealth.status === 200 && dtHealth.data?.ok) {
    ok('GET digital-twin/health operacional');
  } else {
    fail('GET digital-twin/health', JSON.stringify(dtHealth.data));
  }

  if (!TOKEN) {
    console.log('\n  (sem IMPETUS_SMOKE_TOKEN — testes autenticados omitidos)\n');
    console.log(`Resultado: ${passed} ok, ${failed} falha\n`);
    process.exit(failed > 0 ? 1 : 0);
  }

  const badImage = await req('POST', '/api/manutencao-ia/live-assistance/analyze-frame', {
    imageBase64: 'abc'
  });
  if (badImage.status === 400 && badImage.data?.ok === false) {
    ok('analyze-frame rejeita imagem inválida (400)');
  } else {
    fail('analyze-frame imagem inválida', `status ${badImage.status}`);
  }

  const chat = await req('POST', '/api/manutencao-ia/live-assistance/chat', {
    messages: [{ role: 'user', content: 'Qual o risco operacional padrão?' }],
    dossier: {}
  });
  if (chat.status === 200 && chat.data?.ok && typeof chat.data.reply === 'string') {
    ok('live-assistance/chat retorna reply');
  } else if (chat.status === 503) {
    ok('live-assistance/chat rota responde (IA indisponível 503)');
  } else {
    fail('live-assistance/chat', `status ${chat.status} ${JSON.stringify(chat.data)?.slice(0, 120)}`);
  }

  const sess = await req('POST', '/api/manutencao-ia/sessions', { session_type: 'guidance' });
  const sessionId = sess.data?.session?.id;
  if (sess.status === 200 || sess.status === 201) {
    ok('POST sessions cria sessão');
  } else if (sess.status === 503) {
    ok('POST sessions rota responde (tabelas/IA 503)');
  } else {
    fail('POST sessions', `status ${sess.status}`);
  }

  if (sessionId) {
    const save = await req('POST', '/api/manutencao-ia/live-assistance/save-session', {
      sessionId,
      dossier: { detected_part_name: 'smoke-test' },
      summaryText: 'smoke'
    });
    if (save.status === 200 && save.data?.ok !== false) {
      ok('live-assistance/save-session persiste');
    } else {
      fail('save-session', `status ${save.status}`);
    }
  }

  console.log(`\nResultado: ${passed} ok, ${failed} falha\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
