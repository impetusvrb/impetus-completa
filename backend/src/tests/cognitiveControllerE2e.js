'use strict';

/**
 * Smoke test do cognitiveControllerService (BD + pipeline council real).
 *
 * Pré-requisitos: .env do backend com PostgreSQL; opcionalmente chaves de LLM.
 * Executar na pasta backend: node src/tests/cognitiveControllerE2e.js
 */

require('dotenv').config({
  path: require('path').join(__dirname, '../../.env'),
  override: true
});

if (process.env.COGNITIVE_CONTROLLER_E2E_ADAPTIVE !== '1') {
  process.env.ADAPTIVE_GOVERNANCE_ENABLED = 'false';
}

const db = require('../db');
const { runCognitiveController } = require('../services/cognitiveControllerService');

const SAFE_PROMPT =
  process.env.COGNITIVE_CONTROLLER_E2E_MESSAGE ||
  'Responda em uma frase: o que é monitoramento industrial?';

async function main() {
  const r = await db.query(
    `SELECT id, company_id, email FROM users WHERE active = true AND company_id IS NOT NULL LIMIT 1`
  );
  if (!r.rows[0]) {
    console.error('E2E: nenhum utilizador ativo com company_id — abortando.');
    process.exitCode = 1;
    return;
  }
  const user = { id: r.rows[0].id, company_id: r.rows[0].company_id };
  console.log('E2E: utilizador', r.rows[0].email || r.rows[0].id, 'company', user.company_id);
  console.log('E2E: mensagem:', SAFE_PROMPT.slice(0, 120));

  const out = await runCognitiveController({
    user,
    message: SAFE_PROMPT
  });

  console.log('E2E: resultado ok=', out.ok, 'trace_id=', out.trace_id || null);
  if (out.error) {
    console.log('E2E: error', JSON.stringify(out.error, null, 2));
  } else {
    const preview =
      typeof out.content === 'string'
        ? out.content.slice(0, 400) + (out.content.length > 400 ? '…' : '')
        : out.content;
    console.log('E2E: content (prévia):', preview);
    console.log(
      'E2E: confidence_score',
      out.confidence_score,
      'degraded',
      out.degraded,
      'requires_action',
      out.requires_action
    );
    console.log('E2E: tem explanation_layer', !!out.explanation_layer);
    console.log('E2E: tem processing_transparency', !!out.processing_transparency);
  }

  process.exitCode = out.ok ? 0 : 1;
}

main().catch((e) => {
  console.error('E2E: exceção não tratada', e);
  process.exitCode = 1;
});
