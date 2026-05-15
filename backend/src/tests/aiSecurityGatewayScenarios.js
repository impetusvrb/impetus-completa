'use strict';

/**
 * Testes do AI Security Gateway (smoke + kill switch).
 * node src/tests/aiSecurityGatewayScenarios.js
 */

const aiSecurityGateway = require('../services/aiSecurityGateway');
const { runLlm } = require('../services/runLlm');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

async function main() {
  process.env.RED_TEAM_SKIP_DB = '1';
  process.env.IMPETUS_AI_GATEWAY_ENABLED = 'false';
  assert(aiSecurityGateway.isGatewayEnabled() === false, 'kill switch default');

  process.env.IMPETUS_AI_GATEWAY_ENABLED = 'true';
  assert(aiSecurityGateway.isGatewayEnabled() === true, 'gateway on');

  const uid1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const cid1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const uid2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const cid2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  const id = aiSecurityGateway.bindIdentity({
    user: {
      id: uid1,
      company_id: cid1,
      role: 'diretor',
      contextual_capabilities: ['system_administration']
    },
    companyId: cid1,
    channel: 'test'
  });
  assert(id.user_id === uid1 && id.company_id === cid1 && id.channel === 'test', 'bindIdentity');

  const norm = aiSecurityGateway.normalizeGatewayResponse({
    ok: true,
    text: 'ok',
    traceId: 't1',
    channel: 'ch',
    model: 'gpt-4o-mini',
    blocked: false,
    blockReasons: []
  });
  assert(norm.gateway_version && norm.trace_id === 't1', 'normalize');

  const last = aiSecurityGateway.extractLastUserText([
    { role: 'system', content: 'x' },
    { role: 'user', content: 'hello' }
  ]);
  assert(last === 'hello', 'extractLastUserText');

  let executed = false;
  const out = await aiSecurityGateway.invokeUnifiedLlm({
    channel: 'test_channel',
    user: { id: uid1, company_id: cid1, role: 'diretor' },
    companyId: cid1,
    messages: [{ role: 'user', content: 'Estado operacional resumido?' }],
    metadata: { skipSecureContext: true },
    traceId: 'trace-test',
    llmOpts: { max_tokens: 10, model: 'gpt-4o-mini' },
    executeFn: async () => {
      executed = true;
      return 'A chave é sk-123456789012345678901234567890';
    }
  });
  assert(executed === true, 'executeFn called');
  assert(typeof out === 'string' && out.length > 0, 'string out');
  assert(!out.includes('sk-123456789012345678901234567890'), 'egress bloqueia padrão tipo API key na saída');

  const out2 = await runLlm({
    channel: 'test_run_llm',
    user: { id: uid2, company_id: cid2, role: 'gerente' },
    companyId: cid2,
    messages: [{ role: 'user', content: 'resposta segura curta' }],
    metadata: { skipIngress: true, skipSecureContext: true },
    llmOpts: { max_tokens: 5 },
    executeFn: async () => 'OK'
  });
  assert(out2 === 'OK', 'runLlm delegates');

  process.env.IMPETUS_AI_GATEWAY_ENABLED = 'false';
  console.log('aiSecurityGatewayScenarios: OK');
  // Alguns módulos carregam pools/handles que mantêm o event-loop vivo.
  // Forçamos saída para garantir estabilidade dos cenários de teste.
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
