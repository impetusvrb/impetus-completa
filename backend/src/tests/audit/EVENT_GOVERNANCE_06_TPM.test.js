'use strict';

/**
 * EVENT-GOVERNANCE-06 — testes migração TPM → Governance.
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

const criticalIncident = {
  id: 'inc-1',
  severity: 'critical',
  equipment_code: 'EQ-01',
  incident_date: '2026-06-20',
  losses_before: 5,
  losses_during: 8,
  losses_after: 2
};

(async () => {
  console.log('\n  EVENT-GOVERNANCE-06-TPM\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/tpmGovernanceAdapter.js');
  const tpmPath = path.join(SRC, 'services/tpmNotifications.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_TPM;
  delete process.env.EVENT_GOVERNANCE_TPM;
  delete process.env.TPM_NOTIFICATIONS_PERSIST_ALERT;

  delete require.cache[require.resolve(adapterPath)];
  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  await test('T1 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchTpmIncident === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.inferLegacyDistribution === 'function');
    assert(typeof adapter.compareShadow === 'function');
    assert(typeof adapter.runLegacyDistribution === 'function');
  });

  await test('T2 — buildGovernanceEvent DTO TPM', () => {
    const event = adapter.buildGovernanceEvent({
      companyId: '00000000-0000-0000-0000-000000000001',
      incident: criticalIncident,
      message: 'Incidente TPM',
      losses: 15
    });
    assert.strictEqual(event.category, 'tpm');
    assert.strictEqual(event.eventType, 'tpm_incident');
    assert.strictEqual(event.sourceModule, 'tpmNotifications');
    assert.strictEqual(event.severity, 'high');
    assert.strictEqual(event.payload.losses, 15);
  });

  await test('T3 — inferLegacyDistribution crítico App + NC', () => {
    const legacy = adapter.inferLegacyDistribution({
      incident: criticalIncident,
      recipients: [{ id: 'u1', phone: '5511999999999' }]
    });
    assert.strictEqual(legacy.severity, 'high');
    assert(legacy.channels.includes('app_impetus'));
    assert(legacy.channels.includes('notification_center'));
    assert.strictEqual(legacy.critical, true);
    assert.strictEqual(legacy.escalationLevel, 2);
  });

  await test('T4 — compareShadow match TPM_CRITICAL', () => {
    const legacy = adapter.inferLegacyDistribution({
      incident: criticalIncident,
      recipients: [{ id: 'u1', phone: '5511999999999' }]
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'TPM_CRITICAL',
        recipients: [{ strategy: 'tpm_managers' }],
        decision: {
          policyId: 'TPM_CRITICAL',
          severity: 'high',
          channels: ['app_impetus', 'notification_center'],
          escalationLevel: 2
        }
      },
      execution: {
        channelsReady: ['app_impetus', 'notification_center']
      }
    };
    const cmp = adapter.compareShadow(legacy, governanceResult);
    assert.strictEqual(cmp.match, true);
  });

  await test('T5 — flag OFF shadow mode', async () => {
    delete process.env.EVENT_GOVERNANCE_TPM;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchTpmIncident({
      companyId: '00000000-0000-0000-0000-000000000001',
      incident: criticalIncident,
      message: 'Shadow TPM',
      recipients: [{ id: 'u1', phone: '5511999999999' }]
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.useLegacy, true);
    assert(result.comparison);

    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T6 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_TPM = 'true';

    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    execSvc.executePlan = async () => ({
      success: true,
      channelsExecuted: ['app_impetus'],
      executionPlan: [{ ok: true, channel: 'app_impetus' }]
    });

    const mod = require(adapterPath);
    const result = await mod.dispatchTpmIncident({
      companyId: '00000000-0000-0000-0000-000000000001',
      incident: criticalIncident,
      message: 'Migrado TPM',
      recipients: [{ id: 'u1', phone: '5511999999999' }]
    });

    assert.strictEqual(result.mode, 'governance');
    assert.strictEqual(result.useLegacy, false);

    delete process.env.EVENT_GOVERNANCE_TPM;
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
      throw new Error('tpm_governance_simulated_failure');
    };

    const mod = require(adapterPath);
    const result = await mod.dispatchTpmIncident({
      companyId: '00000000-0000-0000-0000-000000000001',
      incident: criticalIncident,
      message: 'fallback',
      recipients: []
    });

    assert.strictEqual(result.mode, 'legacy_fallback');
    assert.strictEqual(result.useLegacy, true);

    execSvc.evaluatePrepareAndExecute = orig;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — tpmNotifications integra adapter', () => {
    const src = readSrc('services/tpmNotifications.js');
    assert(src.includes('tpmGovernanceAdapter'));
    assert(src.includes('dispatchTpmIncident'));
    assert(src.includes('notifyTpmIncident'));
    assert(!src.includes('bridgeTpmIncident(cid'));
  });

  await test('T9 — observability métricas TPM', () => {
    assert(observabilitySrc.includes('event_governance_tpm_events'));
    assert(observabilitySrc.includes('event_governance_tpm_migrated'));
    assert(observabilitySrc.includes('event_governance_tpm_shadow_total'));
    assert(observabilitySrc.includes('event_governance_tpm_shadow_match'));
    assert(observabilitySrc.includes('event_governance_tpm_shadow_divergence'));
  });

  await test('T10 — GET /api/audit/event-governance/tpm', () => {
    assert(auditSrc.includes('/event-governance/tpm'));
    assert(auditSrc.includes('tpmGovernance'));
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
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_TPM'));
  });

  await test('T13 — isTpmGovernanceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_TPM;
    delete require.cache[require.resolve(adapterPath)];
    assert.strictEqual(require(adapterPath).isTpmGovernanceEnabled(), false);
  });

  await test('T14 — inferSeverityFromIncident por perdas', () => {
    assert.strictEqual(
      adapter.inferSeverityFromIncident({ losses_before: 10, losses_during: 5, losses_after: 0 }),
      'high'
    );
  });

  await test('T15 — divergência detectada', () => {
    const legacy = adapter.inferLegacyDistribution({
      incident: criticalIncident,
      recipients: [{ id: 'u1' }]
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'DEFAULT_INFO',
        decision: {
          policyId: 'DEFAULT_INFO',
          severity: 'info',
          channels: ['dashboard'],
          escalationLevel: 0
        }
      },
      execution: { channelsReady: ['dashboard'] }
    };
    assert.strictEqual(adapter.compareShadow(legacy, governanceResult).match, false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_TPM = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_TPM;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
