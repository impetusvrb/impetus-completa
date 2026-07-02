'use strict';

/**
 * Regressão — Chat IA / Runtime State Enforcement
 * Causa raiz: /api/cognitive-council capturado por prefixo /api/cognitive → cognitive.envelope (ENRICH)
 * → RUNTIME_STATE_BLOCKED em IMPETUS_RUNTIME_STATE_ENFORCEMENT=enforce
 */

const assert = require('assert');
const { canExecute, STAGES } = require('../../governance/runtimeStateClassification');
const {
  _resolveModuleForPath,
  ROUTE_MODULE_MAP
} = require('../../middleware/runtimeStateEnforcementMiddleware');
const { isConversationalTurn, enforceTextResponse } = require('../../services/industrialTruthEnforcementService');

function testRouteMapping() {
  assert.strictEqual(
    _resolveModuleForPath('/api/cognitive-council/execute'),
    'cognitive.council',
    'cognitive-council deve mapear para cognitive.council'
  );
  assert.strictEqual(
    _resolveModuleForPath('/api/cognitive-activation/status'),
    'cognitive.pulse'
  );
  assert.strictEqual(
    _resolveModuleForPath('/api/cognitive-registry/health'),
    'governance.audit'
  );
  assert.strictEqual(
    _resolveModuleForPath('/api/cognitive/foo'),
    'cognitive.envelope'
  );

  const councilExec = canExecute('cognitive.council', 'POST /api/cognitive-council/execute');
  assert.strictEqual(councilExec.allowed, true, 'cognitive.council deve permitir EXECUTION');
  assert.strictEqual(councilExec.stage, STAGES.EXECUTION);

  const envelopeExec = canExecute('cognitive.envelope', 'POST /api/cognitive/x');
  assert.strictEqual(envelopeExec.allowed, false, 'cognitive.envelope não deve executar POST em enforce');

  const councilIdx = ROUTE_MODULE_MAP.findIndex(([p]) => p === '/api/cognitive-council');
  const genericIdx = ROUTE_MODULE_MAP.findIndex(([p]) => p === '/api/cognitive');
  assert.ok(councilIdx >= 0 && genericIdx >= 0 && councilIdx < genericIdx, 'prefixo específico antes do genérico');
}

async function testConversationalTruthBypass() {
  assert.strictEqual(isConversationalTurn('Bom dia'), true);
  assert.strictEqual(isConversationalTurn('Quem é você?'), true);
  assert.strictEqual(isConversationalTurn('Qual o OEE atual?'), false);

  const r = await enforceTextResponse('Olá! Sou a Impetus IA, pronta para ajudar.', {
    user: { id: 'u1', company_id: 'c1' },
    queryText: 'Bom dia',
    injectOperational: true,
    channel: 'dashboard_chat',
    dataState: 'telemetry_only'
  });
  assert.strictEqual(r.skipped, 'conversational_turn');
  assert.match(r.text, /Impetus IA/i);
  assert.notStrictEqual(r.text, 'UNSUPPORTED_OPERATIONAL_CLAIM');
}

async function main() {
  testRouteMapping();
  await testConversationalTruthBypass();
  console.log('[chat-ai/chatRuntimeRouteScenarios] OK');
}

main().catch((e) => {
  console.error('[chat-ai/chatRuntimeRouteScenarios] FAIL', e);
  process.exit(1);
});
