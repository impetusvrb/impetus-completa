'use strict';

/**
 * EVENT-GOVERNANCE-11B — testes migração SST → Governance.
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
  console.log('\n  EVENT-GOVERNANCE-11B-SST\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/sstGovernanceAdapter.js');
  const sstPath = path.join(SRC, 'services/sstNotificationService.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_11B_SST_AUDIT.md');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const policySrc = readSrc('governance/eventPolicyCatalog.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_SST;
  delete process.env.EVENT_GOVERNANCE_SST;

  delete require.cache[require.resolve(adapterPath)];
  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  const sst = require(sstPath);

  await test('T1 — auditoria SST documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('"events_mapped": true'));
    assert(content.includes('"migration_safe": true'));
    assert(content.includes('sstNotificationService'));
    assert(content.includes('SST_LIFECYCLE'));
    assert(content.includes('escalonamento'));
  });

  await test('T2 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchSstNotification === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.runLegacyDistribution === 'function');
    assert.strictEqual(adapter.POLICY_ID, 'SST_LIFECYCLE');
  });

  await test('T3 — política SST_LIFECYCLE no catálogo', () => {
    assert(policySrc.includes('SST_LIFECYCLE'));
    assert(policySrc.includes('sstNotificationService'));
    assert(policySrc.includes('sst_*'));
    assert(policySrc.includes('executive'));
  });

  await test('T4 — lifecycle e escalonamento SST', () => {
    assert.strictEqual(
      sst.mapEventTypeToLifecyclePhase('sst_near_miss', 'medium'),
      'SST_NEAR_MISS'
    );
    assert.strictEqual(
      sst.mapEventTypeToLifecyclePhase('sst_accident_reported', 'high'),
      'SST_ACCIDENT_REPORTED'
    );
    assert.strictEqual(
      sst.mapEventTypeToLifecyclePhase('sst_emergency_event', 'critical'),
      'SST_EMERGENCY_EVENT'
    );
    assert.strictEqual(sst.resolveEscalationLevel('SST_TRAINING_DUE', 'low'), 1);
    assert.strictEqual(sst.resolveEscalationLevel('SST_ACCIDENT_REPORTED', 'high'), 3);
    assert.strictEqual(sst.resolveEscalationLevel('SST_EMERGENCY_EVENT', 'critical'), 4);
    assert(Object.keys(sst.SST_ESCALATION_LEVELS).length === 4);
  });

  await test('T5 — buildGovernanceEvent SST_LIFECYCLE', () => {
    const event = adapter.buildGovernanceEvent({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'sst_near_miss',
      severity: 'high',
      title: 'Quase acidente linha 2'
    });
    assert.strictEqual(event.eventType, 'sst_near_miss');
    assert.strictEqual(event.category, 'sst');
    assert.strictEqual(event.sourceModule, 'sstNotificationService');
    assert.strictEqual(event.payload.lifecyclePhase, 'SST_NEAR_MISS');
    assert(event.payload.escalationLevel >= 1 && event.payload.escalationLevel <= 4);
  });

  await test('T6 — compareShadow match SST_LIFECYCLE', () => {
    const legacy = adapter.inferLegacyDistribution({
      eventType: 'sst_training_due',
      severity: 'low'
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'SST_LIFECYCLE',
        decision: {
          policyId: 'SST_LIFECYCLE',
          severity: 'low',
          channels: ['notification_center', 'dashboard', 'chat', 'app_impetus'],
          escalationLevel: legacy.escalationLevel
        }
      },
      execution: {
        channelsReady: ['notification_center', 'dashboard', 'chat', 'app_impetus']
      }
    };
    assert.strictEqual(adapter.compareShadow(legacy, governanceResult).match, true);
  });

  await test('T7 — flag OFF shadow mode', async () => {
    delete process.env.EVENT_GOVERNANCE_SST;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchSstNotification({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'sst_incident_created',
      severity: 'medium',
      title: 'Incidente SST',
      message: 'Teste shadow'
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.useLegacy, true);
    assert(result.comparison);

    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_SST = 'true';
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);

    const origRun = mod.runLegacyDistribution;
    mod.runLegacyDistribution = async () => ({ ok: true, sent: 1 });

    const result = await mod.dispatchSstNotification({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'sst_audit_due',
      severity: 'medium',
      title: 'Auditoria SST'
    });

    assert.strictEqual(result.mode, 'governance');

    mod.runLegacyDistribution = origRun;
    delete process.env.EVENT_GOVERNANCE_SST;
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T9 — fallback em erro governance', async () => {
    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    const orig = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async () => {
      throw new Error('sst_governance_simulated_failure');
    };

    const mod = require(adapterPath);
    const result = await mod.dispatchSstNotification({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'sst_non_compliance',
      title: 'NC SST',
      message: 'Fallback test'
    });

    assert.strictEqual(result.mode, 'legacy_fallback');
    assert.strictEqual(result.useLegacy, true);

    execSvc.evaluatePrepareAndExecute = orig;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T10 — operationalAlertsService integra SST', () => {
    const src = readSrc('services/operationalAlertsService.js');
    assert(src.includes('isSstOperationalAlert'));
    assert(src.includes('dispatchFromOperationalAlert'));
    assert(src.includes('sstNotificationService'));
  });

  await test('T11 — sstNotificationService integra adapter', () => {
    const src = readSrc('services/sstNotificationService.js');
    assert(src.includes('sstGovernanceAdapter'));
    assert(src.includes('_dispatchSstNotify'));
    assert(src.includes('bridgeExecutiveMessage'));
    assert(src.includes('SST_ESCALATION_LEVELS'));
  });

  await test('T12 — isSstOperationalAlert classificador', () => {
    assert.strictEqual(sst.isSstOperationalAlert({ tipo_alerta: 'sst_near_miss' }), true);
    assert.strictEqual(sst.isSstOperationalAlert({ source: 'safety_module' }), true);
    assert.strictEqual(sst.isSstOperationalAlert({ tipo_alerta: 'maquina_parada' }), false);
  });

  await test('T13 — observability métricas sst', () => {
    assert(observabilitySrc.includes('event_governance_sst_events'));
    assert(observabilitySrc.includes('event_governance_sst_migrated'));
    assert(observabilitySrc.includes('event_governance_sst_shadow_total'));
    assert(observabilitySrc.includes('event_governance_sst_shadow_match'));
    assert(observabilitySrc.includes('event_governance_sst_shadow_divergence'));
  });

  await test('T14 — GET /api/audit/event-governance/sst', () => {
    assert(auditSrc.includes('/event-governance/sst'));
    assert(auditSrc.includes('sstGovernance'));
  });

  await test('T15 — feature flag e default false', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_SST'));
    delete process.env.EVENT_GOVERNANCE_SST;
    delete require.cache[require.resolve(adapterPath)];
    assert.strictEqual(require(adapterPath).isSstGovernanceEnabled(), false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_SST = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_SST;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      passed,
      failed,
      sst_migrated: true,
      sst_workflow_preserved: true,
      escalation_supported: true,
      shadow_mode_available: true,
      fallback_available: true,
      tests_passing: true
    })
  );
})();
