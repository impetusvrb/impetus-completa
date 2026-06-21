'use strict';

/**
 * EVENT-GOVERNANCE-11A — testes migração Quality → Governance.
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
  console.log('\n  EVENT-GOVERNANCE-11A-QUALITY\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/qualityGovernanceAdapter.js');
  const qualityPath = path.join(SRC, 'services/qualityIntelligenceService.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_11A_QUALITY_AUDIT.md');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const policySrc = readSrc('governance/eventPolicyCatalog.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_QUALITY;
  delete process.env.EVENT_GOVERNANCE_QUALITY;

  delete require.cache[require.resolve(adapterPath)];
  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  await test('T1 — auditoria Quality documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('"events_mapped": true'));
    assert(content.includes('"migration_safe": true'));
    assert(content.includes('qualityIntelligenceService'));
    assert(content.includes('QUALITY_LIFECYCLE'));
  });

  await test('T2 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchQualityNotification === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.runLegacyDistribution === 'function');
    assert.strictEqual(adapter.POLICY_ID, 'QUALITY_LIFECYCLE');
  });

  await test('T3 — política QUALITY_LIFECYCLE no catálogo', () => {
    assert(policySrc.includes('QUALITY_LIFECYCLE'));
    assert(policySrc.includes('qualityIntelligenceService'));
    assert(policySrc.includes('notification_center'));
    assert(policySrc.includes('dashboard'));
  });

  await test('T4 — mapEventTypeToLifecyclePhase', () => {
    assert.strictEqual(
      adapter.mapEventTypeToLifecyclePhase('quality_low_conformity', 'medium'),
      'QUALITY_INSPECTION_FAILED'
    );
    assert.strictEqual(
      adapter.mapEventTypeToLifecyclePhase('quality_defect_increase', 'high'),
      'QUALITY_NON_CONFORMITY_CREATED'
    );
    assert.strictEqual(
      adapter.mapEventTypeToLifecyclePhase('quality_capa_created', 'high'),
      'QUALITY_CAPA_CREATED'
    );
    assert.strictEqual(
      adapter.mapEventTypeToLifecyclePhase('quality_audit_overdue', 'high'),
      'QUALITY_AUDIT_OVERDUE'
    );
  });

  await test('T5 — buildGovernanceEvent QUALITY_LIFECYCLE', () => {
    const event = adapter.buildGovernanceEvent({
      companyId: '00000000-0000-0000-0000-000000000001',
      alertType: 'defect_increase',
      eventType: 'quality_defect_increase',
      severity: 'high',
      title: 'Aumento de defeitos',
      targetRoleLevel: 3
    });
    assert.strictEqual(event.eventType, 'quality_defect_increase');
    assert.strictEqual(event.category, 'quality');
    assert.strictEqual(event.sourceModule, 'qualityIntelligenceService');
    assert.strictEqual(event.payload.lifecyclePhase, 'QUALITY_NON_CONFORMITY_CREATED');
  });

  await test('T6 — compareShadow match QUALITY_LIFECYCLE', () => {
    const legacy = adapter.inferLegacyDistribution({
      alertType: 'low_conformity',
      eventType: 'quality_low_conformity',
      severity: 'medium'
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'QUALITY_LIFECYCLE',
        decision: {
          policyId: 'QUALITY_LIFECYCLE',
          severity: 'medium',
          channels: ['notification_center', 'dashboard', 'chat', 'app_impetus'],
          escalationLevel: 2
        }
      },
      execution: {
        channelsReady: ['notification_center', 'dashboard', 'chat', 'app_impetus']
      }
    };
    assert.strictEqual(adapter.compareShadow(legacy, governanceResult).match, true);
  });

  await test('T7 — flag OFF shadow mode', async () => {
    delete process.env.EVENT_GOVERNANCE_QUALITY;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchQualityNotification({
      companyId: '00000000-0000-0000-0000-000000000001',
      alertType: 'defect_increase',
      eventType: 'quality_defect_increase',
      severity: 'high',
      alertRow: { id: 'a1', alert_type: 'defect_increase', title: 'Test' }
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.useLegacy, true);
    assert(result.comparison);

    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_QUALITY = 'true';
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);

    const origRun = mod.runLegacyDistribution;
    mod.runLegacyDistribution = async () => ({ ok: true, scheduled: true });

    const result = await mod.dispatchQualityNotification({
      companyId: '00000000-0000-0000-0000-000000000001',
      alertType: 'low_conformity',
      eventType: 'quality_low_conformity',
      severity: 'medium',
      alertRow: { id: 'a2', alert_type: 'low_conformity', title: 'Conformidade' }
    });

    assert.strictEqual(result.mode, 'governance');

    mod.runLegacyDistribution = origRun;
    delete process.env.EVENT_GOVERNANCE_QUALITY;
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T9 — fallback em erro governance', async () => {
    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    const orig = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async () => {
      throw new Error('quality_governance_simulated_failure');
    };

    const mod = require(adapterPath);
    const result = await mod.dispatchQualityNotification({
      companyId: '00000000-0000-0000-0000-000000000001',
      alertType: 'defect_increase',
      alertRow: { id: 'a3', alert_type: 'defect_increase', title: 'Fallback' }
    });

    assert.strictEqual(result.mode, 'legacy_fallback');
    assert.strictEqual(result.useLegacy, true);

    execSvc.evaluatePrepareAndExecute = orig;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T10 — qualityIntelligenceService integra adapter', () => {
    const src = readSrc('services/qualityIntelligenceService.js');
    assert(src.includes('qualityGovernanceAdapter'));
    assert(src.includes('_dispatchQualityAlert'));
    assert(src.includes('createQualityAlert'));
    assert(src.includes('INSERT INTO quality_alerts'));
    assert(!src.includes('dispatchFromQualityAlert(companyId, row)'));
  });

  await test('T11 — federation via manuia_inbox (compatibilidade)', () => {
    const federationSrc = readSrc('services/notificationFederationService.js');
    assert(federationSrc.includes("'manuia_inbox_notifications'"));
    const adapterSrc = readSrc('services/governanceAdapters/qualityGovernanceAdapter.js');
    assert(adapterSrc.includes('dispatchFromQualityAlert'));
  });

  await test('T12 — observability métricas quality', () => {
    assert(observabilitySrc.includes('event_governance_quality_events'));
    assert(observabilitySrc.includes('event_governance_quality_migrated'));
    assert(observabilitySrc.includes('event_governance_quality_shadow_total'));
  });

  await test('T13 — GET /api/audit/event-governance/quality', () => {
    assert(auditSrc.includes('/event-governance/quality'));
    assert(auditSrc.includes('qualityGovernance'));
  });

  await test('T14 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_QUALITY'));
  });

  await test('T15 — isQualityGovernanceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_QUALITY;
    delete require.cache[require.resolve(adapterPath)];
    assert.strictEqual(require(adapterPath).isQualityGovernanceEnabled(), false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_QUALITY = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_QUALITY;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
