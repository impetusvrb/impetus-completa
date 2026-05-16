'use strict';

/**
 * WAVE 4 — Safe Cognitive Context (budget, summarizer, autoloop, token gov).
 */

let passed = 0;
let failed = 0;
const COMPANY_ID = 'dddddddd-eeee-ffff-0000-111111111111';
const savedEnv = {};

function saveEnv(keys) {
  keys.forEach((k) => {
    savedEnv[k] = process.env[k];
  });
}

function restoreEnv(keys) {
  keys.forEach((k) => {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  });
}

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

function clearCache(sub) {
  for (const key of Object.keys(require.cache)) {
    if (key.includes(sub)) delete require.cache[key];
  }
}

const SAMPLE_BLOCK = `## MEMÓRIA OPERACIONAL IMPETUS
### Tarefas pendentes:
- [open] Verificar bomba hidráulica → joao
### Eventos recentes da empresa:
- [parada] Linha 2 parada por falha sensor`;

const ENV_KEYS = [
  'IMPETUS_AI_CONTEXT_BUDGET_ENABLED',
  'IMPETUS_AI_SUMMARIZER_ENABLED',
  'IMPETUS_AI_AUTOLOOP_GUARD',
  'IMPETUS_AI_AUTOLOOP_GUARD_ENFORCE',
  'IMPETUS_AI_TOKEN_QUOTA_PER_TENANT',
  'IMPETUS_AI_SATURATION_PROTECTION_ENABLED',
  'IMPETUS_AI_TOKEN_GOVERNANCE_ENFORCE'
];

(async () => {
  console.log('\n══ WAVE 4 — SAFE COGNITIVE CONTEXT ══\n');
  saveEnv(ENV_KEYS);

  try {
    for (const k of ENV_KEYS) delete process.env[k];

    console.log('── Flags ──');
    clearCache('cognitiveBudget');
    const flags = require('../cognitiveBudget/cognitiveBudgetFlags');
    assert('W4.1 budget off', flags.isContextBudgetEnabled() === false);
    assert('W4.2 autoloop on por defeito', flags.isAutoloopGuardEnabled() === true);
    assert('W4.3 autoloop enforce off', flags.isAutoloopGuardEnforce() === false);

    console.log('\n── Pipeline pass-through ──');
    const pipeline = require('../cognitiveBudget/safeCognitiveContextPipeline');
    const pass = await pipeline.applyMemoryBlockBudget({
      block: SAMPLE_BLOCK,
      companyId: COMPANY_ID
    });
    assert('W4.4 bloco inalterado sem budget', pass.block === SAMPLE_BLOCK && pass.applied === false);

    console.log('\n── Quotas persona/domain ──');
    const quotas = require('../cognitiveBudget/contextQuotaRegistry');
    const q = quotas.resolveQuotas({ persona: 'director_industrial', domain: 'operational', module: 'dashboard_chat' });
    assert('W4.5 director budget', q.limits.persona === 12000);
    assert('W4.6 effective min', q.effective_token_budget <= 12000);

    console.log('\n── Fact compression ──');
    const compress = require('../cognitiveBudget/factCompressionLayer');
    const facts = compress.compressBlockToFacts(SAMPLE_BLOCK);
    assert('W4.7 factos extraídos', facts.facts.length >= 2);
    assert('W4.8 texto comprimido', facts.compressed_text.includes('FACTOS OPERACIONAIS'));

    console.log('\n── Budget apply ──');
    process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED = 'true';
    clearCache('cognitiveBudget');
    const budget = require('../cognitiveBudget/aiContextBudgetService');
    const longText = 'x'.repeat(50000);
    const applied = await budget.applyBudgetToText(longText, {
      company_id: COMPANY_ID,
      persona: 'operator',
      domain: 'operational',
      module: 'chat'
    });
    assert('W4.9 truncagem activa', applied.applied === true);
    assert('W4.10 tokens reduzidos', applied.tokens_after < applied.tokens_before);

    console.log('\n── Summarizer ──');
    process.env.IMPETUS_AI_SUMMARIZER_ENABLED = 'true';
    clearCache('cognitiveBudget');
    const sum = require('../cognitiveBudget/summarizationEngine');
    const summarized = await sum.summarizeContextBlock(SAMPLE_BLOCK, {
      company_id: COMPANY_ID,
      persona: 'supervisor',
      module: 'dashboard_chat'
    });
    assert('W4.11 summarizer ok', summarized.ok === true);
    assert('W4.12 contract version', summarized.contract.contract_version === 1);

    console.log('\n── Token governance ──');
    const tokenGov = require('../cognitiveBudget/tokenGovernanceService');
    const rec = tokenGov.recordTenantUsage(COMPANY_ID, 1000);
    assert('W4.13 uso registado', rec.recorded === true);
    assert('W4.14 remaining', tokenGov.getTenantRemainingTokens(COMPANY_ID) > 0);

    console.log('\n── Autoloop guard observe ──');
    const guard = require('../cognitiveBudget/aiAutoloopGuard');
    let last;
    for (let i = 0; i < 6; i += 1) {
      last = guard.checkInvocation({
        company_id: COMPANY_ID,
        conversation_id: 'conv-loop',
        causation_id: 'same-cause'
      });
    }
    assert('W4.15 loop detectado', last.loop_suspected === true);
    assert('W4.16 não bloqueia sem enforce', last.blocked === false);

    console.log('\n── Pipeline com budget ──');
    clearCache('cognitiveBudget');
    const pipe2 = require('../cognitiveBudget/safeCognitiveContextPipeline');
    const piped = await pipe2.applyMemoryBlockBudget({
      block: SAMPLE_BLOCK,
      companyId: COMPANY_ID,
      module: 'dashboard_chat'
    });
    assert('W4.17 pipeline applied', piped.applied === true);

    console.log('\n── Runtime health ──');
    const runtime = require('../cognitiveBudget/cognitiveBudgetRuntime');
    runtime.bootstrap();
    const health = runtime.getHealth();
    assert('W4.18 health flags', health.flags.autoloop_guard === true);

    console.log('\n── Feature governance ──');
    process.env.IMPETUS_AI_SUMMARIZER_ENABLED = 'true';
    delete process.env.IMPETUS_AI_CONTEXT_BUDGET_ENABLED;
    clearCache('featureGovernanceService');
    const fg = require('../services/featureGovernanceService');
    const v = fg.bootstrap().validation;
    assert(
      'W4.19 warn summarizer sem budget',
      v.findings.some((f) => f.id === 'SUMMARIZER_WITHOUT_CONTEXT_BUDGET')
    );
  } catch (e) {
    assert('W4.X ' + (e && e.message ? e.message : e), false);
    console.error(e);
  } finally {
    restoreEnv(ENV_KEYS);
  }

  console.log(`\n══ Resultado: ${passed} passed, ${failed} failed ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
