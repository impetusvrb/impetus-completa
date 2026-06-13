'use strict';

/**
 * AIOI-ORG-1 — Queue CEO Consolidation & Sovereignty Resolution
 * Auditoria estática de governança de fila executiva.
 *
 * Objetivos:
 *   - Única autoridade documentada (AIOI Queue)
 *   - Ausência de dual-authority / dual-writer / múltiplos soberanos
 *   - Contrato Q-01–Q-05 presente
 *   - Invariantes P8 runtime preservados
 *
 * Executar:
 *   node src/tests/aioi/AioiQueueSovereigntyAudit.test.js
 *
 * Token alvo: AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS
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

const ORG1_DOCS = [
  'AIOI_QUEUE_SOVEREIGNTY_AUDIT.md',
  'AIOI_QUEUE_SOVEREIGNTY_MATRIX.md',
  'AIOI_QUEUE_PRECEDENCE_CONTRACT.md',
];

const QUEUE_PRODUCERS = [
  {
    id: 'F47_PACK',
    file: 'services/operationalPrioritizationService.js',
    symbols: ['buildOperationalPriorityPack', 'buildOperationalPriorityQueue'],
    classification: 'LEGACY_SOURCE',
  },
  {
    id: 'F47_LIVE_FEED',
    file: 'services/operationalPrioritizationService.js',
    symbols: ['buildLiveFeedPriorities'],
    classification: 'LEGACY_SOURCE',
  },
  {
    id: 'AIOI_EXECUTIVE_QUEUE',
    file: null,
    symbols: ['aioi_executive_queue_snapshot'],
    classification: 'AUTHORITATIVE',
    docOnly: true,
  },
  {
    id: 'PLC_AIOI_ADAPTER',
    file: 'services/aioi/plcAioiAdapter.js',
    symbols: ['priority_pack_f47'],
    classification: 'MIRROR_SOURCE',
  },
];

const DERIVED_READ_MODELS = [
  'services/aioi/aioiExecutivePriorityMatrixService.js',
  'services/aioi/aioiBottleneckAnalysisService.js',
  'services/aioi/aioiExecutiveReadModelService.js',
  'services/aioi/aioiExecutiveCommandReadModelService.js',
];

const P8_RUNTIME_SERVICES = [
  'cognitive-runtime/ExecutiveCognitiveRuntimeService.js',
  'runtime-governance/ExecutiveRuntimeGovernanceService.js',
  'runtime-authorization/ExecutiveRuntimeAuthorizationService.js',
  'runtime-audit/ExecutiveRuntimeAuditService.js',
  'insights-runtime/ExecutiveInsightsRuntimeService.js',
  'recommendations-runtime/ExecutiveRecommendationsRuntimeService.js',
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

function countMatches(text, pattern) {
  const m = text.match(pattern);
  return m ? m.length : 0;
}

function extractParteStatuses(contractText) {
  const section = contractText.split('## 2. Partes Contratantes')[1] || '';
  return section
    .split('\n')
    .filter((l) => l.startsWith('| **'))
    .map((l) => {
      const status = (l.match(/\*\*(LEGACY|AUTHORITATIVE|SECONDARY)\*\*/i) || [])[1];
      const name = (l.match(/\*\*([^*]+)\*\*/) || [])[1];
      return { name: name ? name.trim() : '', status: status ? status.toUpperCase() : '' };
    })
    .filter((p) => p.status);
}

function detectDualQueueAuthority(contractText, matrixText) {
  const parties = extractParteStatuses(contractText);
  const authParties = parties.filter((p) => p.status === 'AUTHORITATIVE');
  const legacyParties = parties.filter((p) => p.status === 'LEGACY');

  if (authParties.length !== 1) {
    throw new Error(`DUAL_QUEUE_AUTHORITY — esperada 1 parte AUTHORITATIVE, encontradas ${authParties.length}`);
  }
  if (!authParties[0].name.includes('AIOI')) {
    throw new Error('DUAL_QUEUE_AUTHORITY — autoridade deve ser AIOI Queue');
  }
  if (legacyParties.length !== 1 || !legacyParties[0].name.includes('F47')) {
    throw new Error('DUAL_QUEUE_AUTHORITY — F47 deve ser única parte LEGACY no contrato');
  }

  const queueSovereignRows = matrixText
    .split('\n')
    .filter((l) => l.includes('AIOI Executive Queue') && l.includes('AUTHORITATIVE'));
  if (queueSovereignRows.length !== 1) {
    throw new Error('MULTIPLE_QUEUE_SOVEREIGNS — AIOI Executive Queue deve ter exatamente 1 linha AUTHORITATIVE na matriz');
  }

  const sovereignCount = countMatches(matrixText, /QUEUE_GLOBAL_SOVEREIGN\s*=\s*AIOI_EXECUTIVE_QUEUE/g);
  if (sovereignCount !== 1) {
    throw new Error('MULTIPLE_QUEUE_SOVEREIGNS — registro QUEUE_GLOBAL_SOVEREIGN inválido ou ausente');
  }

  const matrixLegacy = countMatches(matrixText, /LEGACY_SOURCE/gi);
  if (matrixLegacy < 2) {
    throw new Error('MULTIPLE_QUEUE_SOVEREIGNS — classificação LEGACY_SOURCE insuficiente para F47');
  }

  if (!matrixText.includes('F47 e AIOI ambos `AUTHORITATIVE`')) {
    throw new Error('Matriz deve documentar anti-padrão AP-04 dual AUTHORITY');
  }

  return { authParties, legacyParties, matrixLegacy };
}

function scanUnregisteredCeoQueueWriters() {
  const servicesDir = path.join(BACKEND_ROOT, 'src/services');
  const offenders = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.js')) continue;

      const rel = path.relative(path.join(BACKEND_ROOT, 'src'), full);
      const code = fs.readFileSync(full, 'utf8');

      const isDerived = DERIVED_READ_MODELS.some((d) => rel.replace(/\\/g, '/') === d);
      const isF47 = rel.includes('operationalPrioritizationService');
      const isAdapter = rel.includes('plcAioiAdapter');
      const isPulse = rel.includes('cognitivePulseService');
      const isDashboard = rel.includes('routes/dashboard');
      const isRetrieval = rel.includes('dataRetrievalService');

      const claimsAuthoritative =
        /executive[_\s-]?queue.*authoritative|authoritative.*executive[_\s-]?queue|QUEUE_GLOBAL_SOVEREIGN/i.test(code);
      const buildsCeoQueue =
        /buildExecutiveQueue|buildCeoQueue|aioiExecutiveQueueService|createExecutiveQueue/i.test(code);

      if (buildsCeoQueue && !isDerived) {
        offenders.push({ file: rel, reason: 'UNREGISTERED_QUEUE_WRITER' });
      }

      if (claimsAuthoritative && !isDerived && !isAdapter) {
        offenders.push({ file: rel, reason: 'UNDECLARED_QUEUE_AUTHORITY' });
      }

      if (isDerived || isF47 || isAdapter || isPulse || isDashboard || isRetrieval) continue;
    }
  }

  walk(servicesDir);
  return offenders;
}

function readP8MetadataFlags() {
  const flags = [];
  for (const rel of P8_RUNTIME_SERVICES) {
    const p = path.join(FRONTEND_AIOI, rel);
    if (!fs.existsSync(p)) continue;
    const code = fs.readFileSync(p, 'utf8');
    const enabledFalse = /runtime_enabled:\s*false/.test(code);
    const activeFalse = /runtime_active:\s*false/.test(code);
    const authFalse = /runtime_authorized:\s*false/.test(code);
    const cogFalse = /cognitive_execution_allowed:\s*false/.test(code);
    flags.push({ file: rel, enabledFalse, activeFalse, authFalse, cogFalse });
  }
  return flags;
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(' AIOI-ORG-1 — Queue Sovereignty Static Audit');
  console.log('═══════════════════════════════════════════════════════════');

  suite('T1 — Documentos de governança base');
  for (const doc of GOVERNANCE_DOCS) {
    await test(`T1: ${doc} existe`, async () => {
      assert(fs.existsSync(path.join(DOCS, doc)), `Ausente: ${doc}`);
    });
  }

  suite('T2 — Documentos ORG-1');
  for (const doc of ORG1_DOCS) {
    await test(`T2: ${doc} existe`, async () => {
      assert(fs.existsSync(path.join(DOCS, doc)), `Ausente: ${doc}`);
    });
  }

  const auditDoc = readDoc('AIOI_QUEUE_SOVEREIGNTY_AUDIT.md');
  const matrixDoc = readDoc('AIOI_QUEUE_SOVEREIGNTY_MATRIX.md');
  const contractDoc = readDoc('AIOI_QUEUE_PRECEDENCE_CONTRACT.md');
  const antiDupDoc = readDoc('AIOI_ANTI_DUPLICATION_POLICY.md');

  suite('T3 — Inventário completo');
  await test('T3: inventário contém F47 e AIOI Queue', async () => {
    assert(auditDoc.includes('operationalPrioritizationService'), 'F47 ausente no inventário');
    assert(auditDoc.includes('aioi_executive_queue_snapshot'), 'AIOI queue ausente no inventário');
    assert(auditDoc.includes('## 2. Inventário'), 'Secção inventário ausente');
  });

  await test('T3b: inventário lista produtor/consumidor/soberano', async () => {
    assert(auditDoc.includes('Produtor'), 'Coluna Produtor ausente');
    assert(auditDoc.includes('Consumidor'), 'Coluna Consumidor ausente');
    assert(auditDoc.includes('Soberano Atual'), 'Coluna Soberano ausente');
  });

  suite('T4 — Matriz de soberania');
  await test('T4: classificações canónicas presentes', async () => {
    for (const c of ['PRIMARY_SOURCE', 'LEGACY_SOURCE', 'AUTHORITATIVE', 'DERIVED_SOURCE', 'MIRROR_SOURCE']) {
      assert(matrixDoc.includes(c), `Classificação ${c} ausente`);
    }
  });

  await test('T4b: registro soberania única AIOI', async () => {
    assert(matrixDoc.includes('QUEUE_GLOBAL_SOVEREIGN = AIOI_EXECUTIVE_QUEUE'), 'Registro soberania ausente');
    assert(matrixDoc.includes('Contagem de soberanos fila CEO:** **1**'), 'Contagem soberanos != 1');
  });

  suite('T5 — Contrato de precedência Q-01–Q-05');
  for (let i = 1; i <= 5; i++) {
    await test(`T5: Q-0${i} no contrato ORG-1`, async () => {
      assert(contractDoc.includes(`Q-0${i}`), `Q-0${i} ausente no contrato ORG-1`);
      assert(antiDupDoc.includes(`Q-0${i}`), `Q-0${i} ausente na política anti-duplicação`);
    });
  }

  await test('T5b: F47 = LEGACY, AIOI = AUTHORITATIVE', async () => {
    assert(/F47[\s\S]*LEGACY/i.test(contractDoc), 'F47 não LEGACY');
    assert(/AIOI[\s\S]*AUTHORITATIVE/i.test(contractDoc), 'AIOI não AUTHORITATIVE');
    assert(contractDoc.includes('QUEUE_SINGLE_SOURCE_OF_TRUTH_ESTABLISHED'), 'Classificação final ausente');
  });

  suite('T6 — Detecção dual-authority (FATAL)');
  await test('T6: ausência DUAL_QUEUE_AUTHORITY', async () => {
    const result = detectDualQueueAuthority(contractDoc, matrixDoc);
    assertEqual(result.authParties.length, 1, 'Uma única parte AUTHORITATIVE');
    assert(result.legacyParties[0].name.includes('F47'), 'F47 deve ser LEGACY');
  });

  await test('T6b: ausência MULTIPLE_QUEUE_SOVEREIGNS', async () => {
    const parties = extractParteStatuses(contractDoc);
    const authParties = parties.filter((p) => p.status === 'AUTHORITATIVE');
    assertEqual(authParties.length, 1, 'Deve haver exatamente 1 parte AUTHORITATIVE no contrato');
    assert(authParties[0].name.includes('AIOI'), 'Autoridade deve ser AIOI Queue');
    assert(matrixDoc.includes('**Contagem de soberanos fila CEO:** **1**'), 'Matriz deve declarar 1 soberano');
  });

  suite('T7 — Produtores registados');
  for (const producer of QUEUE_PRODUCERS) {
    await test(`T7: ${producer.id} classificado`, async () => {
      assert(matrixDoc.includes(producer.classification), `${producer.classification} ausente na matriz`);
      if (producer.file) {
        const code = readBackend(producer.file);
        for (const sym of producer.symbols) {
          assert(code.includes(sym), `${sym} ausente em ${producer.file}`);
        }
      } else {
        assert(auditDoc.includes(producer.symbols[0]), `${producer.id} doc-only ausente`);
      }
    });
  }

  suite('T8 — Read models não são fila CEO');
  for (const rel of DERIVED_READ_MODELS) {
    await test(`T8: ${path.basename(rel)} = DERIVED`, async () => {
      assert(matrixDoc.includes(path.basename(rel).replace('.js', '')) || matrixDoc.includes('DERIVED_SOURCE'),
        'DERIVED na matriz');
      const code = readBackend(rel);
      assert(!/buildExecutiveQueue|buildCeoQueue|aioiExecutiveQueueService/.test(code),
        `${rel} parece writer de fila CEO`);
    });
  }

  suite('T9 — API /queue e flags');
  await test('T9: GET /api/aioi/queue ausente (esperado S0)', async () => {
    const routes = readBackend('routes/aioi/aioiCockpitRoutes.js');
    assert(!routes.includes("router.get('/queue'"), '/queue não deve existir ainda em cockpit routes');
    assert(auditDoc.includes('AUSENTE'), 'Inventário deve documentar ausência');
  });

  await test('T9b: IMPETUS_AIOI flags não hardcoded true no backend', async () => {
    const srcDir = path.join(BACKEND_ROOT, 'src');
    let foundTrue = false;
    function walk(d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) { walk(f); continue; }
        if (!e.name.endsWith('.js')) continue;
        const c = fs.readFileSync(f, 'utf8');
        if (/IMPETUS_AIOI_QUEUE_ACTIVE\s*=\s*true|IMPETUS_AIOI_ENABLED\s*=\s*true/.test(c)) {
          foundTrue = true;
        }
      }
    }
    walk(srcDir);
    assert(!foundTrue, 'Flags AIOI não devem estar true no código');
  });

  suite('T10 — Scan writers não registados');
  await test('T10: sem aioiExecutiveQueueService paralelo', async () => {
    const offenders = scanUnregisteredCeoQueueWriters();
    assertEqual(offenders.length, 0,
      offenders.length ? `Offenders: ${JSON.stringify(offenders)}` : 'Scan limpo');
  });

  suite('T11 — F47 preservado (additive only)');
  await test('T11: operationalPrioritizationService exports intactos', async () => {
    const code = readBackend('services/operationalPrioritizationService.js');
    for (const fn of ['buildOperationalPriorityQueue', 'buildOperationalPriorityPack', 'buildLiveFeedPriorities', 'computePriorityScore']) {
      assert(code.includes(fn), `Export ${fn} ausente`);
    }
  });

  await test('T11b: plcAioiAdapter reutiliza F47 (P-01)', async () => {
    const code = readBackend('services/aioi/plcAioiAdapter.js');
    assert(code.includes('operationalPrioritizationService'), 'Adapter deve importar F47');
    assert(code.includes('priority_pack_f47'), 'evidence F47 ausente');
  });

  suite('T12 — Invariantes P8 runtime (frontend)');
  const p8Flags = readP8MetadataFlags();
  await test('T12: serviços P8 runtime encontrados', async () => {
    assert(p8Flags.length >= 5, `Esperado >=5 serviços P8, got ${p8Flags.length}`);
  });

  for (const entry of p8Flags) {
    await test(`T12: ${path.basename(entry.file)} flags false`, async () => {
      assert(entry.enabledFalse, 'runtime_enabled deve ser false');
      assert(entry.activeFalse, 'runtime_active deve ser false');
    });
  }

  await test('T12b: P8.2 runtime_authorized false', async () => {
    const p = path.join(FRONTEND_AIOI, 'runtime-authorization/ExecutiveRuntimeAuthorizationService.js');
    if (fs.existsSync(p)) {
      const code = fs.readFileSync(p, 'utf8');
      assert(/runtime_authorized:\s*false/.test(code), 'runtime_authorized deve ser false');
    }
  });

  await test('T12c: cognitive_execution_allowed false (P8 runtime stack)', async () => {
    const targets = [
      'assistant-runtime/ExecutiveAssistantRuntimeService.js',
      'insights-runtime/ExecutiveInsightsRuntimeService.js',
      'recommendations-runtime/ExecutiveRecommendationsRuntimeService.js',
    ];
    let checked = 0;
    for (const rel of targets) {
      const p = path.join(FRONTEND_AIOI, rel);
      if (!fs.existsSync(p)) continue;
      checked++;
      const code = fs.readFileSync(p, 'utf8');
      assert(/cognitive_execution_allowed:\s*false/.test(code), `${rel}: cognitive_execution_allowed deve ser false`);
    }
    assert(checked >= 1, 'Nenhum serviço P8 com cognitive_execution_allowed encontrado');
  });

  suite('T13 — Token e certificação ORG-1');
  await test('T13: token AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS documentado', async () => {
    assert(contractDoc.includes('AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS'), 'Token ausente no contrato');
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(` RESULTADO: ${_passed} passed, ${_failed} failed`);
  console.log('═══════════════════════════════════════════════════════════');

  if (_failed === 0) {
    console.log('\nAIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS');
    console.log('QUEUE_SINGLE_SOURCE_OF_TRUTH_ESTABLISHED\n');
    process.exit(0);
  }

  console.error('\nAIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_FAIL\n');
  process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
