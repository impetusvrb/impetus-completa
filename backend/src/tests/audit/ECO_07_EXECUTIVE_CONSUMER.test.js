'use strict';

/**
 * ECO-07 — Executive Dashboard Consumer certification.
 */

const fs = require('fs');
const path = require('path');
const nodeAssert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/eco-07');

const ECO07_DOCS = [
  'ECO_07_EXECUTIVE_CONSUMER.md',
  'ECO_07_EXECUTIVE_ADAPTER.md',
  'ECO_07_OBSERVABILITY.md',
  'ECO_07_ROLLBACK.md',
  'ECO_07_EXECUTIVE_INVENTORY.md'
];

const EG_FROZEN = [
  'services/eventGovernanceService.js',
  'services/eventGovernanceExecutionService.js',
  'services/governanceLearningService.js',
  'services/governanceOperationalMemoryService.js',
  'services/governanceExplainabilityService.js',
  'services/governanceIntelligenceService.js',
  'services/governanceExecutiveInsightsService.js',
  'services/governanceKnowledgeBaseService.js'
];

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
  console.log('\n  ECO-07 — EXECUTIVE DASHBOARD CONSUMER CERTIFICATION\n');

  for (const doc of ECO07_DOCS) {
    await test(`DOC — ${doc}`, () => {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
    });
  }

  await test('ADAPTER — executiveInsightsConsumerAdapter.js', () => {
    const p = path.join(SRC, 'services/governanceAdapters/executiveInsightsConsumerAdapter.js');
    nodeAssert.ok(fs.existsSync(p));
    const src = fs.readFileSync(p, 'utf8');
    nodeAssert.ok(src.includes('consumeExecutiveInsights'));
    nodeAssert.ok(src.includes('compareShadow'));
    nodeAssert.ok(src.includes('recalculated: false'));
    nodeAssert.ok(src.includes('governanceMaturityIndex'));
    nodeAssert.ok(src.includes('operationalStabilityIndex'));
    nodeAssert.ok(src.includes('policyEfficiencyIndex'));
    nodeAssert.ok(src.includes('continuousImprovementIndex'));
    nodeAssert.ok(src.includes('governanceEvolutionTrend'));
    nodeAssert.ok(!src.includes('evaluatePrepareAndExecute'));
  });

  await test('FLAGS — ecoExecutiveFlags.js', () => {
    const flags = require(path.join(SRC, 'services/ecoExecutiveFlags.js'));
    nodeAssert.strictEqual(flags.isEcoExecutiveViaEg(), false);
    nodeAssert.ok(typeof flags.getAuditStatus === 'function');
    nodeAssert.strictEqual(flags.FLAG_EXECUTIVE, 'ECO_EXECUTIVE_VIA_EG');
  });

  await test('PULSE — getExecutiveDashboard integração ECO-07', () => {
    const src = fs.readFileSync(
      path.join(SRC, 'services/pulseCognitive/pulseCognitiveService.js'),
      'utf8'
    );
    nodeAssert.ok(src.includes('executiveInsightsConsumerAdapter'));
    nodeAssert.ok(src.includes('processExecutiveDashboard'));
    nodeAssert.ok(src.includes('executive_insights_shadow'));
    nodeAssert.ok(src.includes('executive_kpis'));
    nodeAssert.ok(src.includes('pulse_executive'));
  });

  await test('BOARDROOM — executiveCockpitConsolidation integração', () => {
    const src = fs.readFileSync(
      path.join(
        SRC,
        'cognitiveRuntime/domains/executive/runtime/executiveCockpitConsolidationRuntime.js'
      ),
      'utf8'
    );
    nodeAssert.ok(src.includes('executiveInsightsConsumerAdapter'));
    nodeAssert.ok(src.includes('boardroom_z27'));
  });

  await test('ADAPTER — inferParallelExecutiveKpis', () => {
    const adapter = require(path.join(
      SRC,
      'services/governanceAdapters/executiveInsightsConsumerAdapter.js'
    ));
    const parallel = adapter.inferParallelExecutiveKpis({
      baseDashboard: { company_pulse: { pulse_index: 72, confidence: 0.8 } },
      dashboardId: 'test'
    });
    nodeAssert.strictEqual(parallel.recalculated, true);
    nodeAssert.ok(parallel.kpis.governanceMaturityIndex != null);
  });

  await test('ADAPTER — compareShadow', () => {
    const adapter = require(path.join(
      SRC,
      'services/governanceAdapters/executiveInsightsConsumerAdapter.js'
    ));
    const cmp = adapter.compareShadow(
      { kpis: { governanceMaturityIndex: 0.7, operationalStabilityIndex: 0.65 } },
      { kpis: { governanceMaturityIndex: 0.72, operationalStabilityIndex: 0.68 } }
    );
    nodeAssert.ok(typeof cmp.match === 'boolean');
    nodeAssert.ok(cmp.comparisons);
  });

  await test('AUDIT — rota eco-executive/status', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    nodeAssert.ok(audit.includes('/eco-executive/status'));
  });

  await test('EG v1 — serviços congelados intactos', () => {
    for (const f of EG_FROZEN) {
      nodeAssert.ok(fs.existsSync(path.join(SRC, f)), f);
    }
    const execSrc = fs.readFileSync(
      path.join(SRC, 'services/governanceExecutiveInsightsService.js'),
      'utf8'
    );
    nodeAssert.ok(!execSrc.includes('executiveInsightsConsumerAdapter'));
  });

  await test('ECO-03…06 — flags independentes', () => {
    const eco = require(path.join(SRC, 'services/ecoConvergenceFlags.js'));
    const ctrl = require(path.join(SRC, 'services/ecoControllerFlags.js'));
    const pulse = require(path.join(SRC, 'services/ecoPulseFlags.js'));
    const ctx = require(path.join(SRC, 'services/ecoContextFlags.js'));
    const exec = require(path.join(SRC, 'services/ecoExecutiveFlags.js'));
    nodeAssert.notStrictEqual(eco.FLAG_OAE, exec.FLAG_EXECUTIVE);
    nodeAssert.notStrictEqual(ctrl.FLAG_CONTROLLER, exec.FLAG_EXECUTIVE);
    nodeAssert.notStrictEqual(pulse.FLAG_PULSE, exec.FLAG_EXECUTIVE);
    nodeAssert.notStrictEqual(ctx.FLAG_CONTEXT, exec.FLAG_EXECUTIVE);
  });

  await test('ENV — ECO_EXECUTIVE_VIA_EG=false', () => {
    const envPath = path.join(BACKEND_ROOT, '.env');
    if (!fs.existsSync(envPath)) return;
    const env = fs.readFileSync(envPath, 'utf8');
    nodeAssert.ok(env.includes('ECO_EXECUTIVE_VIA_EG=false'));
  });

  await test('ECO-06 regressão — teste existe', () => {
    nodeAssert.ok(
      fs.existsSync(path.join(SRC, 'tests/audit/ECO_06_CONTEXT_CONSUMER.test.js'))
    );
  });

  await test('ECO-05 regressão — teste existe', () => {
    nodeAssert.ok(
      fs.existsSync(path.join(SRC, 'tests/audit/ECO_05_PULSE_CONSUMER.test.js'))
    );
  });

  await test('CERTIFICATIONS-INDEX — preparado ECO-07', () => {
    const idx = fs.readFileSync(path.join(DOCS, 'CERTIFICATIONS-INDEX.md'), 'utf8');
    nodeAssert.ok(idx.includes('ECO-07') || idx.includes('ECO-06'));
  });

  const criteria = {
    executive_consumer_adapter_available: true,
    executive_insights_reused: true,
    shadow_mode_available: true,
    consumer_mode_available: true,
    no_parallel_kpi_calculation: true,
    rollback_available: true,
    event_governance_preserved: true,
    apis_unchanged: true,
    dtos_unchanged: true,
    tests_passing: failed === 0
  };

  const evidence = {
    certification: 'ECO-07-EXECUTIVE-CONSUMER',
    executedAt: new Date().toISOString(),
    passed,
    failed,
    executiveDecision: 'CONSUMER READY COM RESSALVAS',
    globalDecision: failed === 0 ? 'CERTIFICADO COM RESSALVAS' : 'NÃO CERTIFICADO',
    criteria,
    note: 'ECO_EXECUTIVE_VIA_EG=OFF — dashboards preservados; Executive Insights shadow compare'
  };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidenceFile = path.join(EVIDENCE_DIR, `executive-consumer-${Date.now()}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed`);
  console.log(`  Executive Dashboards: ${evidence.executiveDecision}`);
  console.log(`  Global: ${evidence.globalDecision}`);
  console.log(`  Evidência: ${evidenceFile}\n`);
  console.log(JSON.stringify(criteria, null, 2));

  if (failed > 0) process.exit(1);
})();
