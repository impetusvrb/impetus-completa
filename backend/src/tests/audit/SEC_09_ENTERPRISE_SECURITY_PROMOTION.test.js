'use strict';

/**
 * SEC-09 — Enterprise Security Promotion (auditoria do plano).
 * READ ONLY — não activa flags nem altera runtime.
 *
 * node backend/src/tests/audit/SEC_09_ENTERPRISE_SECURITY_PROMOTION.test.js
 */

const fs = require('fs');
const path = require('path');
const nodeAssert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/sec-09');

const SEC_DOCS = [
  'SEC_09_PROMOTION.md',
  'SEC_09_RUNTIME_PROMOTION.md',
  'SEC_09_CHECKLIST.md',
  'SEC_09_ROLLBACK.md',
  'SEC_09_REPORT.md'
];

const EXPECTED_ORDER = [
  'SECURITY_OBSERVATORY',
  'SECURITY_CORRELATION_ENGINE',
  'SECURITY_THREAT_INTELLIGENCE',
  'SECURITY_RUNTIME_INTEGRITY',
  'SECURITY_NOTIFICATION_CENTER',
  'SECURITY_RESPONSE_ORCHESTRATOR',
  'SECURITY_SOC'
];

const PROTECTED_PATHS = [
  'services/eventGovernanceService.js',
  'services/eventGovernanceExecutionService.js',
  'conversationContext/conversationContextEngine.js'
];

let passed = 0;
let failed = 0;

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
  console.log('\n  SEC-09 — ENTERPRISE SECURITY PROMOTION\n');

  const plan = require(path.join(SRC, 'securityPromotion/config/securityPromotionPlan'));
  const promotion = require(path.join(SRC, 'securityPromotion'));

  // P1 — Inventário flags
  await test('P1 — inventário SECURITY_* no plano', () => {
    nodeAssert.strictEqual(plan.ACTIVATION_SEQUENCE.length, 7);
    for (const flag of EXPECTED_ORDER) {
      nodeAssert.ok(plan.ACTIVATION_SEQUENCE.some((s) => s.primaryFlag === flag), flag);
    }
  });

  await test('P1 — dependências documentadas', () => {
    const sec07 = plan.ACTIVATION_SEQUENCE.find((s) => s.phase === 'SEC-07');
    nodeAssert.ok(sec07.dependsOn.includes('SEC-01'));
    nodeAssert.ok(sec07.dependsOn.includes('SEC-06'));
  });

  await test('P1 — rollback por etapa', () => {
    for (const step of plan.ACTIVATION_SEQUENCE) {
      nodeAssert.ok(step.rollback?.action, step.phase);
      nodeAssert.ok(step.rollback?.restart?.includes('pm2'), step.phase);
    }
  });

  // P2 — Classificação
  await test('P2 — classificação READY / READY_WITH_MONITORING', () => {
    const ready = plan.ACTIVATION_SEQUENCE.filter((s) => s.classification === 'READY');
    const rwm = plan.ACTIVATION_SEQUENCE.filter((s) => s.classification === 'READY_WITH_MONITORING');
    nodeAssert.ok(ready.length >= 4);
    nodeAssert.ok(rwm.length >= 3);
    nodeAssert.ok(plan.NOT_ELIGIBLE.length >= 1);
    nodeAssert.ok(plan.BLOCKED.some((b) => b.flag === 'SECURITY_RESPONSE_PROTECT_ENABLED'));
  });

  // P3 — Ordem
  await test('P3 — ordem oficial sequencial', () => {
    const flags = plan.ACTIVATION_SEQUENCE.map((s) => s.primaryFlag);
    nodeAssert.deepStrictEqual(flags, EXPECTED_ORDER);
  });

  await test('P3 — nunca activar simultaneamente (AUTO_ACTIVATION false)', () => {
    nodeAssert.strictEqual(plan.AUTO_ACTIVATION, false);
  });

  // P4 — Checkpoint + health + observação
  await test('P4 — checkpoint e health por etapa', () => {
    for (const step of plan.ACTIVATION_SEQUENCE) {
      nodeAssert.ok(step.checkpoint, step.phase);
      nodeAssert.ok(step.healthEndpoint?.includes('/api/audit/'), step.phase);
      nodeAssert.ok(step.minObservationMinutes >= 15, step.phase);
    }
  });

  // P5 — Documentação
  for (const doc of SEC_DOCS) {
    await test(`P5 — ${doc}`, () => {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
    });
  }

  await test('P5 — report antes/durante/depois', () => {
    const rep = fs.readFileSync(path.join(DOCS, 'SEC_09_REPORT.md'), 'utf8');
    nodeAssert.ok(rep.includes('Antes'));
    nodeAssert.ok(rep.includes('Durante'));
    nodeAssert.ok(rep.includes('Depois'));
  });

  // P6 — Dashboard + endpoint
  await test('P6 — promotion dashboard payload', () => {
    const payload = promotion.getPromotionPayload();
    nodeAssert.strictEqual(payload.phase, 'SEC-09');
    nodeAssert.strictEqual(payload.read_only, true);
    nodeAssert.ok(payload.promotion.steps.length === 7);
    nodeAssert.strictEqual(payload.promotion.auto_activation, false);
    nodeAssert.ok(payload.promotion.rollback.independent);
  });

  await test('P6 — rota /security-promotion em audit.js', () => {
    const audit = readSrc('routes/audit.js');
    nodeAssert.ok(audit.includes('/security-promotion'));
  });

  // P7 — Não auto-activar
  await test('P7 — módulo promotion não altera .env', () => {
    const engineSrc = readSrc('securityPromotion/engine/securityPromotionEngine.js');
    nodeAssert.ok(!engineSrc.includes('writeFileSync'));
    nodeAssert.ok(!engineSrc.includes('process.env[') || engineSrc.includes('process.env[name]'));
    nodeAssert.ok(!engineSrc.includes('execSync'));
  });

  await test('P7 — SEC-06 constraints advise/L1/Protect OFF', () => {
    const sec06 = plan.ACTIVATION_SEQUENCE.find((s) => s.phase === 'SEC-06');
    nodeAssert.strictEqual(sec06.requiredConstraints.SECURITY_RESPONSE_DEFAULT_MODE, 'advise');
    nodeAssert.strictEqual(sec06.requiredConstraints.SECURITY_RESPONSE_MAX_LEVEL, '1');
    nodeAssert.strictEqual(sec06.requiredConstraints.SECURITY_RESPONSE_PROTECT_ENABLED, 'false');
  });

  // P8 — Preservação
  await test('P8 — Event Governance preservado', () => {
    const eg = readSrc('services/eventGovernanceService.js');
    nodeAssert.ok(eg);
    nodeAssert.ok(!eg.includes('securityPromotion'));
  });

  await test('P8 — Cognitive Core preservado', () => {
    for (const p of PROTECTED_PATHS) {
      const src = readSrc(p);
      if (!src) continue;
      nodeAssert.ok(!src.includes('securityPromotion'));
    }
  });

  await test('P8 — SEC-08 baseline intacta', () => {
    nodeAssert.ok(fs.existsSync(path.join(DOCS, 'ENTERPRISE_SECURITY_V1.md')));
    nodeAssert.ok(fs.existsSync(path.join(DOCS, 'evidence/sec-08/certification-latest.json')));
  });

  // P9 — Recomendação fase 1
  await test('P9 — recomendação promoção passiva documentada', () => {
    nodeAssert.ok(plan.RECOMMENDED_PHASE_1.steps.includes('SEC-01'));
    nodeAssert.ok(plan.RECOMMENDED_PHASE_1.sec06Constraints.SECURITY_RESPONSE_PROTECT_ENABLED === 'false');
    const promo = fs.readFileSync(path.join(DOCS, 'SEC_09_PROMOTION.md'), 'utf8');
    nodeAssert.ok(promo.includes('SEC-01'));
    nodeAssert.ok(promo.includes('advise'));
  });

  const criteria = {
    promotion_plan_available: failed === 0,
    activation_order_defined: failed === 0,
    rollback_defined: failed === 0,
    health_checks_defined: failed === 0,
    security_preserved: failed === 0,
    enterprise_baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const globalDecision =
    failed === 0
      ? 'SEC-09 PROMOTION PLAN APPROVED — MANUAL ACTIVATION PENDING'
      : 'SEC-09 PROMOTION PLAN NOT APPROVED';

  const evidence = {
    certification: 'SEC-09-ENTERPRISE-SECURITY-PROMOTION',
    version: 'v1',
    executedAt: new Date().toISOString(),
    passed,
    failed,
    globalDecision,
    criteria,
    auto_activation: false,
    activation_sequence: EXPECTED_ORDER,
    recommended_phase_1: plan.RECOMMENDED_PHASE_1
  };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(EVIDENCE_DIR, `promotion-${ts}.json`), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'promotion-latest.json'), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'criteria.json'), JSON.stringify({ certification: 'SEC-09', criteria, globalDecision }, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed`);
  console.log(`  Decisão: ${globalDecision}`);
  console.log(`  Auto-activação: false\n`);
  console.log(JSON.stringify(criteria, null, 2));

  if (failed > 0) process.exit(1);
})();
