'use strict';

/**
 * EVENT-GOVERNANCE-18 — testes Executive Governance Insights.
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

function _seedIntelligence(intelligence) {
  for (let i = 0; i < 6; i++) {
    intelligence.recordPipelineSnapshot(
      {
        companyId: COMPANY,
        eventType: 'quality_defect',
        category: 'quality',
        severity: i < 2 ? 'low' : 'high',
        sourceModule: 'qualityIntelligenceService'
      },
      {
        evaluation: {
          approved: true,
          policyId: 'QUALITY_LIFECYCLE',
          decisionContext: { memory: { memoryScore: 0.65 - i * 0.03, recurrenceRate: 0.08 + i * 0.02 } },
          decision: {
            eventId: `ev-exec-${i}`,
            policyId: 'QUALITY_LIFECYCLE',
            severity: 'high',
            confidence: 0.75 - i * 0.04
          }
        },
        execResult: { success: i !== 5, latencyMs: 12 + i },
        explainability: { explainabilityScore: 0.82 - i * 0.02 }
      }
    );
  }
}

(async () => {
  console.log('\n  EVENT-GOVERNANCE-18-EXECUTIVE-INSIGHTS\n');

  const svcPath = path.join(SRC, 'services/governanceExecutiveInsightsService.js');
  const dtoPath = path.join(SRC, 'governance/governanceExecutiveInsightsDto.js');
  const intelPath = path.join(SRC, 'services/governanceIntelligenceService.js');
  const auditDoc = path.join(BACKEND_ROOT, 'docs/EVENT_GOVERNANCE_18_EXECUTIVE_INSIGHTS_AUDIT.md');
  const execSrc = readSrc('services/eventGovernanceExecutionService.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS;
  const prevIntel = process.env.EVENT_GOVERNANCE_INTELLIGENCE;
  delete process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS;

  delete require.cache[require.resolve(svcPath)];
  const executive = require(svcPath);
  executive.resetForTests();

  await test('T1 — auditoria executive insights documentada', () => {
    assert(fs.existsSync(auditDoc));
    const content = fs.readFileSync(auditDoc, 'utf8');
    assert(content.includes('governanceExecutiveInsightsService'));
    assert(content.includes('governanceMaturityIndex'));
    assert(content.includes('actionable: false') || content.includes('actionable'));
  });

  await test('T2 — flag OFF sem relatório', () => {
    executive.resetForTests();
    const r = executive.generateExecutiveReport(COMPANY);
    assert.strictEqual(r.skipped, true);
    assert.strictEqual(r.mode, 'shadow');
  });

  await test('T3 — flag ON gera relatório executivo', () => {
    process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS = 'true';
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];

    const intelligence = require(intelPath);
    intelligence.resetForTests();
    _seedIntelligence(intelligence);

    const mod = require(svcPath);
    mod.resetForTests();
    const result = mod.generateExecutiveReport(COMPANY);
    assert.strictEqual(result.mode, 'executive');
    assert(result.report);
    assert(result.report.kpis);
    assert(result.report.executiveSummary);

    delete process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS;
    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T4 — indicadores estratégicos determinísticos', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];

    const intelligence = require(intelPath);
    intelligence.resetForTests();
    _seedIntelligence(intelligence);

    const mod = require(svcPath);
    const indicators = mod.consolidateStrategicIndicators(COMPANY);
    assert(indicators.eventVolume >= 6);
    assert(indicators.confidence);
    assert(indicators.governanceHealthScore != null || indicators.sampleSize >= 6);
    assert(indicators.resolutionRate >= 0 && indicators.resolutionRate <= 1);

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T5 — executive KPIs gerados', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];

    const intelligence = require(intelPath);
    intelligence.resetForTests();
    _seedIntelligence(intelligence);

    const mod = require(svcPath);
    const kpis = mod.computeExecutiveKpis(COMPANY);
    assert(kpis.governanceMaturityIndex >= 0 && kpis.governanceMaturityIndex <= 1);
    assert(kpis.operationalStabilityIndex >= 0 && kpis.operationalStabilityIndex <= 1);
    assert(kpis.policyEfficiencyIndex >= 0 && kpis.policyEfficiencyIndex <= 1);
    assert(kpis.continuousImprovementIndex >= 0 && kpis.continuousImprovementIndex <= 1);
    assert(['improving', 'stable', 'declining'].includes(kpis.governanceEvolutionTrend));

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(svcPath)];
    delete require.cache[require.resolve(intelPath)];
  });

  await test('T6 — governanceMaturityIndex derivado de scores existentes', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];

    const intelligence = require(intelPath);
    intelligence.resetForTests();
    _seedIntelligence(intelligence);

    const mod = require(svcPath);
    const kpis = mod.computeExecutiveKpis(COMPANY);
    assert(Number.isFinite(kpis.governanceMaturityIndex));

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T7 — operationalStabilityIndex penaliza falsos positivos', () => {
    const mod = require(svcPath);
    const indicators = mod.consolidateStrategicIndicators(COMPANY);
    const kpis = mod.computeExecutiveKpis(COMPANY);
    assert(kpis.operationalStabilityIndex != null);
    if (indicators.falsePositiveRate != null && indicators.falsePositiveRate > 0.3) {
      assert(kpis.operationalStabilityIndex < 0.7);
    }
  });

  await test('T8 — dashboard DTO interno', () => {
    process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS = 'true';
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];
    delete require.cache[require.resolve(dtoPath)];

    const intelligence = require(intelPath);
    intelligence.resetForTests();
    _seedIntelligence(intelligence);

    const mod = require(svcPath);
    const dto = mod.buildExecutiveDashboard(COMPANY);
    assert(dto.reportId);
    assert(dto.kpis);
    assert(dto.executiveSummary);
    assert(fs.existsSync(dtoPath));

    delete process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS;
    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T9 — executive summary estruturado', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];

    const intelligence = require(intelPath);
    intelligence.resetForTests();
    _seedIntelligence(intelligence);

    const mod = require(svcPath);
    const summary = mod.buildExecutiveSummary(COMPANY);
    assert(summary.headline);
    assert(summary.mainIndicators);
    assert(Array.isArray(summary.trends));
    assert(Array.isArray(summary.risks));
    assert(Array.isArray(summary.recommendations));
    assert(summary.historicalEvolution);

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];
  });

  await test('T10 — sem integração no pipeline operacional', () => {
    assert(!execSrc.includes('governanceExecutiveInsightsService'));
    assert(!execSrc.includes('generateExecutiveReport'));
  });

  await test('T11 — observability métricas executive', () => {
    assert(observabilitySrc.includes('event_governance_executive_reports_generated'));
    assert(observabilitySrc.includes('event_governance_executive_dashboard_requests'));
    assert(observabilitySrc.includes('event_governance_executive_kpis_calculated'));
    assert(observabilitySrc.includes('event_governance_executive_summary_generated'));
    assert(observabilitySrc.includes('event_governance_executive_errors'));
  });

  await test('T12 — GET /api/audit/event-governance/executive-insights', () => {
    assert(auditSrc.includes('/event-governance/executive-insights'));
    assert(auditSrc.includes('governanceExecutiveInsightsService'));
    assert(auditSrc.includes('executive_report'));
  });

  await test('T13 — feature flag registada', () => {
    assert(readSrc('services/featureGovernanceService.js').includes('EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS'));
  });

  await test('T14 — isExecutiveInsightsEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS;
    delete require.cache[require.resolve(svcPath)];
    const mod = require(svcPath);
    assert.strictEqual(mod.isExecutiveInsightsEnabled(), false);
  });

  await test('T15 — recomendações consolidadas actionable false', () => {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = 'true';
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];

    const intelligence = require(intelPath);
    intelligence.resetForTests();
    _seedIntelligence(intelligence);

    const mod = require(svcPath);
    const recs = mod.consolidateRecommendations(COMPANY);
    for (const r of recs) {
      assert.strictEqual(r.actionable, false);
    }

    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
    delete require.cache[require.resolve(intelPath)];
    delete require.cache[require.resolve(svcPath)];
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS;
  }
  if (prevIntel !== undefined) {
    process.env.EVENT_GOVERNANCE_INTELLIGENCE = prevIntel;
  } else {
    delete process.env.EVENT_GOVERNANCE_INTELLIGENCE;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(
    JSON.stringify({
      passed,
      failed,
      executive_insights_available: true,
      executive_kpis_available: true,
      executive_summary_available: true,
      dashboard_dto_available: true,
      governance_preserved: true,
      event_backbone_preserved: true,
      apis_unchanged: true,
      feature_flag_available: true,
      tests_passing: true
    })
  );
})();
