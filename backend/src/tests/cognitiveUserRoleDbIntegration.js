'use strict';

/**
 * Integração real (PostgreSQL): cargo de utilizador via get_user_role + opcionalmente Conselho Cognitivo (LLM).
 *
 * Pré-requisitos:
 *   - Variáveis de ambiente de BD (como em src/db/index.js), ex.: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD
 *   - Para validar também a resposta do modelo: OPENAI_API_KEY (e créditos/circuito OK)
 *   - Opcional: COGNITIVE_E2E_ADAPTIVE=1 para ligar governança adaptativa (exige tabelas ai_incidents, etc.)
 *
 * Executar: node src/tests/cognitiveUserRoleDbIntegration.js
 */

require('dotenv').config({
  path: require('path').join(__dirname, '../../.env'),
  override: true
});

// Conselho cognitivo chama governança adaptativa, que consulta ai_incidents / ai_interaction_traces.
// Em bases só com core (users/companies), desligar evita falha 42P01 sem alterar produção.
if (process.env.COGNITIVE_E2E_ADAPTIVE !== '1') {
  process.env.ADAPTIVE_GOVERNANCE_ENABLED = 'false';
}

const assert = require('assert');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const db = require('../db');
const { detectIntent } = require('../services/intentDetectionService');
const { retrieveContextualData } = require('../services/dataRetrievalService');
const { runCognitiveCouncil } = require('../ai/cognitiveOrchestrator');

const E2E_COMPANY_NAME = '__e2e_cognitive_user_role__';
const QUESTION = 'Qual o cargo do Wellington?';
const TARGET_NAME = 'Wellington Machado';
const TARGET_ROLE = 'diretor';

const FORBIDDEN_ANSWER_SNIPPETS = [
  /não tenho acesso/i,
  /não posso informar/i,
  /sem acesso (?:a|à|ao)/i,
  /consulte (?:o )?administrador/i,
  /verifique no sistema/i,
  /não há dados disponíveis sobre colaboradores/i
];

function randomCnpjDigits() {
  let s = '';
  for (let i = 0; i < 14; i += 1) s += String(Math.floor(Math.random() * 10));
  return s;
}

async function cleanupByCompanyName(client, name) {
  await client.query(
    `DELETE FROM users WHERE company_id IN (SELECT id FROM companies WHERE name = $1)`,
    [name]
  );
  await client.query(`DELETE FROM companies WHERE name = $1`, [name]);
}

async function seedTenant(client) {
  const suffix = randomUUID().slice(0, 8);
  const companyRes = await client.query(
    `
    INSERT INTO companies (name, cnpj, plan_type, subscription_tier, active)
    VALUES ($1, $2, $3, $3, true)
    RETURNING id
    `,
    [E2E_COMPANY_NAME, randomCnpjDigits(), 'essencial']
  );
  const companyId = companyRes.rows[0].id;
  const passwordHash = await bcrypt.hash(`e2e-${suffix}`, 10);

  const requesterRes = await client.query(
    `
    INSERT INTO users (
      company_id, name, email, password_hash, role,
      area, hierarchy_level, active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    RETURNING id
    `,
    [
      companyId,
      'Utilizador E2E',
      `e2e-requester-${suffix}@test.local`,
      passwordHash,
      'colaborador',
      'Operações',
      5
    ]
  );

  await client.query(
    `
    INSERT INTO users (
      company_id, name, email, password_hash, role,
      area, hierarchy_level, active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    `,
    [
      companyId,
      TARGET_NAME,
      `e2e-wellington-${suffix}@test.local`,
      passwordHash,
      TARGET_ROLE,
      'Direção',
      1
    ]
  );

  return {
    companyId,
    requesterId: requesterRes.rows[0].id
  };
}

function assertRetrievalFromDb(ctx) {
  const intentData = detectIntent(QUESTION);
  assert.strictEqual(intentData.intent, 'get_user_role');

  return retrieveContextualData({
    user: { id: ctx.requesterId, company_id: ctx.companyId, role: 'colaborador' },
    intent: intentData.intent,
    entities: intentData.entities
  });
}

function assertNoForbiddenPhrases(text) {
  const t = text != null ? String(text) : '';
  for (const re of FORBIDDEN_ANSWER_SNIPPETS) {
    assert.ok(
      !re.test(t),
      `Resposta não deve soar como recusa genérica de acesso (casou: ${re})`
    );
  }
  assert.ok(
    !/^Não foi possível gerar a resposta assistida completa/i.test(t),
    'Resposta não deve ser o fallback degradado do pipeline'
  );
}

async function main() {
  let client;
  try {
    await db.query('SELECT 1');
  } catch (e) {
    console.error(
      '[cognitiveUserRoleDbIntegration] PostgreSQL indisponível ou .env incompleto:',
      e.message
    );
    process.exit(1);
  }

  client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    await cleanupByCompanyName(client, E2E_COMPANY_NAME);
    const ctx = await seedTenant(client);
    await client.query('COMMIT');

    const retrieved = await assertRetrievalFromDb(ctx);
    const cd = retrieved.contextual_data || {};
    assert.strictEqual(
      String(cd.user_role || '').toLowerCase(),
      TARGET_ROLE,
      'Enriquecimento deve trazer o cargo real da BD (multi-tenant)'
    );
    assert.ok(
      /wellington/i.test(String(cd.user_name || '')),
      'Enriquecimento deve trazer o nome real da BD'
    );
    console.log('OK camada_dados (PostgreSQL + retrieveContextualData)');

    const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && String(process.env.OPENAI_API_KEY).trim());
    if (!hasOpenAI) {
      console.log(
        'SKIP conselho_llm: defina OPENAI_API_KEY no .env para validar também a resposta final do modelo.'
      );
      return;
    }

    const council = await runCognitiveCouncil({
      user: {
        id: ctx.requesterId,
        company_id: ctx.companyId,
        role: 'colaborador',
        hierarchy_level: 5
      },
      requestText: QUESTION,
      input: { text: QUESTION },
      data: {},
      context: {},
      module: 'cognitive_council',
      options: {}
    });

    assert.strictEqual(council.ok, true, 'Conselho deve concluir com ok=true');
    const answer = council.result && council.result.answer != null ? String(council.result.answer) : '';
    assert.ok(
      /diretor/i.test(answer),
      `Resposta final deve mencionar o cargo "diretor" (obtido da BD). Recebido: ${answer.slice(0, 500)}`
    );
    assertNoForbiddenPhrases(answer);
    console.log('OK conselho_llm (resposta usa dado real, sem recusa genérica)');
  } catch (e) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /* */
      }
    }
    console.error('FAIL cognitiveUserRoleDbIntegration', e);
    process.exit(1);
  } finally {
    if (client) {
      try {
        await cleanupByCompanyName(client, E2E_COMPANY_NAME);
      } catch (cleanErr) {
        console.warn('[cognitiveUserRoleDbIntegration] cleanup:', cleanErr.message);
      }
      client.release();
    }
    await new Promise((r) => setTimeout(r, 400));
    try {
      await db.pool.end();
    } catch (_) {
      /* */
    }
  }
}

main();
