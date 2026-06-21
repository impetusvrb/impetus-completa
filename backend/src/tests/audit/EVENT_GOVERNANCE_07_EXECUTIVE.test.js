'use strict';

/**
 * EVENT-GOVERNANCE-07 — testes migração Executive Mode → Governance.
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
  console.log('\n  EVENT-GOVERNANCE-07-EXECUTIVE\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/executiveGovernanceAdapter.js');
  const executivePath = path.join(SRC, 'services/executiveMode.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_EXECUTIVE;
  delete process.env.EVENT_GOVERNANCE_EXECUTIVE;

  delete require.cache[require.resolve(adapterPath)];
  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  const sampleInput = {
    companyId: '00000000-0000-0000-0000-000000000001',
    recipientPhone: '5511999999999',
    recipientUserId: '00000000-0000-0000-0000-000000000002',
    role: 'ceo',
    jobTitle: 'Diretor Industrial',
    message: 'Resumo executivo estratégico'
  };

  await test('T1 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchExecutiveMessage === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.inferLegacyDistribution === 'function');
    assert(typeof adapter.compareShadow === 'function');
    assert(typeof adapter.runLegacyDistribution === 'function');
  });

  await test('T2 — buildGovernanceEvent DTO executive', () => {
    const event = adapter.buildGovernanceEvent(sampleInput);
    assert.strictEqual(event.category, 'executive');
    assert.strictEqual(event.eventType, 'executive_response');
    assert.strictEqual(event.sourceModule, 'executiveMode');
    assert.strictEqual(event.severity, 'high');
    assert.strictEqual(event.payload.role, 'ceo');
  });

  await test('T3 — inferLegacyDistribution App + NC', () => {
    const legacy = adapter.inferLegacyDistribution(sampleInput);
    assert(legacy.channels.includes('app_impetus'));
    assert(legacy.channels.includes('notification_center'));
    assert.strictEqual(legacy.escalationLevel, 2);
    assert.strictEqual(legacy.severity, 'high');
  });

  await test('T4 — compareShadow match EXECUTIVE_ALERT', () => {
    const legacy = adapter.inferLegacyDistribution(sampleInput);
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'EXECUTIVE_ALERT',
        recipients: [{ strategy: 'executive_roles' }],
        decision: {
          policyId: 'EXECUTIVE_ALERT',
          severity: 'high',
          channels: ['app_impetus', 'notification_center'],
          escalationLevel: 2,
          recipients: [{ strategy: 'executive_roles' }]
        }
      },
      execution: {
        channelsReady: ['app_impetus', 'notification_center']
      }
    };
    assert.strictEqual(adapter.compareShadow(legacy, governanceResult).match, true);
  });

  await test('T5 — flag OFF shadow mode', async () => {
    delete process.env.EVENT_GOVERNANCE_EXECUTIVE;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchExecutiveMessage({
      ...sampleInput,
      source: 'executiveMode'
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.useLegacy, true);
    assert(result.comparison);

    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T6 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_EXECUTIVE = 'true';

    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    execSvc.executePlan = async () => ({
      success: true,
      ok: true,
      channelsExecuted: ['app_impetus'],
      executionPlan: [{ ok: true, channel: 'app_impetus' }]
    });

    const mod = require(adapterPath);
    const result = await mod.dispatchExecutiveMessage(sampleInput);

    assert.strictEqual(result.mode, 'governance');
    assert.strictEqual(result.useLegacy, false);

    delete process.env.EVENT_GOVERNANCE_EXECUTIVE;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T7 — fallback legacy em erro governance', async () => {
    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    const orig = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async () => {
      throw new Error('executive_governance_simulated_failure');
    };

    const mod = require(adapterPath);
    const result = await mod.dispatchExecutiveMessage(sampleInput);

    assert.strictEqual(result.mode, 'legacy_fallback');
    assert.strictEqual(result.useLegacy, true);

    execSvc.evaluatePrepareAndExecute = orig;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — executiveMode integra adapter em sendCEOResponse', () => {
    const src = readSrc('services/executiveMode.js');
    assert(src.includes('executiveGovernanceAdapter'));
    assert(src.includes('dispatchExecutiveMessage'));
    assert(src.includes('runLegacyDistribution'));
    assert(src.includes('sendCEOResponse'));
  });

  await test('T9 — observability métricas executive', () => {
    assert(observabilitySrc.includes('event_governance_executive_events'));
    assert(observabilitySrc.includes('event_governance_executive_migrated'));
    assert(observabilitySrc.includes('event_governance_executive_shadow_total'));
    assert(observabilitySrc.includes('event_governance_executive_shadow_match'));
    assert(observabilitySrc.includes('event_governance_executive_shadow_divergence'));
  });

  await test('T10 — GET /api/audit/event-governance/executive', () => {
    assert(auditSrc.includes('/event-governance/executive'));
    assert(auditSrc.includes('executiveGovernance'));
  });

  await test('T11 — getAuditStatus shape', () => {
    adapter.resetStatsForTests();
    const st = adapter.getAuditStatus();
    assert.strictEqual(typeof st.enabled, 'boolean');
    assert.strictEqual(typeof st.shadow_mode, 'boolean');
    assert.strictEqual(typeof st.events_evaluated, 'number');
    assert.strictEqual(typeof st.migrated_events, 'number');
  });

  await test('T12 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_EXECUTIVE'));
  });

  await test('T13 — isExecutiveGovernanceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_EXECUTIVE;
    delete require.cache[require.resolve(adapterPath)];
    assert.strictEqual(require(adapterPath).isExecutiveGovernanceEnabled(), false);
  });

  await test('T14 — loadUserExecutiveEligibility exportado', () => {
    const bridgeSrc = readSrc('services/notificationBridgeService.js');
    assert(bridgeSrc.includes('loadUserExecutiveEligibility'));
    assert(bridgeSrc.includes('module.exports'));
  });

  await test('T15 — divergência detectada', () => {
    const legacy = adapter.inferLegacyDistribution(sampleInput);
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'AI_PROACTIVE',
        decision: {
          policyId: 'AI_PROACTIVE',
          severity: 'medium',
          channels: ['app_impetus'],
          escalationLevel: 1
        }
      },
      execution: { channelsReady: ['app_impetus'] }
    };
    assert.strictEqual(adapter.compareShadow(legacy, governanceResult).match, false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_EXECUTIVE = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_EXECUTIVE;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
