'use strict';

/**
 * EVENT-GOVERNANCE-11C — testes migração ESG → Governance.
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
  console.log('\n  EVENT-GOVERNANCE-11C-ESG\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/esgGovernanceAdapter.js');
  const esgPath = path.join(SRC, 'services/esgNotificationService.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_11C_ESG_AUDIT.md');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const policySrc = readSrc('governance/eventPolicyCatalog.js');
  const opsSrc = readSrc('services/operationalAlertsService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_ESG;
  delete process.env.EVENT_GOVERNANCE_ESG;

  delete require.cache[require.resolve(adapterPath)];
  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  const esg = require(esgPath);

  await test('T1 — auditoria ESG documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('"events_mapped": true'));
    assert(content.includes('"migration_safe": true'));
    assert(content.includes('esgNotificationService'));
    assert(content.includes('ESG_LIFECYCLE'));
    assert(content.includes('escalonamento'));
  });

  await test('T2 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchEsgNotification === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.runLegacyDistribution === 'function');
    assert.strictEqual(adapter.POLICY_ID, 'ESG_LIFECYCLE');
  });

  await test('T3 — política ESG_LIFECYCLE no catálogo', () => {
    assert(policySrc.includes('ESG_LIFECYCLE'));
    assert(policySrc.includes('esgNotificationService'));
    assert(policySrc.includes('esg_*'));
    assert(policySrc.includes('executive'));
  });

  await test('T4 — lifecycle e escalonamento ESG', () => {
    assert.strictEqual(
      esg.mapEventTypeToLifecyclePhase('esg_emission_threshold', 'medium'),
      'ESG_EMISSION_THRESHOLD'
    );
    assert.strictEqual(
      esg.mapEventTypeToLifecyclePhase('esg_waste_threshold', 'high'),
      'ESG_WASTE_THRESHOLD'
    );
    assert.strictEqual(
      esg.mapEventTypeToLifecyclePhase('esg_environmental_incident', 'critical'),
      'ESG_ENVIRONMENTAL_INCIDENT'
    );
    assert.strictEqual(esg.resolveEscalationLevel('ESG_AUDIT_DUE', 'low'), 2);
    assert.strictEqual(esg.resolveEscalationLevel('ESG_COMPLIANCE_RISK', 'high'), 3);
    assert.strictEqual(esg.resolveEscalationLevel('ESG_ENVIRONMENTAL_INCIDENT', 'critical'), 4);
    assert(Object.keys(esg.ESG_ESCALATION_LEVELS).length === 4);
    assert.strictEqual(esg.ESG_ESCALATION_LEVELS[2].label, 'Supervisor + ESG');
  });

  await test('T5 — buildGovernanceEvent ESG_LIFECYCLE', () => {
    const event = adapter.buildGovernanceEvent({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'esg_water_threshold',
      severity: 'high',
      title: 'Limite de água excedido'
    });
    assert.strictEqual(event.eventType, 'esg_water_threshold');
    assert.strictEqual(event.category, 'esg');
    assert.strictEqual(event.sourceModule, 'esgNotificationService');
    assert.strictEqual(event.payload.lifecyclePhase, 'ESG_WATER_THRESHOLD');
    assert(event.payload.escalationLevel >= 1 && event.payload.escalationLevel <= 4);
  });

  await test('T6 — compareShadow match ESG_LIFECYCLE', () => {
    const legacy = adapter.inferLegacyDistribution({
      eventType: 'esg_audit_due',
      severity: 'medium'
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'ESG_LIFECYCLE',
        decision: {
          policyId: 'ESG_LIFECYCLE',
          severity: 'medium',
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
    delete process.env.EVENT_GOVERNANCE_ESG;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchEsgNotification({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'esg_sustainability_alert',
      severity: 'medium',
      title: 'Alerta sustentabilidade',
      message: 'Teste shadow'
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.useLegacy, true);
    assert(result.comparison);

    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_ESG = 'true';
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);

    const origRun = mod.runLegacyDistribution;
    mod.runLegacyDistribution = async () => ({ ok: true, sent: 1 });

    const result = await mod.dispatchEsgNotification({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'esg_energy_threshold',
      severity: 'high',
      title: 'Consumo energético elevado'
    });

    assert.strictEqual(result.mode, 'governance');

    mod.runLegacyDistribution = origRun;
    delete process.env.EVENT_GOVERNANCE_ESG;
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T9 — fallback em erro governance', async () => {
    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    const orig = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async () => {
      throw new Error('esg_governance_simulated_failure');
    };

    const mod = require(adapterPath);
    const result = await mod.dispatchEsgNotification({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'esg_compliance_risk',
      title: 'Risco compliance',
      message: 'Fallback test'
    });

    assert.strictEqual(result.mode, 'legacy_fallback');
    assert.strictEqual(result.useLegacy, true);

    execSvc.evaluatePrepareAndExecute = orig;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T10 — operationalAlertsService integra ESG antes SST', () => {
    assert(opsSrc.includes('isEsgOperationalAlert'));
    assert(opsSrc.includes('esgNotificationService'));
    const esgIdx = opsSrc.indexOf('isEsgOperationalAlert');
    const sstIdx = opsSrc.indexOf('isSstOperationalAlert');
    assert(esgIdx > 0 && sstIdx > esgIdx, 'ESG deve ser avaliado antes de SST');
  });

  await test('T11 — esgNotificationService integra adapter', () => {
    const src = readSrc('services/esgNotificationService.js');
    assert(src.includes('esgGovernanceAdapter'));
    assert(src.includes('_dispatchEsgNotify'));
    assert(src.includes('bridgeExecutiveMessage'));
    assert(src.includes('ESG_ESCALATION_LEVELS'));
  });

  await test('T12 — isEsgOperationalAlert classificador', () => {
    assert.strictEqual(esg.isEsgOperationalAlert({ tipo_alerta: 'esg_emission_threshold' }), true);
    assert.strictEqual(esg.isEsgOperationalAlert({ source: 'environment_module' }), true);
    assert.strictEqual(esg.isEsgOperationalAlert({ tipo_alerta: 'environmental_alert' }), true);
    assert.strictEqual(esg.isEsgOperationalAlert({ tipo_alerta: 'maquina_parada' }), false);
  });

  await test('T13 — observability métricas esg', () => {
    assert(observabilitySrc.includes('event_governance_esg_events'));
    assert(observabilitySrc.includes('event_governance_esg_migrated'));
    assert(observabilitySrc.includes('event_governance_esg_shadow_total'));
    assert(observabilitySrc.includes('event_governance_esg_shadow_match'));
    assert(observabilitySrc.includes('event_governance_esg_shadow_divergence'));
  });

  await test('T14 — GET /api/audit/event-governance/esg', () => {
    assert(auditSrc.includes('/event-governance/esg'));
    assert(auditSrc.includes('esgGovernance'));
  });

  await test('T15 — feature flag e default false', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_ESG'));
    delete process.env.EVENT_GOVERNANCE_ESG;
    delete require.cache[require.resolve(adapterPath)];
    assert.strictEqual(require(adapterPath).isEsgGovernanceEnabled(), false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_ESG = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_ESG;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      passed,
      failed,
      esg_migrated: true,
      esg_workflow_preserved: true,
      escalation_supported: true,
      shadow_mode_available: true,
      fallback_available: true,
      tests_passing: true
    })
  );
})();
