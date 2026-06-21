'use strict';

/**
 * EVENT-GOVERNANCE-10 — testes migração ManuIA → Governance.
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
  console.log('\n  EVENT-GOVERNANCE-10-MANUIA\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/manuiaGovernanceAdapter.js');
  const ingestPath = path.join(SRC, 'services/manuiaApp/manuiaInboxIngestService.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_10_MANUIA_AUDIT.md');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const federationSrc = readSrc('services/notificationFederationService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_MANUIA;
  delete process.env.EVENT_GOVERNANCE_MANUIA;

  delete require.cache[require.resolve(ingestPath)];
  delete require.cache[require.resolve(adapterPath)];

  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  await test('T1 — auditoria ManuIA documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('"events_mapped": true'));
    assert(content.includes('"migration_safe": true'));
    assert(content.includes('manuiaInboxIngestService'));
    assert(content.includes('manuia_inbox_notifications'));
    assert(content.includes('NC-04'));
  });

  await test('T2 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchManuiaNotification === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.runLegacyDistribution === 'function');
    assert.strictEqual(adapter.POLICY_ID, 'MANUIA_INBOX');
  });

  await test('T3 — mapEventTypeToTechnicalPhase CRITICAL_FAILURE', () => {
    assert.strictEqual(adapter.mapEventTypeToTechnicalPhase('plc_critical'), 'CRITICAL_FAILURE');
    assert.strictEqual(adapter.mapEventTypeToTechnicalPhase('machine_stopped'), 'CRITICAL_FAILURE');
  });

  await test('T4 — mapEventTypeToTechnicalPhase ANOMALY e WORK_ORDER', () => {
    assert.strictEqual(adapter.mapEventTypeToTechnicalPhase('ops_anomaly_temperature'), 'ANOMALY_DETECTED');
    assert.strictEqual(adapter.mapEventTypeToTechnicalPhase('work_order_created'), 'WORK_ORDER_CREATED');
    assert.strictEqual(adapter.mapEventTypeToTechnicalPhase('manual_escalation'), 'MANUAL_ESCALATION');
  });

  await test('T5 — buildGovernanceEvent MANUIA_INBOX', () => {
    const event = adapter.buildGovernanceEvent({
      userId: '00000000-0000-0000-0000-000000000001',
      companyId: '00000000-0000-0000-0000-000000000002',
      eventType: 'plc_critical',
      severity: 'critical',
      title: 'Parada de máquina',
      body: 'Equipamento offline'
    });
    assert.strictEqual(event.eventType, 'plc_critical');
    assert.strictEqual(event.category, 'manuia');
    assert.strictEqual(event.sourceModule, 'manuiaInboxIngestService');
    assert.strictEqual(event.payload.technicalPhase, 'CRITICAL_FAILURE');
    assert.strictEqual(event.severity, 'critical');
  });

  await test('T6 — compareShadow match MANUIA_INBOX', () => {
    const legacy = adapter.inferLegacyDistribution({
      userId: 'u1',
      eventType: 'failure_predicted',
      severity: 'high'
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'MANUIA_INBOX',
        decision: {
          policyId: 'MANUIA_INBOX',
          severity: 'high',
          channels: ['manuia_inbox', 'web_push_optional'],
          escalationLevel: 2
        }
      },
      execution: { channelsReady: ['manuia_inbox', 'web_push_optional'] }
    };
    assert.strictEqual(adapter.compareShadow(legacy, governanceResult).match, true);
  });

  await test('T7 — flag OFF shadow mode', async () => {
    delete process.env.EVENT_GOVERNANCE_MANUIA;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchManuiaNotification({
      userId: '00000000-0000-0000-0000-000000000001',
      companyId: '00000000-0000-0000-0000-000000000002',
      eventType: 'maintenance_recommended',
      title: 'Manutenção preventiva recomendada'
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.useLegacy, true);
    assert(result.comparison);

    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_MANUIA = 'true';

    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(ingestPath)];
    delete require.cache[require.resolve(adapterPath)];

    const ingest = require(ingestPath);
    const origExec = ingest.executeLegacyIngest;
    ingest.executeLegacyIngest = async () => ({ row: { id: 'test-inbox' }, decision: {}, push: null });

    const execSvc = require(execPath);
    const origEval = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async () => ({
      evaluation: {
        approved: true,
        policyId: 'MANUIA_INBOX',
        decision: {
          policyId: 'MANUIA_INBOX',
          severity: 'medium',
          channels: ['manuia_inbox', 'web_push_optional'],
          escalationLevel: 1
        }
      },
      execution: {
        channelsReady: ['manuia_inbox', 'web_push_optional'],
        executionPlan: [{ channel: 'manuia_inbox', validationPassed: true }]
      }
    });

    const mod = require(adapterPath);
    const result = await mod.dispatchManuiaNotification({
      userId: '00000000-0000-0000-0000-000000000001',
      companyId: '00000000-0000-0000-0000-000000000002',
      eventType: 'diagnostic_completed',
      title: 'Diagnóstico concluído'
    });

    assert.strictEqual(result.mode, 'governance');
    assert.strictEqual(result.distribution?.success, true);

    ingest.executeLegacyIngest = origExec;
    execSvc.evaluatePrepareAndExecute = origEval;
    delete process.env.EVENT_GOVERNANCE_MANUIA;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(ingestPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T9 — fallback em erro governance', async () => {
    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    const orig = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async () => {
      throw new Error('manuia_governance_simulated_failure');
    };

    const mod = require(adapterPath);
    const result = await mod.dispatchManuiaNotification({
      userId: '00000000-0000-0000-0000-000000000001',
      companyId: '00000000-0000-0000-0000-000000000002',
      eventType: 'anomaly_detected',
      title: 'Anomalia detectada'
    });

    assert.strictEqual(result.mode, 'legacy_fallback');
    assert.strictEqual(result.useLegacy, true);

    execSvc.evaluatePrepareAndExecute = orig;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T10 — manuiaInboxIngestService integra adapter', () => {
    const src = readSrc('services/manuiaApp/manuiaInboxIngestService.js');
    assert(src.includes('manuiaGovernanceAdapter'));
    assert(src.includes('_dispatchManuiaIngest'));
    assert(src.includes('executeLegacyIngest'));
    assert(src.includes('insertInboxNotification') || src.includes('executeLegacyIngest'));
    assert(src.includes('ingestForUser'));
  });

  await test('T11 — federation compatibility (manuia_inbox_notifications)', () => {
    assert(federationSrc.includes("'manuia_inbox_notifications'"));
    assert(federationSrc.includes('mapRowToDto'));
    const adapterSrc = readSrc('services/governanceAdapters/manuiaGovernanceAdapter.js');
    assert(adapterSrc.includes('executeLegacyIngest'));
    assert(adapterSrc.includes('manuia_inbox'));
  });

  await test('T12 — observability métricas manuia', () => {
    assert(observabilitySrc.includes('event_governance_manuia_events'));
    assert(observabilitySrc.includes('event_governance_manuia_migrated'));
    assert(observabilitySrc.includes('event_governance_manuia_shadow_total'));
  });

  await test('T13 — GET /api/audit/event-governance/manuia', () => {
    assert(auditSrc.includes('/event-governance/manuia'));
    assert(auditSrc.includes('manuiaGovernance'));
  });

  await test('T14 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_MANUIA'));
  });

  await test('T15 — isManuiaGovernanceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_MANUIA;
    delete require.cache[require.resolve(adapterPath)];
    assert.strictEqual(require(adapterPath).isManuiaGovernanceEnabled(), false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_MANUIA = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_MANUIA;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
