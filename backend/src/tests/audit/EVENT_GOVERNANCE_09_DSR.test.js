'use strict';

/**
 * EVENT-GOVERNANCE-09 — testes migração DSR/LGPD → Governance.
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
  console.log('\n  EVENT-GOVERNANCE-09-DSR\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/dsrGovernanceAdapter.js');
  const dsrPath = path.join(SRC, 'services/dsrNotificationService.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_09_DSR_AUDIT.md');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const federationSrc = readSrc('services/notificationFederationService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_DSR;
  delete process.env.EVENT_GOVERNANCE_DSR;

  delete require.cache[require.resolve(dsrPath)];
  delete require.cache[require.resolve(adapterPath)];

  const dsr = require(dsrPath);
  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  await test('T1 — auditoria DSR documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('"events_mapped": true'));
    assert(content.includes('"migration_safe": true'));
    assert(content.includes('dsrNotificationService'));
    assert(content.includes('NC-04'));
  });

  await test('T2 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchDsrNotification === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.runLegacyDistribution === 'function');
    assert.strictEqual(adapter.POLICY_ID, 'DSR_LIFECYCLE');
  });

  await test('T3 — mapTypeToLifecyclePhase REQUEST_CREATED', () => {
    assert.strictEqual(
      adapter.mapTypeToLifecyclePhase(dsr.DSR_NOTIFICATION_TYPES.EXPORT_SUBMITTED),
      'REQUEST_CREATED'
    );
    assert.strictEqual(
      adapter.mapTypeToLifecyclePhase(dsr.DSR_NOTIFICATION_TYPES.ERASE_SUBMITTED),
      'REQUEST_CREATED'
    );
  });

  await test('T4 — mapTypeToLifecyclePhase REQUEST_DUE_SOON e COMPLETED', () => {
    assert.strictEqual(
      adapter.mapTypeToLifecyclePhase(dsr.DSR_NOTIFICATION_TYPES.SLA_APPROACHING),
      'REQUEST_DUE_SOON'
    );
    assert.strictEqual(
      adapter.mapTypeToLifecyclePhase(dsr.DSR_NOTIFICATION_TYPES.EXPORT_EXECUTED),
      'REQUEST_COMPLETED'
    );
    assert.strictEqual(
      adapter.mapTypeToLifecyclePhase(dsr.DSR_NOTIFICATION_TYPES.ERASE_REJECTED),
      'REQUEST_REJECTED'
    );
  });

  await test('T5 — buildGovernanceEvent DSR_LIFECYCLE', () => {
    const event = adapter.buildGovernanceEvent({
      userId: '00000000-0000-0000-0000-000000000001',
      companyId: '00000000-0000-0000-0000-000000000002',
      type: dsr.DSR_NOTIFICATION_TYPES.SLA_APPROACHING,
      requestId: 'req-1'
    });
    assert.strictEqual(event.eventType, dsr.DSR_NOTIFICATION_TYPES.SLA_APPROACHING);
    assert.strictEqual(event.category, 'dsr');
    assert.strictEqual(event.sourceModule, 'dsrNotificationService');
    assert.strictEqual(event.payload.lifecyclePhase, 'REQUEST_DUE_SOON');
    assert.strictEqual(event.severity, 'critical');
  });

  await test('T6 — compareShadow match DSR_LIFECYCLE', () => {
    const legacy = adapter.inferLegacyDistribution({
      userId: 'u1',
      type: dsr.DSR_NOTIFICATION_TYPES.EXPORT_SUBMITTED
    });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'DSR_LIFECYCLE',
        decision: {
          policyId: 'DSR_LIFECYCLE',
          severity: 'medium',
          channels: ['notification_center', 'notifications_table'],
          escalationLevel: 1
        }
      },
      execution: { channelsReady: ['notification_center', 'notifications_table'] }
    };
    assert.strictEqual(adapter.compareShadow(legacy, governanceResult).match, true);
  });

  await test('T7 — flag OFF shadow mode', async () => {
    delete process.env.EVENT_GOVERNANCE_DSR;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchDsrNotification({
      userId: '00000000-0000-0000-0000-000000000001',
      companyId: '00000000-0000-0000-0000-000000000002',
      type: dsr.DSR_NOTIFICATION_TYPES.EXPORT_APPROVED,
      requestId: 'req-shadow'
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.useLegacy, true);
    assert(result.comparison);

    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_DSR = 'true';

    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);

    const origRun = mod.runLegacyDistribution;
    mod.runLegacyDistribution = async () => ({ ok: true });

    const result = await mod.dispatchDsrNotification({
      userId: '00000000-0000-0000-0000-000000000001',
      companyId: '00000000-0000-0000-0000-000000000002',
      type: dsr.DSR_NOTIFICATION_TYPES.EXPORT_EXECUTED,
      requestId: 'req-gov'
    });

    assert.strictEqual(result.mode, 'governance');

    mod.runLegacyDistribution = origRun;
    delete process.env.EVENT_GOVERNANCE_DSR;
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T9 — fallback em erro governance', async () => {
    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];

    const execSvc = require(execPath);
    const orig = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async () => {
      throw new Error('dsr_governance_simulated_failure');
    };

    const mod = require(adapterPath);
    const result = await mod.dispatchDsrNotification({
      userId: '00000000-0000-0000-0000-000000000001',
      companyId: '00000000-0000-0000-0000-000000000002',
      type: dsr.DSR_NOTIFICATION_TYPES.ERASE_SUBMITTED,
      requestId: 'req-fallback'
    });

    assert.strictEqual(result.mode, 'legacy_fallback');
    assert.strictEqual(result.useLegacy, true);

    execSvc.evaluatePrepareAndExecute = orig;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T10 — dsrNotificationService integra adapter', () => {
    const src = readSrc('services/dsrNotificationService.js');
    assert(src.includes('dsrGovernanceAdapter'));
    assert(src.includes('_dispatchDsrNotify'));
    assert(src.includes('buildNotificationContent'));
    assert(src.includes('notifyDpoTeam'));
    assert(src.includes('scanSlaApproaching'));
    assert(src.includes('INSERT INTO notifications') || src.includes('runLegacyDistribution'));
  });

  await test('T11 — federation compatibility (notifications source)', () => {
    assert(federationSrc.includes("'notifications'"));
    assert(federationSrc.includes('mapRowToDto'));
    const adapterSrc = readSrc('services/governanceAdapters/dsrGovernanceAdapter.js');
    assert(adapterSrc.includes('INSERT INTO notifications'));
    assert(adapterSrc.includes('notifications_table'));
  });

  await test('T12 — observability métricas dsr', () => {
    assert(observabilitySrc.includes('event_governance_dsr_events'));
    assert(observabilitySrc.includes('event_governance_dsr_migrated'));
    assert(observabilitySrc.includes('event_governance_dsr_shadow_total'));
  });

  await test('T13 — GET /api/audit/event-governance/dsr', () => {
    assert(auditSrc.includes('/event-governance/dsr'));
    assert(auditSrc.includes('dsrGovernance'));
  });

  await test('T14 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_DSR'));
  });

  await test('T15 — isDsrGovernanceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_DSR;
    delete require.cache[require.resolve(adapterPath)];
    assert.strictEqual(require(adapterPath).isDsrGovernanceEnabled(), false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_DSR = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_DSR;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
