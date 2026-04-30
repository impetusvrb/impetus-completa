'use strict';

/**
 * Tráfego controlado para validar rollout do chat (mentionsAI → handleAIMessage via loader).
 *
 * Porquê grupos e não privados entre A e B?
 *   getOrCreatePrivateConversation(A,B) devolve sempre a MESMA conversa.
 *   createGroup com nome único cria uma conversa NOVA por iteração → buckets de rollout distintos.
 *
 * Uso (a partir de backend/):
 *
 * A) Ver logs no PM2 (recomendado) — pedidos HTTP ao servidor já a correr:
 *   CHAT_SMOKE_JWT="<token sessão ou JWT>" CHAT_SMOKE_PEER_USER_ID="<uuid outro user>" \
 *   CHAT_SMOKE_CONVERSATIONS=20 CHAT_SMOKE_MESSAGES_PER_CONV=2 \
 *   CHAT_SMOKE_BASE_URL=http://127.0.0.1:4000 \
 *   node scripts/smoke-chat-mentions-rollout.js
 *
 * B) Modo directo (BD + loader neste processo) — [CHAT_FLOW] aparece NO TERMINAL, não no ficheiro PM2:
 *   CHAT_SMOKE_CONVERSATIONS=20 node scripts/smoke-chat-mentions-rollout.js
 *
 * Opcional:
 *   CHAT_SMOKE_COMPANY_ID=<uuid> — restringe à empresa (útil se há várias).
 *   CHAT_SMOKE_MENTION_TEXT="..." — deve passar detectAIMention (lenient).
 *   CHAT_SMOKE_DELAY_MS=300 — pausa entre chamadas (OpenAI / BD).
 *
 * Requisitos: .env com DB; pelo menos 2 utilizadores activos na mesma empresa.
 * Depois: grep "CHAT_FLOW" /root/.pm2/logs/impetus-backend-out.log | tail -50
 *
 * Nota: executar no MESMO ambiente/carregamento env que o PM2 (variáveis CHAT_* já no .env).
 */

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env'), override: true });

const db = require('../src/db');
const chatService = require('../src/services/chatService');
const { handleAIMessage } = require('../src/services/chatAIService.loader');
const { detectAIMention } = require('../src/utils/mentionsAI');

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100);
}

function rolloutPct() {
  const raw = Number(process.env.CHAT_ROLLOUT_PERCENT || 0);
  if (!Number.isFinite(raw)) return 0;
  return Math.min(100, Math.max(0, raw));
}

async function pickTwoUsers(companyIdFilter) {
  if (companyIdFilter) {
    const r = await db.query(
      `SELECT id, company_id, email, name
       FROM users
       WHERE active = true
         AND deleted_at IS NULL
         AND company_id = $1::uuid
       ORDER BY created_at ASC
       LIMIT 2`,
      [companyIdFilter]
    );
    return r.rows;
  }
  const r = await db.query(
    `SELECT id, company_id, email, name
     FROM users
     WHERE active = true AND deleted_at IS NULL AND company_id IS NOT NULL
     ORDER BY company_id, created_at ASC
     LIMIT 2`
  );
  if (r.rows.length < 2) return [];
  const c0 = String(r.rows[0].company_id);
  if (String(r.rows[1].company_id) !== c0) {
    return [];
  }
  return r.rows;
}

async function httpJson(url, token, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body != null ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function runViaHttp({
  baseUrl,
  token,
  peerUserId,
  count,
  msgsPerConv,
  delayMs,
  mentionText
}) {
  let expectConsolidated = 0;
  let expectLegacy = 0;

  for (let i = 0; i < count; i += 1) {
    const name = `smoke-rollout-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    const conv = await httpJson(`${baseUrl}/api/chat/conversations`, token, {
      type: 'group',
      name,
      participantIds: [peerUserId]
    });
    const convId = conv.id;
    if (!convId) {
      console.error('[CHAT_SMOKE] Resposta sem id:', conv);
      throw new Error('create conversation failed');
    }

    const h = simpleHash(String(convId));
    const pct = rolloutPct();
    const isCons = pct > 0 && h < pct;
    if (isCons) expectConsolidated += 1;
    else expectLegacy += 1;

    console.info('[CHAT_SMOKE] HTTP conversa criada', {
      convId,
      hashMod100: h,
      expectPipeline: isCons ? 'consolidated' : 'legacy'
    });

    for (let m = 0; m < msgsPerConv; m += 1) {
      const content = m === 0 ? mentionText : `${mentionText} (continuação ${m + 1})`;
      await httpJson(`${baseUrl}/api/chat/conversations/${convId}/messages`, token, { content });
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { expectConsolidated, expectLegacy };
}

async function runViaDb({
  u1,
  u2,
  companyId,
  count,
  msgsPerConv,
  delayMs,
  mentionText
}) {
  let expectConsolidated = 0;
  let expectLegacy = 0;
  const pct = rolloutPct();

  for (let i = 0; i < count; i += 1) {
    const name = `smoke-rollout-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`;
    const conv = await chatService.createGroup(u1.id, companyId, name, [u2.id]);
    const convId = conv.id;

    const h = simpleHash(String(convId));
    const isCons = pct > 0 && h < pct;
    if (isCons) expectConsolidated += 1;
    else expectLegacy += 1;

    console.info('[CHAT_SMOKE] Conversa criada', { convId, hashMod100: h, expectPipeline: isCons ? 'consolidated' : 'legacy' });

    for (let m = 0; m < msgsPerConv; m += 1) {
      const content = m === 0 ? mentionText : `${mentionText} (continuação ${m + 1})`;
      await chatService.saveMessage({
        conversationId: convId,
        senderId: u1.id,
        type: 'text',
        content
      });
      try {
        await handleAIMessage(convId, content, null);
      } catch (e) {
        console.warn('[CHAT_SMOKE] handleAIMessage erro (rever logs)', e?.message ?? e);
      }
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { expectConsolidated, expectLegacy };
}

async function main() {
  const count = Math.min(50, Math.max(1, parseInt(process.env.CHAT_SMOKE_CONVERSATIONS || '20', 10)));
  const msgsPerConv = Math.min(5, Math.max(1, parseInt(process.env.CHAT_SMOKE_MESSAGES_PER_CONV || '2', 10)));
  const delayMs = Math.max(0, parseInt(process.env.CHAT_SMOKE_DELAY_MS || '400', 10));
  const companyFilter = (process.env.CHAT_SMOKE_COMPANY_ID || '').trim() || null;

  const mentionText =
    (process.env.CHAT_SMOKE_MENTION_TEXT || '').trim() ||
    '@ia me explique o status atual do sistema';

  if (!detectAIMention(mentionText, { mode: 'lenient' })) {
    console.error('[CHAT_SMOKE] O texto não activa mentionsAI (lenient).', mentionText.slice(0, 120));
    process.exit(1);
  }

  const smokeJwt = (process.env.CHAT_SMOKE_JWT || '').trim();
  const peerUserId = (process.env.CHAT_SMOKE_PEER_USER_ID || '').trim();
  const port = parseInt(process.env.PORT || '4000', 10);
  const baseUrl = (process.env.CHAT_SMOKE_BASE_URL || '').trim().replace(/\/$/, '') || `http://127.0.0.1:${port}`;

  let expectConsolidated = 0;
  let expectLegacy = 0;

  if (smokeJwt && peerUserId) {
    console.info('[CHAT_SMOKE] Modo HTTP → logs [CHAT_FLOW] no processo PM2 (servidor).');
    try {
      const r = await runViaHttp({
        baseUrl,
        token: smokeJwt,
        peerUserId,
        count,
        msgsPerConv,
        delayMs,
        mentionText
      });
      expectConsolidated = r.expectConsolidated;
      expectLegacy = r.expectLegacy;
    } catch (e) {
      console.error('[CHAT_SMOKE] HTTP falhou:', e?.message ?? e);
      process.exit(1);
    }
  } else {
    console.warn(
      '[CHAT_SMOKE] Modo directo (sem CHAT_SMOKE_JWT+PEER): [CHAT_FLOW] sai neste terminal, não em impetus-backend-out.log. Para PM2: defina CHAT_SMOKE_JWT e CHAT_SMOKE_PEER_USER_ID.'
    );
    const rows = await pickTwoUsers(companyFilter);
    if (rows.length < 2) {
      console.error(
        '[CHAT_SMOKE] São necessários 2 utilizadores activos na mesma empresa. Use CHAT_SMOKE_COMPANY_ID se precisar.'
      );
      process.exit(1);
    }

    const [u1, u2] = rows;
    const companyId = String(u1.company_id);

    console.info('[CHAT_SMOKE] Início (DB)', {
      conversations: count,
      msgsPerConv,
      company_id: companyId,
      user_a: u1.email || u1.id,
      user_b: u2.email || u2.id,
      CHAT_ENABLE_CONSOLIDATED: process.env.CHAT_ENABLE_CONSOLIDATED,
      CHAT_SAFE_MODE: process.env.CHAT_SAFE_MODE,
      CHAT_ROLLOUT_PERCENT: rolloutPct()
    });

    const r = await runViaDb({
      u1,
      u2,
      companyId,
      count,
      msgsPerConv,
      delayMs,
      mentionText
    });
    expectConsolidated = r.expectConsolidated;
    expectLegacy = r.expectLegacy;
  }

  console.info('[CHAT_SMOKE] Previsão por bucket (hash(conversationId)%100 < rollout%)', {
    expected_consolidated_conversations: expectConsolidated,
    expected_legacy_conversations: expectLegacy,
    total_conversations: count
  });
  console.info('[CHAT_SMOKE] Terminado. PM2:');
  console.info('  grep "CHAT_FLOW" /root/.pm2/logs/impetus-backend-out.log | tail -50');

  await db.pool.end().catch(() => {});
  process.exit(0);
}

main().catch((e) => {
  console.error('[CHAT_SMOKE]', e);
  process.exit(1);
});

