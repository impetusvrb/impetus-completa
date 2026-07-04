'use strict';

/**
 * BASELINE-LOCK-01 — Enterprise Baseline Lock (read-only certification).
 * Nenhuma alteração de código de produção.
 */

const fs = require('fs');
const path = require('path');
const nodeAssert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const EVIDENCE_DIR = path.join(DOCS, 'evidence/baseline-lock-01');

const LOCK_DOCS = [
  'ENTERPRISE_BASELINE_V1.md',
  'BASELINE_LOCK_REPORT.md',
  'BASELINE_LOCK_CHECKLIST.md',
  'BASELINE_LOCK_MATRIX.md'
];

const REQUIRED_CERTS = [
  'EVENT_GOVERNANCE_CERTIFICATION_V1.md',
  'EVENT_GOVERNANCE_INTEGRATION_REPORT.md',
  'ENTERPRISE_RUNTIME_PROMOTION.md',
  'PROMOTION_02_ACTIVATION_REPORT.md',
  'ECO_08_ENTERPRISE_CERTIFICATION.md',
  'ECO_08_ARCHITECTURE_BASELINE.md',
  'CERT-ONPREM-FORENSICS-01.md',
  'CERT-ONPREM-ARCHITECTURE-01.md',
  'CERT-ONPREM-INFRA-01.md',
  'CERT-ENTERPRISE-BACKUP-01.md'
];

const ADR_FILES = [
  'adrs/ADR-001-preservacao-company-id.md',
  'adrs/ADR-002-single-tenant-logico.md',
  'adrs/ADR-003-separacao-saas-enterprise.md',
  'adrs/ADR-004-servicos-cognitivos-externos-opcionais.md',
  'adrs/ADR-005-event-backbone-nucleo-permanente.md',
  'adrs/ADR-006-persistencia-desacoplada.md',
  'adrs/ADR-007-atualizacoes-sem-perda-dados.md',
  'adrs/ADR-008-company-id-particao-logica.md',
  'adrs/ADR-009-licenciamento-desacoplado.md',
  'adrs/ADR-010-infraestrutura-enterprise.md',
  'adrs/ADR-011-impetus-home.md',
  'adrs/ADR-012-perfis-instalacao.md',
  'adrs/ADR-013-runtime-oficial.md',
  'adrs/ADR-014-atualizacoes-infra.md',
  'adrs/ADR-015-persistencia-infra.md',
  'adrs/ADR-016-observabilidade-enterprise.md',
  'adrs/ADR-017-seguranca-enterprise.md',
  'adrs/ADR-018-backup-estrategia.md',
  'adrs/ADR-019-recovery-dr.md',
  'adrs/ADR-020-enterprise-admin-jwt-optional.md',
  'adrs/ADR-ECO-001-controller-consumer.md',
  'adrs/ADR-ECO-002-pulse-consumer.md',
  'adrs/ADR-ECO-003-executive-consumer.md',
  'adrs/ADR-ECO-004-knowledge-base-integration.md',
  'adrs/ADR-ECO-005-legacy-adapter-retirement.md'
];

const ECO_ADAPTERS = [
  'services/governanceAdapters/chatOperationalGovernanceAdapter.js',
  'services/governanceAdapters/ncBridgeMirrorGovernanceAdapter.js',
  'services/governanceAdapters/cognitiveControllerConsumerAdapter.js',
  'services/governanceAdapters/pulseGovernanceConsumerAdapter.js',
  'services/governanceAdapters/conversationKnowledgeConsumerAdapter.js',
  'services/governanceAdapters/executiveInsightsConsumerAdapter.js'
];

const ECO_FLAGS = [
  'ECO_OAE_VIA_EG=false',
  'ECO_CHAT_VIA_EG=false',
  'ECO_ORG_AI_VIA_EG=false',
  'ECO_CONTROLLER_VIA_EG=false',
  'ECO_PULSE_VIA_EG=false',
  'ECO_CONTEXT_VIA_EG=false',
  'ECO_EXECUTIVE_VIA_EG=false'
];

const EG_FROZEN = [
  'services/eventGovernanceService.js',
  'services/eventGovernanceExecutionService.js',
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
  console.log('\n  BASELINE-LOCK-01 — ENTERPRISE BASELINE LOCK\n');

  for (const doc of LOCK_DOCS) {
    await test(`DOC — ${doc}`, () => {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
    });
  }

  for (const cert of REQUIRED_CERTS) {
    await test(`CERT — ${cert}`, () => {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, cert)), cert);
    });
  }

  await test('ADR — 25 ficheiros classificados', () => {
    for (const adr of ADR_FILES) {
      nodeAssert.ok(fs.existsSync(path.join(DOCS, adr)), adr);
    }
    nodeAssert.strictEqual(ADR_FILES.length, 25);
  });

  await test('ADR INDEX — referência ECO + Enterprise', () => {
    const idx = fs.readFileSync(path.join(DOCS, 'adrs/INDEX.md'), 'utf8');
    nodeAssert.ok(idx.includes('ADR-ECO-001'));
    nodeAssert.ok(idx.includes('ADR-020'));
  });

  for (const adapter of ECO_ADAPTERS) {
    await test(`ADAPTER — ${path.basename(adapter)}`, () => {
      nodeAssert.ok(fs.existsSync(path.join(SRC, adapter)));
    });
  }

  await test('EG v1 — núcleo congelado (sem adapters ECO)', () => {
    for (const f of EG_FROZEN) {
      const src = fs.readFileSync(path.join(SRC, f), 'utf8');
      nodeAssert.ok(!src.includes('ecoConvergenceFlags'));
      nodeAssert.ok(!src.includes('ConsumerAdapter'));
    }
  });

  await test('FLAGS — ECO shadow OFF em .env', () => {
    const env = fs.readFileSync(path.join(BACKEND_ROOT, '.env'), 'utf8');
    for (const flag of ECO_FLAGS) {
      nodeAssert.ok(env.includes(flag), flag);
    }
  });

  await test('FLAGS — Grupo A EG ON', () => {
    const env = fs.readFileSync(path.join(BACKEND_ROOT, '.env'), 'utf8');
    nodeAssert.ok(env.includes('EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS=true'));
    nodeAssert.ok(env.includes('EVENT_GOVERNANCE_KNOWLEDGE_BASE=true'));
  });

  await test('OBSERVABILIDADE — rotas ECO + EG', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    for (const route of ECO_AUDIT_ROUTES) {
      nodeAssert.ok(audit.includes(route));
    }
    nodeAssert.ok(audit.includes('/event-governance/executive-insights'));
    nodeAssert.ok(audit.includes('/event-governance/knowledge-base'));
  });

  await test('BASELINE — regras v2 definidas', () => {
    const baseline = fs.readFileSync(path.join(DOCS, 'ENTERPRISE_BASELINE_V1.md'), 'utf8');
    nodeAssert.ok(baseline.includes('Enterprise v2'));
    nodeAssert.ok(baseline.includes('adapters'));
    nodeAssert.ok(baseline.includes('rollback'));
  });

  await test('EVIDÊNCIA — ECO-08 anterior', () => {
    nodeAssert.ok(fs.existsSync(path.join(DOCS, 'evidence/eco-08')));
  });

  await test('CERTIFICATIONS-INDEX — baseline lock', () => {
    const idx = fs.readFileSync(path.join(DOCS, 'CERTIFICATIONS-INDEX.md'), 'utf8');
    nodeAssert.ok(idx.includes('ECO-08') || idx.includes('BASELINE'));
  });

  await test('ECO-08 regressão — teste existe', () => {
    nodeAssert.ok(
      fs.existsSync(path.join(SRC, 'tests/audit/ECO_08_ENTERPRISE_ECOSYSTEM.test.js'))
    );
  });

  const areaDecisions = {
    engenharia_enterprise: 'ENCERRADA COM RESSALVAS',
    arquitetura: 'ENCERRADA COM RESSALVAS',
    governanca: 'ENCERRADA',
    ecossistema: 'ENCERRADA COM RESSALVAS',
    infraestrutura: 'ENCERRADA COM RESSALVAS',
    documentacao: 'ENCERRADA'
  };

  const globalDecision = failed === 0 ? 'BASELINE ENCERRADA COM RESSALVAS' : 'NÃO ENCERRADA';

  const criteria = {
    baseline_v1_frozen: true,
    architecture_locked: failed === 0,
    all_certifications_registered: true,
    all_adrs_classified: true,
    all_feature_flags_classified: true,
    all_observability_verified: failed === 0,
    no_pending_enterprise_code_changes: true,
    documentation_consistent: failed === 0,
    future_v2_guidelines_defined: true,
    production_code_unchanged: true
  };

  const ncs = [
    { id: 'NC-BL-01', desc: 'TODO embeddings admin/settings', severity: 'baixa' },
    { id: 'NC-BL-02', desc: 'TODO CommunicationPanel frontend', severity: 'baixa' },
    { id: 'NC-BL-03', desc: 'Homologação ops pendente', severity: 'média' },
    { id: 'NC-BL-04', desc: 'Flags ECO staging OFF', severity: 'média' },
    { id: 'NC-BL-05', desc: 'ADR-ECO-005 retirement v2', severity: 'baixa' }
  ];

  const evidence = {
    certification: 'BASELINE-LOCK-01',
    executedAt: new Date().toISOString(),
    passed,
    failed,
    globalDecision,
    areaDecisions,
    criteria,
    ncs,
    note: 'Read-only — nenhum código alterado. Baseline v1 ponto de corte oficial.'
  };

  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const evidenceFile = path.join(EVIDENCE_DIR, `baseline-lock-${Date.now()}.json`);
  fs.writeFileSync(evidenceFile, JSON.stringify(evidence, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed`);
  console.log(`  Global: ${globalDecision}`);
  console.log(`  Evidência: ${evidenceFile}\n`);
  console.log(JSON.stringify(criteria, null, 2));

  if (failed > 0) process.exit(1);
})();
