#!/usr/bin/env node
/**
 * Integração: confirma que o aprendizado estratégico corre após o hook pós-síntese (equivalente a runCouncilExecution).
 * Não usa LLM — apenas `scheduleStrategicLearningAfterCognitiveRun` + PostgreSQL.
 *
 * Pré-requisitos: DATABASE_URL (ou .env em backend/), tabela `strategic_learning` migrada.
 *
 * Uso (a partir da pasta backend):
 *   npm run test:strategic-learning
 *   node src/tests/strategicLearningIntegrationTest.js
 */
'use strict';

const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = require('../db');
const strategicLearningService = require('../services/strategicLearningService');

/** UUID v4 válido para company_id (filtro e INSERT). */
const TEST_COMPANY_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const TEST_USER_ID = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6';

/**
 * Simula o final do conselho cognitivo: agenda o mesmo hook usado em produção.
 * @param {{ user: object, dossier: object, synthesis: object }} p
 */
function simulateRunCouncilExecution(p) {
  strategicLearningService.scheduleStrategicLearningAfterCognitiveRun({
    user: p.user,
    dossier: p.dossier,
    synthesis: p.synthesis
  });
}

/**
 * Aguarda o encadeamento setImmediate + insert assíncrono em `recordDecisionTraceAsync`.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function waitForAsyncPersistence(ms = 800) {
  return new Promise((resolve) => {
    setImmediate(() => {
      setImmediate(() => {
        setTimeout(resolve, ms);
      });
    });
  });
}

async function cleanupTestRows(companyId, intent) {
  try {
    await db.query(`DELETE FROM strategic_learning WHERE company_id = $1::uuid AND intent = $2`, [
      companyId,
      intent
    ]);
  } catch (e) {
    if (!String(e.message || '').includes('does not exist')) {
      console.warn('[test] cleanup:', e.message);
    }
  }
}

async function main() {
  const intent = `integration_sl_${Date.now()}`;
  const user = {
    id: TEST_USER_ID,
    company_id: TEST_COMPANY_ID,
    status: 'active'
  };
  const dossier = {
    context: { intent, module: 'integration_test' },
    data: {
      contextual_data: {
        detected_intents: ['overview', 'maintenance_hint'],
        kpis_sample: [{ k: 'oee', v: 0.82 }]
      }
    },
    meta: { degraded: false }
  };
  const synthesis = {
    answer: 'Resposta sintética de teste — sem LLM.',
    confidence_score: 88,
    degraded: false
  };

  await cleanupTestRows(TEST_COMPANY_ID, intent);

  simulateRunCouncilExecution({ user, dossier, synthesis });
  await waitForAsyncPersistence();

  let row;
  try {
    const r = await db.query(
      `SELECT company_id, intent, had_data, used_fallback, context_tag, created_at
       FROM strategic_learning
       WHERE company_id = $1::uuid AND intent = $2
       ORDER BY created_at DESC
       LIMIT 5`,
      [TEST_COMPANY_ID, intent]
    );
    row = r.rows;
  } catch (e) {
    console.error('[strategic-learning-integration] Falha na consulta:', e.message || e);
    process.exit(1);
  }

  if (!row.length) {
    console.error(
      '[strategic-learning-integration] FALHA: nenhum registo em strategic_learning para este intent.'
    );
    console.error('Verifique DATABASE_URL, migração strategic_learning.sql e conectividade.');
    process.exit(1);
  }

  const first = row[0];
  const companyOk = String(first.company_id) === TEST_COMPANY_ID;
  const intentOk = typeof first.intent === 'string' && first.intent.length > 0;
  const fallbackIsBool = typeof first.used_fallback === 'boolean';

  if (!companyOk || !intentOk || !fallbackIsBool) {
    console.error('[strategic-learning-integration] FALHA nas asserções:', {
      companyOk,
      intentOk,
      fallbackIsBool,
      row: first
    });
    process.exit(1);
  }

  console.log('[strategic-learning-integration] OK');
  console.log({
    rows_inserted_for_intent: row.length,
    company_id: first.company_id,
    intent: first.intent,
    had_data: first.had_data,
    used_fallback: first.used_fallback,
    context_tag: first.context_tag
  });

  await cleanupTestRows(TEST_COMPANY_ID, intent);

  if (db.pool && typeof db.pool.end === 'function') {
    await db.pool.end();
  }
}

main().catch((e) => {
  console.error('[strategic-learning-integration]', e);
  process.exit(1);
});
