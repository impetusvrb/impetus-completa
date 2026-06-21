'use strict';

/**
 * EVENT-GOVERNANCE-12 — testes integração AIOI → Event Governance.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const COMPANY = '00000000-0000-0000-0000-000000000001';

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

function _sampleEvent(overrides = {}) {
  return {
    companyId: COMPANY,
    eventType: overrides.eventType || 'quality_defect_increase',
    category: overrides.category || 'quality',
    severity: overrides.severity || 'high',
    sourceModule: overrides.sourceModule || 'qualityIntelligenceService',
    payload: overrides.payload || { title: 'Test' }
  };
}

(async () => {
  console.log('\n  EVENT-GOVERNANCE-12-AIOI\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/aioiGovernanceAdapter.js');
  const feedPath = path.join(SRC, 'services/aioiGovernanceFeedService.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_12_AIOI_AUDIT.md');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');
  const policySrc = readSrc('governance/eventPolicyCatalog.js');
  const execSrc = readSrc('services/eventGovernanceExecutionService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_AIOI;
  delete process.env.EVENT_GOVERNANCE_AIOI;

  delete require.cache[require.resolve(feedPath)];
  delete require.cache[require.resolve(adapterPath)];

  const feed = require(feedPath);
  const adapter = require(adapterPath);
  feed.resetFeedForTests();
  adapter.resetStatsForTests();

  const dto = require(path.join(SRC, 'aioi/governedEventInsightDto.js'));
  const correlation = require(path.join(SRC, 'services/aioiCorrelationService.js'));
  const insightSvc = require(path.join(SRC, 'services/aioiInsightService.js'));

  await test('T1 — auditoria AIOI documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('"governed_events_available": true'));
    assert(content.includes('"aioi_integration_safe": true'));
    assert(content.includes('aioiGovernanceFeedService'));
    assert(content.includes('AIOI_INSIGHT'));
  });

  await test('T2 — adapter exporta funções principais', () => {
    assert(typeof adapter.dispatchAioiInsight === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert.strictEqual(adapter.POLICY_ID, 'AIOI_INSIGHT');
  });

  await test('T3 — política AIOI_INSIGHT no catálogo', () => {
    assert(policySrc.includes('AIOI_INSIGHT'));
    assert(policySrc.includes('aioiInsightService'));
    assert(policySrc.includes('aioi_insight_*'));
  });

  await test('T4 — governedEventInsightDto contrato', () => {
    const d = dto.buildGovernedEventInsightDto({
      eventType: 'aioi_insight_repetition',
      policyId: 'AIOI_INSIGHT',
      severity: 'high',
      escalationLevel: 2,
      sourceModule: 'aioiInsightService',
      correlationGroup: 'rep:quality_defect',
      insightType: 'INSIGHT_QUALITY',
      confidence: 0.8
    });
    assert.strictEqual(d.policyId, 'AIOI_INSIGHT');
    assert.strictEqual(d.insightType, 'INSIGHT_QUALITY');
    assert.strictEqual(d.confidence, 0.8);
    assert(d.eventId);
    assert(d.timestamp);
  });

  await test('T5 — getGovernedEvents alimentado pelo feed', () => {
    feed.resetFeedForTests();
    const ev = _sampleEvent();
    feed.recordGovernedEvent(ev, {
      evaluation: {
        approved: true,
        policyId: 'QUALITY_LIFECYCLE',
        decision: {
          eventId: 'ev-1',
          policyId: 'QUALITY_LIFECYCLE',
          severity: 'high',
          channels: ['notification_center'],
          escalationLevel: 2,
          generatedAt: new Date().toISOString()
        }
      }
    });
    const list = feed.getGovernedEvents(COMPANY);
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].policyId, 'QUALITY_LIFECYCLE');
    assert.strictEqual(list[0].sourceModule, 'qualityIntelligenceService');
  });

  await test('T6 — feed não consulta produtores', () => {
    const src = readSrc('services/aioiGovernanceFeedService.js');
    assert(!src.includes('qualityIntelligenceService'));
    assert(!src.includes('sstNotificationService'));
    assert(!src.includes('esgNotificationService'));
    assert(src.includes('recordGovernedEvent'));
    assert(src.includes('getPolicies'));
  });

  await test('T7 — correlação repetição e cross-domain', () => {
    const events = [
      { eventId: '1', eventType: 'tpm_incident', category: 'tpm', severity: 'medium', policyId: 'TPM_CRITICAL', escalationLevel: 2, approved: true, timestamp: new Date().toISOString() },
      { eventId: '2', eventType: 'quality_defect', category: 'quality', severity: 'high', policyId: 'QUALITY_LIFECYCLE', escalationLevel: 2, approved: true, timestamp: new Date().toISOString() },
      { eventId: '3', eventType: 'quality_defect', category: 'quality', severity: 'high', policyId: 'QUALITY_LIFECYCLE', escalationLevel: 3, approved: true, timestamp: new Date().toISOString() },
      { eventId: '4', eventType: 'quality_defect', category: 'quality', severity: 'critical', policyId: 'QUALITY_LIFECYCLE', escalationLevel: 3, approved: true, timestamp: new Date().toISOString() }
    ];
    const cor = correlation.detectCorrelations(events);
    assert(cor.some((c) => c.kind === 'repetition'));
    assert(cor.some((c) => c.kind === 'cross_domain' && c.domains?.includes('tpm')));
  });

  await test('T8 — insight service gera tipos', () => {
    const events = [
      { eventId: 'e1', eventType: 'sst_near_miss', category: 'sst', severity: 'high', policyId: 'SST_LIFECYCLE', escalationLevel: 2, approved: true },
      { eventId: 'e2', eventType: 'esg_emission', category: 'esg', severity: 'high', policyId: 'ESG_LIFECYCLE', escalationLevel: 3, approved: true }
    ];
    const cor = correlation.detectCorrelations(events);
    const insights = insightSvc.generateInsights(events, cor);
    assert(insights.length >= 1);
    assert(insights.some((i) => i.insightType === 'INSIGHT_ESG' || i.insightType === 'INSIGHT_SAFETY'));
  });

  await test('T9 — flag OFF observação shadow', async () => {
    delete process.env.EVENT_GOVERNANCE_AIOI;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const insight = dto.buildGovernedEventInsightDto({
      insightType: 'INSIGHT_OPERATIONAL',
      severity: 'medium',
      title: 'Shadow insight'
    });

    const result = await mod.dispatchAioiInsight({ companyId: COMPANY, insight });
    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(result.observeOnly, true);
    assert(result.comparison);
  });

  await test('T10 — flag ON governance mode', async () => {
    process.env.EVENT_GOVERNANCE_AIOI = 'true';
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);

    const execPath = path.join(SRC, 'services/eventGovernanceExecutionService.js');
    delete require.cache[require.resolve(execPath)];
    const execSvc = require(execPath);
    const orig = execSvc.evaluatePrepareAndExecute;
    execSvc.evaluatePrepareAndExecute = async (event) => ({
      evaluation: { approved: true, policyId: 'AIOI_INSIGHT', decision: { policyId: 'AIOI_INSIGHT', severity: 'medium', channels: mod.LEGACY_CHANNELS, escalationLevel: 0 } },
      execution: { channelsReady: mod.LEGACY_CHANNELS },
      execResult: { success: true }
    });

    const insight = dto.buildGovernedEventInsightDto({ insightType: 'INSIGHT_EXECUTIVE', severity: 'high' });
    const result = await mod.dispatchAioiInsight({ companyId: COMPANY, insight });
    assert.strictEqual(result.mode, 'governance');

    execSvc.evaluatePrepareAndExecute = orig;
    delete process.env.EVENT_GOVERNANCE_AIOI;
    delete require.cache[require.resolve(execPath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T11 — hook integração no execution service', () => {
    assert(execSrc.includes('aioiGovernanceIntegrationService'));
    assert(execSrc.includes('onGovernedEvent'));
  });

  await test('T12 — observability métricas aioi', () => {
    assert(observabilitySrc.includes('event_governance_aioi_events'));
    assert(observabilitySrc.includes('event_governance_aioi_correlations'));
    assert(observabilitySrc.includes('event_governance_aioi_insights'));
    assert(observabilitySrc.includes('event_governance_aioi_shadow_total'));
    assert(observabilitySrc.includes('event_governance_aioi_shadow_match'));
  });

  await test('T13 — GET /api/audit/event-governance/aioi', () => {
    assert(auditSrc.includes('/event-governance/aioi'));
    assert(auditSrc.includes('aioiGovernance'));
  });

  await test('T14 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_AIOI'));
  });

  await test('T15 — isAioiGovernanceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_AIOI;
    delete require.cache[require.resolve(adapterPath)];
    assert.strictEqual(require(adapterPath).isAioiGovernanceEnabled(), false);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_AIOI = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_AIOI;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      passed,
      failed,
      aioi_integrated: true,
      governance_preserved: true,
      producers_unchanged: true,
      correlation_available: true,
      insights_available: true,
      tests_passing: true
    })
  );
})();
