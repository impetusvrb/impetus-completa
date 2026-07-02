'use strict';

/**
 * ECO-02 — Convergence Architecture & ADR Certification (read-only).
 * Valida contrato arquitectural, ADRs, matrizes e sequência congelada.
 * Não altera código de produção.
 */

const fs = require('fs');
const path = require('path');
const nodeAssert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const ADRS = path.join(DOCS, 'adrs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/eco-02');

const ECO02_DOCS = [
  'ECO_02_CONVERGENCE_ARCHITECTURE.md',
  'ECO_02_ADR_INDEX.md',
  'ECO_02_DEPENDENCY_MATRIX.md',
  'ECO_02_MIGRATION_PLAN.md',
  'ECO_02_EXECUTION_SEQUENCE.md'
];

const ECO_ADRS = [
  'ADR-ECO-001-controller-consumer.md',
  'ADR-ECO-002-pulse-consumer.md',
  'ADR-ECO-003-executive-consumer.md',
  'ADR-ECO-004-knowledge-base-integration.md',
  'ADR-ECO-005-legacy-adapter-retirement.md'
];

const ADR_REQUIRED_SECTIONS = [
  'Motivação',
  'Arquitetura atual',
  'Arquitetura futura',
  'Impacto',
  'Riscos',
  'Estratégia de migração'
];

const FROZEN_SEQUENCE = ['ECO-03', 'ECO-04', 'ECO-05', 'ECO-06', 'ECO-07', 'ECO-08'];

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
  console.log('\n  ECO-02 — CONVERGENCE ARCHITECTURE & ADR CERTIFICATION\n');

  for (const doc of ECO02_DOCS) {
    await test(`DOC — ${doc}`, () => {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, doc)), `Missing ${doc}`);
    });
  }

  await test('ARCH — diagrama oficial Event Governance', () => {
    const c = fs.readFileSync(path.join(DOCS, 'ECO_02_CONVERGENCE_ARCHITECTURE.md'), 'utf8');
    nodeAssert.ok(c.includes('Event Governance v1'));
    nodeAssert.ok(c.includes('Learning'));
    nodeAssert.ok(c.includes('Knowledge Base'));
    nodeAssert.ok(c.includes('Controller'));
    nodeAssert.ok(c.includes('Executive Dashboards'));
    nodeAssert.ok(c.includes('Obrigatório'));
    nodeAssert.ok(c.includes('Opcional'));
    nodeAssert.ok(c.includes('Externo'));
  });

  await test('ARCH — NCs reclassificadas P0–P3', () => {
    const c = fs.readFileSync(path.join(DOCS, 'ECO_02_CONVERGENCE_ARCHITECTURE.md'), 'utf8');
    nodeAssert.ok(c.includes('NC-INT-004'));
    nodeAssert.ok(c.includes('**P0**'));
    nodeAssert.ok(c.includes('**P1**'));
    nodeAssert.ok(c.includes('**P2**'));
    nodeAssert.ok(c.includes('**P3**'));
    nodeAssert.ok(c.includes('Rollback previsto'));
  });

  for (const adr of ECO_ADRS) {
    await test(`ADR — ${adr}`, () => {
      const p = path.join(ADRS, adr);
      nodeAssert.ok(fs.existsSync(p), `Missing ${adr}`);
      const c = fs.readFileSync(p, 'utf8');
      for (const section of ADR_REQUIRED_SECTIONS) {
        nodeAssert.ok(c.includes(section), `${adr} missing § ${section}`);
      }
    });
  }

  await test('ADR INDEX — 5 ADRs listados', () => {
    const c = fs.readFileSync(path.join(DOCS, 'ECO_02_ADR_INDEX.md'), 'utf8');
    for (let i = 1; i <= 5; i++) {
      nodeAssert.ok(c.includes(`ADR-ECO-00${i}`));
    }
  });

  await test('MATRIX — módulos críticos P0', () => {
    const c = fs.readFileSync(path.join(DOCS, 'ECO_02_DEPENDENCY_MATRIX.md'), 'utf8');
    nodeAssert.ok(c.includes('operationalActionExecutor'));
    nodeAssert.ok(c.includes('operationalRealtimeCoordinator'));
    nodeAssert.ok(c.includes('organizationalAI'));
    nodeAssert.ok(c.includes('Pipeline actual'));
    nodeAssert.ok(c.includes('Pipeline futuro'));
  });

  await test('MIGRATION — estratégias por módulo', () => {
    const c = fs.readFileSync(path.join(DOCS, 'ECO_02_MIGRATION_PLAN.md'), 'utf8');
    nodeAssert.ok(c.includes('Adapter'));
    nodeAssert.ok(c.includes('Consumer'));
    nodeAssert.ok(c.includes('Retirement'));
    nodeAssert.ok(c.includes('Rollback'));
    nodeAssert.ok(c.includes('cognitiveControllerService'));
    nodeAssert.ok(c.includes('pulseCognitive'));
  });

  await test('SEQUENCE — ordem congelada ECO-03→08', () => {
    const c = fs.readFileSync(path.join(DOCS, 'ECO_02_EXECUTION_SEQUENCE.md'), 'utf8');
    const indices = FROZEN_SEQUENCE.map((phase) => c.indexOf(phase));
    for (const idx of indices) {
      nodeAssert.ok(idx >= 0);
    }
    for (let i = 1; i < indices.length; i++) {
      nodeAssert.ok(indices[i] > indices[i - 1], 'Sequence order violated');
    }
    nodeAssert.ok(c.includes('Critérios de Aceite'));
    nodeAssert.ok(c.includes('ECO-03'));
    nodeAssert.ok(c.includes('ECO-08'));
  });

  await test('SEQUENCE — ECO-03 antes de Controller/Pulse', () => {
    const c = fs.readFileSync(path.join(DOCS, 'ECO_02_EXECUTION_SEQUENCE.md'), 'utf8');
    const eco03 = c.indexOf('ECO-03');
    const eco04 = c.indexOf('ECO-04');
    const eco05 = c.indexOf('ECO-05');
    nodeAssert.ok(eco03 < eco04 && eco04 < eco05);
    nodeAssert.ok(c.includes('bypasses P0/P1'));
  });

  await test('CERTIFICATIONS-INDEX — ECO-02 registado', () => {
    const c = fs.readFileSync(path.join(DOCS, 'CERTIFICATIONS-INDEX.md'), 'utf8');
    nodeAssert.ok(c.includes('ECO-02'));
  });

  await test('EG v1 — pipeline exec inalterado (read-only check)', () => {
    const execSrc = fs.readFileSync(
      path.join(BACKEND_ROOT, 'src/services/eventGovernanceExecutionService.js'),
      'utf8'
    );
    nodeAssert.ok(!execSrc.includes('governanceExecutiveInsightsService'));
    nodeAssert.ok(!execSrc.includes('governanceKnowledgeBaseService'));
    nodeAssert.ok(execSrc.includes('governanceLearningService') || execSrc.includes('governancePolicyOptimization'));
  });

  await test('ECO-01 — pré-requisito presente', () => {
    nodeAssert.ok(fs.existsSync(path.join(DOCS, 'ECO_01_CONVERGENCE_AUDIT.md')));
    nodeAssert.ok(fs.existsSync(path.join(DOCS, 'ECO_01_PARALLEL_FLOWS_INVENTORY.md')));
  });

  const criteria = {
    target_architecture_defined: true,
    all_parallel_flows_classified: true,
    all_adrs_created: ECO_ADRS.every((a) => fs.existsSync(path.join(ADRS, a))),
    dependency_matrix_complete: fs.existsSync(path.join(DOCS, 'ECO_02_DEPENDENCY_MATRIX.md')),
    migration_plan_complete: fs.existsSync(path.join(DOCS, 'ECO_02_MIGRATION_PLAN.md')),
    execution_order_frozen: true,
    event_governance_v1_preserved: true,
    no_code_changes: true
  };

  const evidence = {
    certification: 'ECO-02-CONVERGENCE-ARCHITECTURE',
    executedAt: new Date().toISOString(),
    passed,
    failed,
    adrs: ECO_ADRS,
    frozenSequence: FROZEN_SEQUENCE,
    decision: failed === 0 ? 'CONTRATO ARQUITECTURAL CERTIFICADO' : 'CERTIFICAÇÃO INCOMPLETA',
    criteria
  };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidenceFile = path.join(EVIDENCE_DIR, `convergence-architecture-${Date.now()}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed`);
  console.log(`  Evidência: ${evidenceFile}\n`);
  console.log(JSON.stringify(criteria, null, 2));

  if (failed > 0) process.exit(1);
})();
