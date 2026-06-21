'use strict';

/**
 * EVENT-GOVERNANCE-01 — testes da camada de governança de eventos (shadow mode).
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
  console.log('\n  EVENT-GOVERNANCE-01\n');

  const govPath = path.join(SRC, 'services/eventGovernanceService.js');
  const catalogPath = path.join(SRC, 'governance/eventPolicyCatalog.js');
  const severityPath = path.join(SRC, 'governance/severityNormalizer.js');
  const dtoPath = path.join(SRC, 'governance/governanceDecisionDto.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  delete require.cache[require.resolve(govPath)];
  const governance = require(govPath);
  const { normalizeSeverity } = require(severityPath);
  const { buildGovernanceDecisionDto } = require(dtoPath);
  const { getPolicyCount } = require(catalogPath);

  governance.resetStatsForTests();

  await test('T1 — eventGovernanceService exporta evaluateEvent', () => {
    assert(fs.existsSync(govPath));
    assert(typeof governance.evaluateEvent === 'function');
    assert(typeof governance.getAuditStatus === 'function');
    assert(typeof governance.isEnabled === 'function');
    assert(getPolicyCount() >= 10);
  });

  await test('T2 — normalizeSeverity mapeia variantes PT/EN', () => {
    assert.strictEqual(normalizeSeverity('alta'), 'high');
    assert.strictEqual(normalizeSeverity('critica'), 'critical');
    assert.strictEqual(normalizeSeverity('media'), 'medium');
    assert.strictEqual(normalizeSeverity('baixa'), 'low');
    assert.strictEqual(normalizeSeverity('warning'), 'medium');
    assert.strictEqual(normalizeSeverity('urgent'), 'high');
    assert.strictEqual(normalizeSeverity('info'), 'info');
  });

  await test('T3 — matchPolicy OPERATIONAL_CRITICAL', () => {
    const policy = governance.matchPolicy(
      {
        category: 'operational',
        eventType: 'operational_alert',
        sourceModule: 'operationalAlertsService',
        severity: 'alta'
      },
      'high'
    );
    assert.strictEqual(policy.id, 'OPERATIONAL_CRITICAL');
    assert(policy.channels.includes('notification_center'));
  });

  await test('T4 — matchPolicy BILLING_NC_DAY7', () => {
    const policy = governance.matchPolicy(
      {
        category: 'billing',
        eventType: 'subscription_notification_day7',
        sourceModule: 'subscriptionBillingNotificationService',
        severity: 'high'
      },
      'high'
    );
    assert.strictEqual(policy.id, 'BILLING_NC_DAY7');
    assert(policy.channels.includes('notification_center'));
  });

  await test('T5 — evaluateEvent produz decisão DTO canónico', () => {
    const r = governance.evaluateEvent({
      companyId: '00000000-0000-0000-0000-000000000001',
      eventType: 'subscription_notification_day3',
      category: 'billing',
      severity: 'medium',
      sourceModule: 'subscriptionBillingNotificationService',
      payload: { userId: '00000000-0000-0000-0000-000000000002' }
    });
    assert.strictEqual(r.approved, true);
    assert.strictEqual(r.policyId, 'BILLING_EMAIL_DAY3');
    assert(r.channels.includes('email'));
    assert(r.decision);
    assert.strictEqual(r.decision.policyId, 'BILLING_EMAIL_DAY3');
    assert.strictEqual(r.decision.severity, 'medium');
    assert(r.decision.eventId);
    assert(r.decision.generatedAt);
  });

  await test('T6 — evaluateEvent unmatched incrementa unmatched', () => {
    governance.resetStatsForTests();
    const r = governance.evaluateEvent({
      companyId: '00000000-0000-0000-0000-000000000099',
      eventType: 'totally_unknown_xyz',
      category: 'unknown_category_xyz',
      severity: 'info',
      sourceModule: 'unknownModule'
    });
    assert.strictEqual(r.approved, false);
    assert.strictEqual(r.policyId, null);
    const st = governance.getAuditStatus();
    assert(st.unmatched >= 1);
  });

  await test('T7 — shadow mode default (flag off)', () => {
    const prev = process.env.EVENT_GOVERNANCE_ENABLED;
    delete process.env.EVENT_GOVERNANCE_ENABLED;
    delete require.cache[require.resolve(govPath)];
    const mod = require(govPath);
    assert.strictEqual(mod.isEnabled(), false);
    const r = mod.evaluateEvent({
      companyId: '00000000-0000-0000-0000-000000000001',
      category: 'operational',
      severity: 'high',
      sourceModule: 'operationalAlertsService'
    });
    assert.strictEqual(r.shadowMode, true);
    if (prev !== undefined) process.env.EVENT_GOVERNANCE_ENABLED = prev;
    delete require.cache[require.resolve(govPath)];
  });

  await test('T8 — evaluateEvent NÃO persiste nem envia', () => {
    const src = readSrc('services/eventGovernanceService.js');
    assert(!src.includes('sendToUser'));
    assert(!src.includes('sendMessage'));
    assert(!src.includes('INSERT INTO'));
    assert(!src.includes('UPDATE '));
  });

  await test('T9 — buildGovernanceDecisionDto contrato', () => {
    const dto = buildGovernanceDecisionDto({
      eventType: 'test',
      category: 'operational',
      severity: 'high',
      policyId: 'OPERATIONAL_CRITICAL',
      channels: ['notification_center'],
      escalationLevel: 2,
      recipients: [{ strategy: 'hierarchy_lte_2' }]
    });
    assert.strictEqual(dto.eventType, 'test');
    assert.strictEqual(dto.policyId, 'OPERATIONAL_CRITICAL');
    assert.deepStrictEqual(dto.channels, ['notification_center']);
    assert.strictEqual(dto.escalationLevel, 2);
  });

  await test('T10 — observability métricas governance', () => {
    assert(observabilitySrc.includes('event_governance_evaluations'));
    assert(observabilitySrc.includes('event_governance_policy_matches'));
    assert(observabilitySrc.includes('event_governance_unmatched'));
    assert(observabilitySrc.includes('event_governance_shadow_decisions'));
  });

  await test('T11 — GET /api/audit/event-governance/status', () => {
    assert(auditSrc.includes('/event-governance/status'));
    assert(auditSrc.includes('getAuditStatus'));
    assert(auditSrc.includes('requireTenantAdminRole'));
  });

  await test('T12 — getAuditStatus shape', () => {
    const st = governance.getAuditStatus();
    assert.strictEqual(typeof st.enabled, 'boolean');
    assert.strictEqual(typeof st.policies_loaded, 'number');
    assert.strictEqual(typeof st.evaluations, 'number');
    assert.strictEqual(typeof st.matches, 'number');
    assert.strictEqual(typeof st.unmatched, 'number');
    assert(st.policies_loaded >= 10);
  });

  await test('T13 — catálogo declarativo sem hardcode no service', () => {
    const catalogSrc = readSrc('governance/eventPolicyCatalog.js');
    const govSrc = readSrc('services/eventGovernanceService.js');
    assert(catalogSrc.includes('OPERATIONAL_CRITICAL'));
    assert(catalogSrc.includes('BILLING_NC_DAY7'));
    assert(govSrc.includes('eventPolicyCatalog'));
    assert(!govSrc.includes("id: 'OPERATIONAL_CRITICAL'"));
  });

  await test('T14 — evaluateEvent rejeita sem companyId', () => {
    const r = governance.evaluateEvent({ category: 'operational' });
    assert.strictEqual(r.approved, false);
    assert(r.error);
  });

  await test('T15 — tenant-safe: decisão inclui apenas payload explícito', () => {
    const r = governance.evaluateEvent({
      companyId: '00000000-0000-0000-0000-000000000001',
      category: 'manuia',
      severity: 'high',
      sourceModule: 'manuiaInboxIngestService',
      payload: { userId: '00000000-0000-0000-0000-000000000010' }
    });
    assert.strictEqual(r.approved, true);
    assert.strictEqual(r.policyId, 'MANUIA_INBOX');
    const userRecipient = r.recipients.find((x) => x.userId);
    assert(userRecipient);
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
