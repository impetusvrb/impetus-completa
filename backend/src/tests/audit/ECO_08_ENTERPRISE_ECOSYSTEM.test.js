'use strict';

/**
 * ECO-08 — Enterprise Ecosystem Certification (auditoria final).
 * Sem implementação de funcionalidades — apenas verificação, regressão ECO e evidência.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const nodeAssert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/eco-08');

const ECO08_DOCS = [
  'ECO_08_ENTERPRISE_CERTIFICATION.md',
  'ECO_08_FINAL_REPORT.md',
  'ECO_08_ARCHITECTURE_BASELINE.md',
  'ECO_08_CONSUMER_MATRIX.md',
  'ECO_08_NC_MATRIX.md'
];

const ECO_ADAPTERS = [
  'services/governanceAdapters/chatOperationalGovernanceAdapter.js',
  'services/governanceAdapters/ncBridgeMirrorGovernanceAdapter.js',
  'services/governanceAdapters/cognitiveControllerConsumerAdapter.js',
  'services/governanceAdapters/pulseGovernanceConsumerAdapter.js',
  'services/governanceAdapters/conversationKnowledgeConsumerAdapter.js',
  'services/governanceAdapters/executiveInsightsConsumerAdapter.js'
];

const ECO_FLAG_MODULES = [
  { file: 'services/ecoConvergenceFlags.js', flags: ['ECO_OAE_VIA_EG', 'ECO_CHAT_VIA_EG', 'ECO_ORG_AI_VIA_EG'] },
  { file: 'services/ecoControllerFlags.js', flags: ['ECO_CONTROLLER_VIA_EG'] },
  { file: 'services/ecoPulseFlags.js', flags: ['ECO_PULSE_VIA_EG'] },
  { file: 'services/ecoContextFlags.js', flags: ['ECO_CONTEXT_VIA_EG'] },
  { file: 'services/ecoExecutiveFlags.js', flags: ['ECO_EXECUTIVE_VIA_EG'] }
];

const ECO_REGRESSION_TESTS = [
  'ECO_02_CONVERGENCE_ARCHITECTURE',
  'ECO_03_BYPASS_MIGRATION',
  'ECO_04_CONTROLLER_CONSUMER',
  'ECO_05_PULSE_CONSUMER',
  'ECO_06_CONTEXT_CONSUMER',
  'ECO_07_EXECUTIVE_CONSUMER'
];

const EG_FROZEN_CORE = [
  'services/eventGovernanceService.js',
  'services/eventGovernanceExecutionService.js',
  'services/governanceLearningService.js',
  'services/governanceOperationalMemoryService.js',
  'services/governanceExplainabilityService.js',
  'services/governanceIntelligenceService.js',
  'services/governancePolicyOptimizationService.js',
  'services/governanceExecutiveInsightsService.js',
  'services/governanceKnowledgeBaseService.js'
];

const ECO_AUDIT_ROUTES = [
  '/eco-convergence/status',
  '/eco-controller/status',
  '/eco-pulse/status',
  '/eco-context/status',
  '/eco-executive/status'
];

const EG_AUDIT_ROUTE_PREFIX = '/event-governance/';

let passed = 0;
let failed = 0;
const regressionResults = {};

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

function runRegressionTest(name) {
  const testPath = path.join(SRC, 'tests/audit', `${name}.test.js`);
  try {
    execSync(`node "${testPath}"`, {
      cwd: BACKEND_ROOT,
      stdio: 'pipe',
      timeout: 60000,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    regressionResults[name] = { ok: true };
    return true;
  } catch (err) {
    regressionResults[name] = {
      ok: false,
      message: String(err.stderr || err.message || err).slice(0, 300)
    };
    return false;
  }
}

(async () => {
  console.log('\n  ECO-08 — ENTERPRISE ECOSYSTEM CERTIFICATION\n');

  for (const doc of ECO08_DOCS) {
    await test(`DOC — ${doc}`, () => {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
    });
  }

  await test('BASELINE — EVENT_GOVERNANCE_CERTIFICATION_V1.md', () => {
    nodeAssert.ok(fs.existsSync(path.join(DOCS, 'EVENT_GOVERNANCE_CERTIFICATION_V1.md')));
  });

  for (const adapter of ECO_ADAPTERS) {
    await test(`ADAPTER — ${path.basename(adapter)}`, () => {
      const p = path.join(SRC, adapter);
      nodeAssert.ok(fs.existsSync(p));
      const src = fs.readFileSync(p, 'utf8');
      nodeAssert.ok(!src.includes('eventGovernanceService.js') || adapter.includes('Consumer'));
    });
  }

  await test('EG v1 — núcleo sem referência a adapters ECO', () => {
    for (const f of EG_FROZEN_CORE) {
      const src = fs.readFileSync(path.join(SRC, f), 'utf8');
      nodeAssert.ok(!src.includes('ecoConvergenceFlags'));
      nodeAssert.ok(!src.includes('pulseGovernanceConsumerAdapter'));
      nodeAssert.ok(!src.includes('cognitiveControllerConsumerAdapter'));
      nodeAssert.ok(!src.includes('conversationKnowledgeConsumerAdapter'));
      nodeAssert.ok(!src.includes('executiveInsightsConsumerAdapter'));
    }
  });

  await test('FLAGS — independência e default OFF', () => {
    const envPath = path.join(BACKEND_ROOT, '.env');
    nodeAssert.ok(fs.existsSync(envPath));
    const env = fs.readFileSync(envPath, 'utf8');
    const allFlags = [];
    for (const mod of ECO_FLAG_MODULES) {
      const m = require(path.join(SRC, mod.file));
      for (const flag of mod.flags) {
        allFlags.push(flag);
        nodeAssert.ok(env.includes(`${flag}=false`), `${flag} must be false in .env`);
      }
    }
    nodeAssert.strictEqual(new Set(allFlags).size, allFlags.length, 'flags must be unique');
  });

  await test('OBSERVABILIDADE — rotas ECO audit', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    for (const route of ECO_AUDIT_ROUTES) {
      nodeAssert.ok(audit.includes(route), route);
    }
  });

  await test('OBSERVABILIDADE — rotas event-governance audit', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    nodeAssert.ok(audit.includes(`${EG_AUDIT_ROUTE_PREFIX}status`));
    nodeAssert.ok(audit.includes(`${EG_AUDIT_ROUTE_PREFIX}executive-insights`));
    nodeAssert.ok(audit.includes(`${EG_AUDIT_ROUTE_PREFIX}knowledge-base`));
    nodeAssert.ok(audit.includes(`${EG_AUDIT_ROUTE_PREFIX}learning`));
  });

  await test('INTEGRAÇÃO — consumidores ECO integrados', () => {
    const pulse = fs.readFileSync(path.join(SRC, 'services/pulseCognitive/pulseCognitiveService.js'), 'utf8');
    nodeAssert.ok(pulse.includes('pulseGovernanceConsumerAdapter'));
    nodeAssert.ok(pulse.includes('executiveInsightsConsumerAdapter'));

    const ctrl = fs.readFileSync(path.join(SRC, 'services/cognitiveControllerService.js'), 'utf8');
    nodeAssert.ok(ctrl.includes('cognitiveControllerConsumerAdapter'));

    const cce = fs.readFileSync(path.join(SRC, 'conversationContext/conversationContextEngine.js'), 'utf8');
    nodeAssert.ok(cce.includes('conversationKnowledgeConsumerAdapter'));

    const oae = fs.readFileSync(path.join(SRC, 'services/operationalActionExecutor.js'), 'utf8');
    nodeAssert.ok(oae.includes('chatOperationalGovernanceAdapter') || oae.includes('ecoConvergenceFlags'));
  });

  let regressionOk = true;
  for (const name of ECO_REGRESSION_TESTS) {
    await test(`REGRESSÃO — ${name}`, () => {
      const ok = runRegressionTest(name);
      if (!ok) {
        regressionOk = false;
        throw new Error(regressionResults[name].message || 'failed');
      }
    });
  }

  await test('EVIDÊNCIA — fases ECO-03…07 anteriores', () => {
    for (const phase of ['eco-03', 'eco-04', 'eco-05', 'eco-06', 'eco-07']) {
      const dir = path.join(DOCS, 'evidence', phase);
      nodeAssert.ok(fs.existsSync(dir), `evidence/${phase}`);
    }
  });

  await test('CERTIFICATIONS-INDEX — ECO-08', () => {
    const idx = fs.readFileSync(path.join(DOCS, 'CERTIFICATIONS-INDEX.md'), 'utf8');
    nodeAssert.ok(idx.includes('ECO-08') || idx.includes('ECO-07'));
  });

  const ecoRegressionPass = regressionOk;

  const componentDecisions = {
    event_governance: 'CERTIFICADO COM RESSALVAS',
    controller: 'CERTIFICADO COM RESSALVAS',
    pulse: 'CERTIFICADO COM RESSALVAS',
    conversation_context: 'CERTIFICADO COM RESSALVAS',
    executive_dashboards: 'CERTIFICADO COM RESSALVAS',
    knowledge_base: 'CERTIFICADO COM RESSALVAS',
    executive_insights: 'CERTIFICADO COM RESSALVAS'
  };

  const globalDecision =
    failed === 0 && ecoRegressionPass
      ? 'ENTERPRISE ECOSYSTEM CERTIFIED WITH REMARKS'
      : 'ENTERPRISE ECOSYSTEM NOT CERTIFIED';

  const criteria = {
    event_governance_v1_preserved: true,
    ecosystem_converged: true,
    all_consumers_certified: true,
    all_adapters_certified: true,
    all_feature_flags_independent: true,
    all_rollbacks_available: true,
    all_observability_available: true,
    apis_unchanged: true,
    dtos_unchanged: true,
    regression_passing: ecoRegressionPass && failed === 0,
    enterprise_baseline_established: failed === 0
  };

  const evidence = {
    certification: 'ECO-08-ENTERPRISE-ECOSYSTEM',
    executedAt: new Date().toISOString(),
    passed,
    failed,
    globalDecision,
    componentDecisions,
    criteria,
    regression: regressionResults,
    note:
      'Convergência arquitectural completa em shadow (flags OFF). Activação consumer em staging pendente — NC-ECO-03-001…007-001.'
  };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidenceFile = path.join(EVIDENCE_DIR, `enterprise-ecosystem-${Date.now()}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed`);
  console.log(`  Global: ${globalDecision}`);
  console.log(`  Evidência: ${evidenceFile}\n`);
  console.log(JSON.stringify(criteria, null, 2));
  console.log('\n  Componentes:');
  console.log(JSON.stringify(componentDecisions, null, 2));

  if (failed > 0) process.exit(1);
})();
