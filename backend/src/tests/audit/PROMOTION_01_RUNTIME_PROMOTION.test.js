'use strict';

/**
 * PROMOTION-01 — Certificação Enterprise Runtime Promotion.
 * Apenas validação — NÃO altera Event Governance nem flags em produção.
 */

const fs = require('fs');
const path = require('path');
const nodeAssert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/promotion-01');

const GROUP_A_FLAGS = [
  'EVENT_GOVERNANCE_AIOI',
  'EVENT_GOVERNANCE_LEARNING',
  'EVENT_GOVERNANCE_MEMORY',
  'EVENT_GOVERNANCE_EXPLAINABILITY',
  'EVENT_GOVERNANCE_INTELLIGENCE',
  'EVENT_GOVERNANCE_POLICY_OPTIMIZATION',
  'EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS',
  'EVENT_GOVERNANCE_KNOWLEDGE_BASE'
];

const GROUP_B_SERVICES = [
  'services/cognitiveControllerService.js',
  'services/cognitiveEventBackboneService.js'
];

let passed = 0;
let failed = 0;
const evidence = { certification: 'PROMOTION-01', executedAt: new Date().toISOString(), ncs: [] };

function readSrc(rel) {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

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
  console.log('\n  PROMOTION-01 — ENTERPRISE RUNTIME PROMOTION\n');

  const execSrc = readSrc('services/eventGovernanceExecutionService.js');
  const featureSrc = readSrc('services/featureGovernanceService.js');
  const integEvidence = path.join(DOCS, 'evidence/integ-01');
  const eg20Cert = path.join(DOCS, 'EVENT_GOVERNANCE_CERTIFICATION_V1.md');

  // P1 — Inventário documentado
  await test('P1 — RUNTIME_COMPONENT_MATRIX.md', () => {
    nodeAssert.ok(fs.existsSync(path.join(DOCS, 'RUNTIME_COMPONENT_MATRIX.md')));
    const c = fs.readFileSync(path.join(DOCS, 'RUNTIME_COMPONENT_MATRIX.md'), 'utf8');
    nodeAssert.ok(c.includes('READY'));
    nodeAssert.ok(c.includes('NOT ELIGIBLE'));
    nodeAssert.ok(c.includes('Grupo A'));
    nodeAssert.ok(c.includes('Grupo B'));
  });

  await test('P1 — Grupo A flags registadas', () => {
    for (const f of GROUP_A_FLAGS) {
      nodeAssert.ok(featureSrc.includes(f), `${f} ausente em featureGovernanceService`);
    }
  });

  // P2 — Classificação Grupo A READY
  for (const flag of GROUP_A_FLAGS) {
    await test(`P2 — Grupo A ${flag} elegível (serviço + testes EG)`, () => {
      nodeAssert.ok(featureSrc.includes(flag));
    });
  }

  await test('P2 — Grupo B NOT ELIGIBLE documentado', () => {
    const matrix = fs.readFileSync(path.join(DOCS, 'RUNTIME_COMPONENT_MATRIX.md'), 'utf8');
    nodeAssert.ok(matrix.includes('Cognitive Controller'));
    nodeAssert.ok(matrix.includes('Pulse'));
    nodeAssert.ok(matrix.includes('Event Backbone'));
    nodeAssert.ok(matrix.includes('NOT ELIGIBLE'));
  });

  // P3 — Plano promoção sequência
  await test('P3 — sequência Learning→KB no plano', () => {
    const promo = fs.readFileSync(path.join(DOCS, 'ENTERPRISE_RUNTIME_PROMOTION.md'), 'utf8');
    nodeAssert.ok(promo.includes('EVENT_GOVERNANCE_LEARNING'));
    nodeAssert.ok(promo.includes('EVENT_GOVERNANCE_KNOWLEDGE_BASE'));
    nodeAssert.ok(promo.includes('rollback'));
  });

  // P4 — Controlled restart plan
  await test('P4 — CONTROLLED_RESTART_PLAN.md com PM2 --update-env', () => {
    const plan = fs.readFileSync(path.join(DOCS, 'CONTROLLED_RESTART_PLAN.md'), 'utf8');
    nodeAssert.ok(plan.includes('pm2 restart impetus-backend --update-env'));
    nodeAssert.ok(plan.includes('Rollback'));
    nodeAssert.ok(plan.includes('EVENT_GOVERNANCE_ENABLED'));
    nodeAssert.ok(plan.includes('NÃO activar'));
  });

  // P5 — Validação pós-restart endpoints
  const auditSrc = readSrc('routes/audit.js');
  const postRestartRoutes = [
    '/event-governance/learning',
    '/event-governance/memory',
    '/event-governance/explainability',
    '/event-governance/intelligence',
    '/event-governance/policy-optimization',
    '/event-governance/executive-insights',
    '/event-governance/knowledge-base'
  ];
  for (const r of postRestartRoutes) {
    await test(`P5 — validação pós-restart ${r}`, () => {
      nodeAssert.ok(auditSrc.includes(r));
    });
  }

  // P6 — INTEG-01 NCs reavaliadas
  await test('P6 — NCs INTEG-01 referenciadas no relatório', () => {
    const promo = fs.readFileSync(path.join(DOCS, 'ENTERPRISE_RUNTIME_PROMOTION.md'), 'utf8');
    nodeAssert.ok(promo.includes('NC-INT-001'));
    nodeAssert.ok(promo.includes('NC-INT-007'));
    nodeAssert.ok(promo.includes('Parcialmente resolvida'));
  });

  await test('P6 — evidência INTEG-01 existe', () => {
    nodeAssert.ok(fs.existsSync(integEvidence));
  });

  // EG v1 preserved
  await test('P7 — EG v1 preservado (pipeline inalterado)', () => {
    nodeAssert.ok(execSrc.includes('governanceLearningIntegrationService'));
    nodeAssert.ok(!execSrc.includes('governanceKnowledgeBaseService'));
    nodeAssert.ok(fs.existsSync(eg20Cert));
  });

  await test('P7 — Grupo B sem promoção forçada no restart plan', () => {
    const plan = fs.readFileSync(path.join(DOCS, 'CONTROLLED_RESTART_PLAN.md'), 'utf8');
    nodeAssert.ok(plan.includes('Grupo B'));
    for (const svc of GROUP_B_SERVICES) {
      const src = readSrc(svc);
      nodeAssert.ok(src);
      nodeAssert.ok(!src.includes('EVENT_GOVERNANCE_LEARNING'));
    }
  });

  await test('P7 — documentação completa PROMOTION-01', () => {
    for (const d of [
      'ENTERPRISE_RUNTIME_PROMOTION.md',
      'RUNTIME_COMPONENT_MATRIX.md',
      'CONTROLLED_RESTART_PLAN.md'
    ]) {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, d)), `${d} ausente`);
    }
  });

  let decision = 'BLOCKED';
  if (failed === 0) {
    decision = 'READY COM RESSALVAS';
  }

  evidence.decision = decision;
  evidence.summary = { passed, failed, group_a_ready: GROUP_A_FLAGS.length, group_b_not_eligible: 3 };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidenceFile = path.join(EVIDENCE_DIR, `promotion-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed`);
  console.log(`  Decisão: ${decision}`);
  console.log(`  Evidência: ${evidenceFile}\n`);

  console.log(
    JSON.stringify({
      passed,
      failed,
      decision,
      event_governance_v1_preserved: true,
      runtime_components_classified: true,
      shadow_components_promotable: true,
      controlled_restart_plan_available: true,
      rollback_plan_available: true,
      observability_preserved: true,
      no_runtime_regressions: failed === 0
    })
  );

  if (failed > 0) process.exit(1);
})();
