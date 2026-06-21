'use strict';

/**
 * EVENT-GOVERNANCE-05 — testes migração IA Proactiva → Governance.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(rel) {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

let passed = 0;
let failed = 0;

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

(async () => {
  console.log('\n  EVENT-GOVERNANCE-05-AI-PROACTIVE\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/aiProactiveGovernanceAdapter.js');
  const aiServicePath = path.join(SRC, 'services/aiProactiveMessagingService.js');
  const proactiveJobPath = path.join(SRC, 'jobs/proactiveAI.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_AI_PROACTIVE;
  delete process.env.EVENT_GOVERNANCE_AI_PROACTIVE;

  delete require.cache[require.resolve(adapterPath)];
  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  await test('T1 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchAiProactive === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.inferLegacyDistribution === 'function');
    assert(typeof adapter.compareShadow === 'function');
    assert(typeof adapter.runLegacyDistribution === 'function');
  });

  await test('T2 — buildGovernanceEvent DTO AI', () => {
    const event = adapter.buildGovernanceEvent({
      companyId: '00000000-0000-0000-0000-000000000001',
      recipientPhone: '5511999999999',
      recipientUserId: '00000000-0000-0000-0000-000000000002',
      message: 'Padrão de falha detectado',
      triggerType: 'failure_pattern',
      source: 'proactiveAI'
    });
    assert.strictEqual(event.category, 'ai');
    assert.strictEqual(event.eventType, 'failure_pattern');
    assert.strictEqual(event.sourceModule, 'proactiveAI');
    assert.strictEqual(event.severity, 'high');
    assert.strictEqual(event.payload.phone, '5511999999999');
  });

  await test('T3 — inferLegacyDistribution App + NC', () => {
    const legacy = adapter.inferLegacyDistribution({
      recipientPhone: '5511888888888',
      recipientUserId: '00000000-0000-0000-0000-000000000003',
      triggerType: 'generic'
    });
    assert(legacy.channels.includes('app_impetus'));
    assert(legacy.channels.includes('notification_center'));
    assert.strictEqual(legacy.ncBridgeEligible, true);
  });

  await test('T4 — compareShadow match AI_PROACTIVE', () => {
    const legacy = adapter.inferLegacyDistribution({
      recipientPhone: '5511888888888',
      triggerType: 'failure_pattern'
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'AI_PROACTIVE',
        recipients: [{ strategy: 'hierarchy_lte_4' }],
        decision: {
          policyId: 'AI_PROACTIVE',
          severity: 'high',
          channels: ['app_impetus', 'notification_center'],
          escalationLevel: 2,
          recipients: [{ strategy: 'hierarchy_lte_4' }]
        }
      },
      execution: {
        channelsReady: ['app_impetus', 'notification_center']
      }
    };
    legacy.severity = 'high';
    legacy.escalationLevel = 2;
    const cmp = adapter.compareShadow(legacy, governanceResult);
    assert.strictEqual(cmp.match, true);
  });

  await test('T5 — flag OFF shadow mode', async () => {
    delete process.env.EVENT_GOVERNANCE_AI_PROACTIVE;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchAiProactive({
      companyId: '00000000-0000-0000-0000-000000000001',
      recipientPhone: '5511999999999',
      recipientUserId: '00000000-0000-0000-0000-000000000002',
      message: 'Teste shadow IA',
      triggerType: 'generic',
      source: 'aiProactiveMessagingService'
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.useLegacy, true);
    assert(result.comparison);
    assert.strictEqual(typeof result.comparison.match, 'boolean');

    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T6 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_AI_PROACTIVE = 'true';

    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    const origExecute = execSvc.executePlan;
    execSvc.executePlan = async () => ({
      success: true,
      dryRun: false,
      channelsExecuted: ['app_impetus'],
      executionPlan: [{ ok: true, channel: 'app_impetus', result: { id: 'mock-id' } }]
    });

    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchAiProactive({
      companyId: '00000000-0000-0000-0000-000000000001',
      recipientPhone: '5511999999999',
      message: 'Teste migrado',
      triggerType: 'failure_pattern',
      source: 'proactiveAI'
    });

    assert.strictEqual(result.mode, 'governance');
    assert.strictEqual(result.useLegacy, false);

    execSvc.executePlan = origExecute;
    delete process.env.EVENT_GOVERNANCE_AI_PROACTIVE;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T7 — fallback useLegacy em erro governance', async () => {
    delete process.env.EVENT_GOVERNANCE_AI_PROACTIVE;
    delete require.cache[require.resolve(adapterPath)];

    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    const execSvc = require(execPath);
    const orig = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async () => {
      throw new Error('governance_simulated_failure');
    };

    const mod = require(adapterPath);
    const result = await mod.dispatchAiProactive({
      companyId: '00000000-0000-0000-0000-000000000001',
      recipientPhone: '5511999999999',
      message: 'fallback test',
      source: 'aiProactiveMessagingService'
    });

    assert.strictEqual(result.mode, 'legacy_fallback');
    assert.strictEqual(result.useLegacy, true);

    execSvc.evaluatePrepareAndExecute = orig;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — aiProactiveMessagingService integra adapter', () => {
    const src = readSrc('services/aiProactiveMessagingService.js');
    assert(src.includes('aiProactiveGovernanceAdapter'));
    assert(src.includes('dispatchAiProactive'));
    assert(!src.includes('bridgeProactiveMessage'));
  });

  await test('T9 — proactiveAI integra _dispatchProactiveToRecipient', () => {
    const src = readSrc('jobs/proactiveAI.js');
    assert(src.includes('_dispatchProactiveToRecipient'));
    assert(src.includes('aiProactiveGovernanceAdapter'));
    assert(src.includes('runFailurePatternCheck'));
    assert(src.includes('remindIncompleteEvents'));
    assert(!src.includes('bridgeProactiveMessage'));
  });

  await test('T10 — observability métricas AI', () => {
    assert(observabilitySrc.includes('event_governance_ai_events'));
    assert(observabilitySrc.includes('event_governance_ai_migrated'));
    assert(observabilitySrc.includes('event_governance_ai_shadow_total'));
    assert(observabilitySrc.includes('event_governance_ai_shadow_match'));
    assert(observabilitySrc.includes('event_governance_ai_shadow_divergence'));
  });

  await test('T11 — GET /api/audit/event-governance/ai-proactive', () => {
    assert(auditSrc.includes('/event-governance/ai-proactive'));
    assert(auditSrc.includes('aiProactiveGovernance'));
  });

  await test('T12 — getAuditStatus shape', () => {
    adapter.resetStatsForTests();
    const st = adapter.getAuditStatus();
    assert.strictEqual(typeof st.enabled, 'boolean');
    assert.strictEqual(typeof st.shadow_mode, 'boolean');
    assert.strictEqual(typeof st.events_evaluated, 'number');
    assert.strictEqual(typeof st.matches, 'number');
    assert.strictEqual(typeof st.divergences, 'number');
    assert.strictEqual(typeof st.migrated_events, 'number');
  });

  await test('T13 — feature flag registada', () => {
    const fgSrc = readSrc('services/featureGovernanceService.js');
    assert(fgSrc.includes('EVENT_GOVERNANCE_AI_PROACTIVE'));
  });

  await test('T14 — isAiProactiveGovernanceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_AI_PROACTIVE;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    assert.strictEqual(mod.isAiProactiveGovernanceEnabled(), false);
  });

  await test('T15 — divergência detectada', () => {
    const legacy = adapter.inferLegacyDistribution({ recipientPhone: '5511000000000' });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'DEFAULT_INFO',
        recipients: [],
        decision: {
          policyId: 'DEFAULT_INFO',
          severity: 'info',
          channels: ['dashboard'],
          escalationLevel: 0
        }
      },
      execution: { channelsReady: ['dashboard'] }
    };
    const cmp = adapter.compareShadow(legacy, governanceResult);
    assert.strictEqual(cmp.match, false);
    assert(cmp.divergence);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_AI_PROACTIVE = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_AI_PROACTIVE;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
