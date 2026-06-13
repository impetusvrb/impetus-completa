'use strict';

/**
 * AIOI-ORG-2 — Truth Stage 7 Certification Static Audit
 *
 * Objetivos:
 *   - evidence traceability
 *   - deterministic validation
 *   - no unverifiable claims in AIOI adapters
 *   - no orphan evidence references
 *   - no truth bypass in certified cognitive paths
 *
 * Executar:
 *   node src/tests/aioi/AioiTruthStage7CertificationAudit.test.js
 *
 * Token alvo: AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_PASS
 */

let _passed = 0;
let _failed = 0;

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION FAILED: ${message}`);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} — expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)}`);
  }
}

async function test(name, fn) {
  try {
    await fn();
    _passed++;
    console.log(`  ✓  ${name}`);
  } catch (err) {
    _failed++;
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
  }
}

function suite(name) {
  console.log(`\n[SUITE] ${name}`);
}

const path = require('path');
const fs = require('fs');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT = path.resolve(BACKEND_ROOT, '..');
const DOCS = path.join(BACKEND_ROOT, 'docs');
const AIOI_SERVICES = path.join(BACKEND_ROOT, 'src/services/aioi');
const FRONTEND_AIOI = path.join(REPO_ROOT, 'frontend/src/modules/aioi');

const GOVERNANCE_DOCS = [
  'AIOI_GOVERNANCE_01_CERTIFICATION.md',
  'AIOI_P0_AUTHORIZATION.md',
  'AIOI_SOVEREIGNTY_MAP.md',
  'AIOI_INTEGRATION_CATALOG.md',
  'AIOI_IOE_SPECIFICATION.md',
  'AIOI_BUS_ARCHITECTURE.md',
  'AIOI_ANTI_DUPLICATION_POLICY.md',
  'AIOI_STRUCTURAL_READINESS.md',
];

const ORG2_DOCS = [
  'AIOI_TRUTH_STAGE7_INVENTORY.md',
  'AIOI_TRUTH_STAGE7_DEPENDENCY_MATRIX.md',
  'AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT.md',
];

const ORG1_DOCS = [
  'AIOI_QUEUE_SOVEREIGNTY_AUDIT.md',
  'AIOI_QUEUE_SOVEREIGNTY_MATRIX.md',
  'AIOI_QUEUE_PRECEDENCE_CONTRACT.md',
];

const TRUTH_SOVEREIGN = 'services/industrialTruthEnforcementService.js';
const TRUTH_CLOSURE = 'services/cognitiveTruthClosureService.js';

const AIOI_ADAPTERS = [
  'services/aioi/plcAioiAdapter.js',
  'services/aioi/mesAioiAdapter.js',
  'services/aioi/taskAioiAdapter.js',
  'services/aioi/communicationAioiAdapter.js',
];

const CERTIFIED_COGNITIVE_PATHS = [
  { id: 'dashboard_chat', file: 'routes/dashboard.js', patterns: ['applyCognitiveTextTruth', 'enforceTextResponse'] },
  { id: 'chat_consolidated', file: 'services/chatAIService.consolidated.js', patterns: ['applyCognitiveTextTruth'] },
  { id: 'executive_mode', file: 'services/executiveMode.js', patterns: ['applyCognitiveTextTruth'] },
  { id: 'cognitive_council', file: 'routes/cognitiveCouncil.js', patterns: ['applyCognitiveTextTruth'] },
  { id: 'truth_closure', file: TRUTH_CLOSURE, patterns: ['enforceTextResponse'] },
  { id: 'impetus_voice', file: 'services/impetusVoiceChatService.js', patterns: ['applyCognitiveTextTruth'] },
];

const F47_STAGE7_EXPORTS = [
  'classifyPrioritySupportedClaims',
  'detectForbiddenPriorityPredictionClaims',
  'PRIORITY_SUPPORTED_CLAIM_RE',
  'FORBIDDEN_PRIORITY_PREDICTION_CLAIM_RE',
];

const TRUTH_STAGES_F40_F47 = [
  'FORBIDDEN_TELEMETRY_INVENTED_KPI_RE',
  'FORBIDDEN_PREDICTIVE_CLAIM_RE',
  'FORBIDDEN_FAILURE_PREDICTION_CLAIM_RE',
  'FORBIDDEN_CAUSALITY_CLAIM_RE',
  'FORBIDDEN_EVENT_PREDICTION_CLAIM_RE',
  'FORBIDDEN_PATTERN_PREDICTION_CLAIM_RE',
  'FORBIDDEN_ROOT_CAUSE_CLAIM_RE',
  'FORBIDDEN_PRIORITY_PREDICTION_CLAIM_RE',
];

const P8_RUNTIME_SERVICES = [
  'cognitive-runtime/ExecutiveCognitiveRuntimeService.js',
  'runtime-authorization/ExecutiveRuntimeAuthorizationService.js',
  'assistant-runtime/ExecutiveAssistantRuntimeService.js',
];

function readDoc(name) {
  const p = path.join(DOCS, name);
  assert(fs.existsSync(p), `Documento ausente: ${name}`);
  return fs.readFileSync(p, 'utf8');
}

function readBackend(rel) {
  const p = path.join(BACKEND_ROOT, 'src', rel);
  assert(fs.existsSync(p), `Arquivo backend ausente: ${rel}`);
  return fs.readFileSync(p, 'utf8');
}

function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function scanAioiForForbiddenTruthValidator() {
  const offenders = [];
  function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) { walk(full); continue; }
      if (!e.name.endsWith('.js')) continue;
      const code = fs.readFileSync(full, 'utf8');
      if (/aioiTruthValidator|AioiTruthValidator|class\s+.*TruthValidator/i.test(code)) {
        offenders.push(path.relative(AIOI_SERVICES, full));
      }
      if (/FORBIDDEN_PRIORITY_PREDICTION_CLAIM_RE|FORBIDDEN_TELEMETRY_INVENTED_KPI_RE/.test(code)) {
        offenders.push(`${path.relative(AIOI_SERVICES, full)}:DUPLICATE_TRUTH_REGEX`);
      }
    }
  }
  walk(AIOI_SERVICES);
  return offenders;
}

function scanOrphanEvidenceInAdapters() {
  const issues = [];
  for (const rel of AIOI_ADAPTERS) {
    const code = readBackend(rel);
    if (!code.includes('evidence_refs')) continue;
    if (!/type:\s*['"][^'"]+['"]/.test(code)) {
      issues.push({ file: rel, code: 'ORPHAN_EVIDENCE_REFERENCE', detail: 'evidence_refs sem type explícito' });
    }
    if (rel.includes('plcAioiAdapter') && !code.includes('priority_pack_f47')) {
      issues.push({ file: rel, code: 'ORPHAN_EVIDENCE_REFERENCE', detail: 'plc adapter sem priority_pack_f47' });
    }
  }
  return issues;
}

function scanUnverifiedClaimsInAdapters() {
  const issues = [];
  for (const rel of AIOI_ADAPTERS) {
    const code = readBackend(rel);
    if (/oee:\s*\d|mtbf:\s*\d|mttr:\s*\d/i.test(code) && !code.includes('telemetry_only')) {
      issues.push({ file: rel, code: 'UNVERIFIED_OPERATIONAL_CLAIM', detail: 'KPI numérico hardcoded' });
    }
    if (code.includes('truth_state') && !code.includes('scores_provisional')) {
      issues.push({ file: rel, code: 'UNVERIFIED_OPERATIONAL_CLAIM', detail: 'truth_state sem scores_provisional' });
    }
  }
  const mes = readBackend('services/aioi/mesAioiAdapter.js');
  if (!/oee:\s*null/.test(mes)) {
    issues.push({ file: 'mesAioiAdapter', code: 'UNVERIFIED_OPERATIONAL_CLAIM', detail: 'TC-04 oee=null ausente' });
  }
  return issues;
}

function scanNonDeterministicTruthValidation() {
  const truthCode = readBackend(TRUTH_SOVEREIGN);
  const stripped = stripComments(truthCode);
  const llmPatterns = [
    /require\s*\(\s*['"]openai['"]/i,
    /require\s*\(\s*['"]@anthropic/i,
    /require\s*\(\s*['"]@google\/generative-ai/i,
    /fetch\s*\(\s*['"]https:\/\/api\.openai/i,
    /Math\.random\s*\(\s*\)\s*[<>]/,
  ];
  for (const p of llmPatterns) {
    if (p.test(stripped)) {
      return `NON_DETERMINISTIC_TRUTH_VALIDATION — padrão ${p} em industrialTruthEnforcementService`;
    }
  }
  return null;
}

function scanCertifiedBypassPaths() {
  const bypasses = [];
  for (const channel of CERTIFIED_COGNITIVE_PATHS) {
    const code = readBackend(channel.file);
    const hasClosure = channel.patterns.some((p) => code.includes(p));
    if (!hasClosure) {
      bypasses.push({ channel: channel.id, file: channel.file, code: 'TRUTH_BYPASS_PATH' });
    }
  }
  return bypasses;
}

function readP8Flags() {
  const out = [];
  for (const rel of P8_RUNTIME_SERVICES) {
    const p = path.join(FRONTEND_AIOI, rel);
    if (!fs.existsSync(p)) continue;
    const code = fs.readFileSync(p, 'utf8');
    out.push({
      file: rel,
      enabled: /runtime_enabled:\s*false/.test(code),
      active: /runtime_active:\s*false/.test(code),
    });
  }
  return out;
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' AIOI-ORG-2 — Truth Stage 7 Certification Audit');
  console.log('═══════════════════════════════════════════════════════════');

  suite('T1 — Governança base');
  for (const doc of GOVERNANCE_DOCS) {
    await test(`T1: ${doc}`, async () => {
      assert(fs.existsSync(path.join(DOCS, doc)), `Ausente: ${doc}`);
    });
  }

  suite('T2 — Documentos ORG-2');
  for (const doc of ORG2_DOCS) {
    await test(`T2: ${doc}`, async () => {
      assert(fs.existsSync(path.join(DOCS, doc)), `Ausente: ${doc}`);
    });
  }

  const inventoryDoc = readDoc('AIOI_TRUTH_STAGE7_INVENTORY.md');
  const matrixDoc = readDoc('AIOI_TRUTH_STAGE7_DEPENDENCY_MATRIX.md');
  const contractDoc = readDoc('AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT.md');
  const antiDupDoc = readDoc('AIOI_ANTI_DUPLICATION_POLICY.md');
  const ioeSpec = readDoc('AIOI_IOE_SPECIFICATION.md');

  suite('T3 — ORG-1 Queue governance preservada');
  for (const doc of ORG1_DOCS) {
    await test(`T3: ${doc} intacto`, async () => {
      const content = readDoc(doc);
      assert(
        content.includes('AIOI-ORG-1') ||
        content.includes('AIOI_ORG_1') ||
        content.includes('QUEUE_SINGLE_SOURCE_OF_TRUTH') ||
        content.includes('QUEUE_GLOBAL_SOVEREIGN'),
        doc
      );
    });
  }
  await test('T3b: token ORG-1 no contrato queue', async () => {
    assert(readDoc('AIOI_QUEUE_PRECEDENCE_CONTRACT.md').includes('AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS'), '');
  });

  suite('T4 — Inventário Truth');
  await test('T4: soberano industrialTruthEnforcementService', async () => {
    assert(inventoryDoc.includes('industrialTruthEnforcementService'), '');
    assert(inventoryDoc.includes('F47'), 'Stage 7 F47');
  });
  await test('T4b: cognitiveTruthClosureService delegação', async () => {
    assert(inventoryDoc.includes('cognitiveTruthClosureService'), '');
  });

  suite('T5 — Contrato certificação RM/TR/TC');
  for (let i = 1; i <= 5; i++) {
    await test(`T5: TR-0${i}`, async () => {
      assert(contractDoc.includes(`TR-0${i}`), `TR-0${i} no contrato ORG-2`);
      assert(antiDupDoc.includes(`TR-0${i}`), `TR-0${i} na política`);
    });
  }
  for (let i = 1; i <= 7; i++) {
    await test(`T5: TC-0${i}`, async () => {
      assert(contractDoc.includes(`TC-0${i}`) || ioeSpec.includes(`TC-0${i}`), `TC-0${i}`);
    });
  }
  await test('T5b: códigos falha auditoria', async () => {
    for (const c of ['TRUTH_BYPASS_PATH', 'ORPHAN_EVIDENCE_REFERENCE', 'UNVERIFIED_OPERATIONAL_CLAIM', 'NON_DETERMINISTIC_TRUTH_VALIDATION']) {
      assert(contractDoc.includes(c), c);
    }
  });

  suite('T6 — Soberano Truth único');
  await test('T6: enforceTextResponse exportado', async () => {
    const code = readBackend(TRUTH_SOVEREIGN);
    assert(code.includes('async function enforceTextResponse'), '');
    assert(code.includes('module.exports'), '');
  });
  await test('T6b: closure delega enforceTextResponse', async () => {
    const code = readBackend(TRUTH_CLOSURE);
    assert(code.includes('enforceTextResponse'), '');
    assert(!/function\s+enforceTextResponse/.test(code), 'closure não reimplementa');
  });
  await test('T6c: proibido aioiTruthValidator', async () => {
    const offenders = scanAioiForForbiddenTruthValidator();
    assertEqual(offenders.length, 0, offenders.length ? JSON.stringify(offenders) : '');
  });

  suite('T7 — Stage 7 F47 + stack F40–F47');
  for (const sym of F47_STAGE7_EXPORTS) {
    await test(`T7: F47 ${sym}`, async () => {
      assert(readBackend(TRUTH_SOVEREIGN).includes(sym), sym);
    });
  }
  for (const sym of TRUTH_STAGES_F40_F47) {
    await test(`T7: stage regex ${sym}`, async () => {
      assert(readBackend(TRUTH_SOVEREIGN).includes(sym), sym);
    });
  }

  suite('T8 — IOE truth_state determinístico');
  await test('T8: VALID_TRUTH_STATES ingestion', async () => {
    const code = readBackend('services/aioi/aioiEventIngestionService.js');
    assert(code.includes('VALID_TRUTH_STATES'), '');
    assert(code.includes('grounded'), '');
    assert(code.includes('telemetry_only'), '');
  });
  await test('T8b: migration chk_ioe_truth_state', async () => {
    const mig = fs.readFileSync(path.join(BACKEND_ROOT, 'migrations/aioi_ioe_foundation_migration.sql'), 'utf8');
    assert(mig.includes('chk_ioe_truth_state'), '');
  });

  suite('T9 — ORPHAN_EVIDENCE_REFERENCE');
  await test('T9: adapters evidence_refs com type', async () => {
    const issues = scanOrphanEvidenceInAdapters();
    assertEqual(issues.length, 0, issues.length ? JSON.stringify(issues) : '');
  });

  suite('T10 — UNVERIFIED_OPERATIONAL_CLAIM');
  await test('T10: adapters sem KPI inventado', async () => {
    const issues = scanUnverifiedClaimsInAdapters();
    assertEqual(issues.length, 0, issues.length ? JSON.stringify(issues) : '');
  });
  await test('T10b: mesAioiAdapter TC-04', async () => {
    const mes = readBackend('services/aioi/mesAioiAdapter.js');
    assert(/oee:\s*null/.test(mes), 'oee null quando telemetry');
    assert(mes.includes('scores_provisional'), '');
  });

  suite('T11 — NON_DETERMINISTIC_TRUTH_VALIDATION');
  await test('T11: enforcement sem LLM/random claims', async () => {
    const issue = scanNonDeterministicTruthValidation();
    assert(!issue, issue || '');
  });

  suite('T12 — TRUTH_BYPASS_PATH (canais certificados)');
  await test('T12: canais principais com closure', async () => {
    const bypasses = scanCertifiedBypassPaths();
    assertEqual(bypasses.length, 0, bypasses.length ? JSON.stringify(bypasses) : '');
  });

  suite('T13 — Matriz dependências');
  await test('T13: matriz documenta certified paths', async () => {
    assert(matrixDoc.includes('CERTIFIED'), '');
    assert(matrixDoc.includes('enforceTextResponse'), '');
  });

  suite('T14 — Invariantes P8 + runtime');
  const p8 = readP8Flags();
  await test('T14: P8 runtime flags false', async () => {
    assert(p8.length >= 2, 'serviços P8');
    for (const e of p8) {
      assert(e.enabled && e.active, e.file);
    }
  });
  await test('T14b: cognitive_execution_allowed false', async () => {
    const p = path.join(FRONTEND_AIOI, 'assistant-runtime/ExecutiveAssistantRuntimeService.js');
    assert(/cognitive_execution_allowed:\s*false/.test(fs.readFileSync(p, 'utf8')), '');
  });

  suite('T15 — Token certificação');
  await test('T15: token ORG-2 documentado', async () => {
    assert(contractDoc.includes('AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_PASS'), '');
    assert(contractDoc.includes('TRUTH_STAGE7_CERTIFIED'), '');
    assert(contractDoc.includes('TRUTH_EVIDENCE_CHAIN_VALIDATED'), '');
    assert(contractDoc.includes('TRUTH_ENFORCEMENT_READY'), '');
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(` RESULTADO: ${_passed} passed, ${_failed} failed`);
  console.log('═══════════════════════════════════════════════════════════');

  if (_failed === 0) {
    console.log('\nAIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_PASS');
    console.log('TRUTH_STAGE7_CERTIFIED');
    console.log('TRUTH_EVIDENCE_CHAIN_VALIDATED');
    console.log('TRUTH_ENFORCEMENT_READY\n');
    process.exit(0);
  }

  console.error('\nAIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_FAIL\n');
  process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
