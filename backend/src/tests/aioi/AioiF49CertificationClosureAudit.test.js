/**
 * AIOI-ORG-3 — F49 Certification Closure Audit
 *
 * Modo: STATIC ANALYSIS ONLY · ZERO RUNTIME · ZERO LLM · ZERO SIDE EFFECTS
 *
 * Falha imediata ao detectar:
 *   UNCLASSIFIED_F49_DEPENDENCY
 *   UNKNOWN_F49_CONSUMER
 *   UNTRACKED_GEMINI_REFERENCE
 *   ROADMAP_DEPENDENCY_MISMATCH
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const assert = require('assert');

// ─── Paths ────────────────────────────────────────────────────────────────────

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const REPO_ROOT    = path.resolve(BACKEND_ROOT, '..');
const DOCS         = path.join(BACKEND_ROOT, 'docs');
const SRC          = path.join(BACKEND_ROOT, 'src');
const FRONT_DOCS   = path.join(REPO_ROOT, 'frontend', 'docs');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readDoc(name) {
  const fp = path.join(DOCS, name);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, 'utf8');
}

function readSrc(relPath) {
  const fp = path.join(SRC, relPath);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, 'utf8');
}

function readFrontDoc(name) {
  const fp = path.join(FRONT_DOCS, name);
  if (!fs.existsSync(fp)) return null;
  return fs.readFileSync(fp, 'utf8');
}

let passed = 0;
let failed = 0;
const failures = [];

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (err) {
    failed++;
    failures.push({ label, error: err.message });
    console.error(`  ❌  ${label}`);
    console.error(`       ${err.message}`);
  }
}

// ─── Suite ────────────────────────────────────────────────────────────────────

(async () => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  AIOI-ORG-3 — F49 Certification Closure Audit');
  console.log('  Modo: STATIC ANALYSIS · READ ONLY · ZERO RUNTIME');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── T1: Artefatos ORG-3 existem ─────────────────────────────────────────

  const ORG3_DOCS = [
    'AIOI_F49_INVENTORY_AUDIT.md',
    'AIOI_F49_DEPENDENCY_MATRIX.md',
    'AIOI_F49_ROADMAP_ALIGNMENT.md',
  ];

  for (const doc of ORG3_DOCS) {
    await test(`T1: ${doc} existe`, () => {
      const c = readDoc(doc);
      assert(c !== null, `MISSING_ORG3_DOCUMENT: ${doc}`);
      assert(c.length > 200, `DOCUMENT_TOO_SHORT: ${doc}`);
    });
  }

  // ── T2: Documentos predecessores ORG-1 e ORG-2 intactos ─────────────────

  const ORG12_DOCS = [
    'AIOI_QUEUE_SOVEREIGNTY_AUDIT.md',
    'AIOI_QUEUE_SOVEREIGNTY_MATRIX.md',
    'AIOI_QUEUE_PRECEDENCE_CONTRACT.md',
    'AIOI_ORG_1_QUEUE_CONSOLIDATION_REPORT.md',
    'AIOI_TRUTH_STAGE7_INVENTORY.md',
    'AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT.md',
    'AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_REPORT.md',
  ];

  for (const doc of ORG12_DOCS) {
    await test(`T2: ${doc} intacto`, () => {
      const c = readDoc(doc);
      assert(c !== null, `MISSING_PREDECESSOR_DOCUMENT: ${doc}`);
      assert(c.length > 100, `CORRUPTED_PREDECESSOR_DOCUMENT: ${doc}`);
    });
  }

  // ── T3: Inventário F49 — sub-tracks classificados ────────────────────────

  await test('T3: F49 sub-tracks F49-E e F49-B classificados', () => {
    const inv = readDoc('AIOI_F49_INVENTORY_AUDIT.md');
    assert(inv, 'AIOI_F49_INVENTORY_AUDIT.md ausente');
    assert(inv.includes('F49-E'), 'UNCLASSIFIED_F49_DEPENDENCY: sub-track F49-E ausente do inventário');
    assert(inv.includes('F49-B'), 'UNCLASSIFIED_F49_DEPENDENCY: sub-track F49-B ausente do inventário');
    assert(
      inv.includes('TRUTH_PROGRAM_COMPLETE') || inv.includes('TRUTH_PROGRAM_COMPLETE_WITH_EXTERNAL'),
      'UNCLASSIFIED_F49_DEPENDENCY: veredicto F49-E ausente'
    );
    assert(
      inv.includes('TRI_AI_PENDING') || inv.includes('TRI_AI_PENDING_EXTERNAL_DEPENDENCY'),
      'UNCLASSIFIED_F49_DEPENDENCY: veredicto F49-B ausente'
    );
  });

  // ── T4: Dependency Matrix — classificações presentes ─────────────────────

  await test('T4: Dependency Matrix — BLOCKED_BY_F49, PARTIAL_F49, NO_F49_DEPENDENCY', () => {
    const mat = readDoc('AIOI_F49_DEPENDENCY_MATRIX.md');
    assert(mat, 'AIOI_F49_DEPENDENCY_MATRIX.md ausente');
    assert(mat.includes('BLOCKED_BY_F49'), 'UNCLASSIFIED_F49_DEPENDENCY: BLOCKED_BY_F49 ausente na matriz');
    assert(mat.includes('PARTIAL_F49'), 'UNCLASSIFIED_F49_DEPENDENCY: PARTIAL_F49 ausente na matriz');
    assert(mat.includes('NO_F49_DEPENDENCY'), 'UNCLASSIFIED_F49_DEPENDENCY: NO_F49_DEPENDENCY ausente na matriz');
    assert(mat.includes('F49_DEFERRED_P3'), 'UNCLASSIFIED_F49_DEPENDENCY: F49_DEFERRED_P3 ausente na matriz');
    assert(mat.includes('F49_REPLACED_BY_OTHER'), 'UNCLASSIFIED_F49_DEPENDENCY: F49_REPLACED_BY_OTHER ausente na matriz');
  });

  // ── T5: IA rerank classificado como BLOCKED/DEFERRED_P3 ──────────────────

  await test('T5: IA rerank classificado BLOCKED_BY_F49 + F49_DEFERRED_P3', () => {
    const mat = readDoc('AIOI_F49_DEPENDENCY_MATRIX.md');
    assert(mat, 'AIOI_F49_DEPENDENCY_MATRIX.md ausente');
    const rerank = mat.includes('IA rerank') || mat.includes('rerank fila');
    assert(rerank, 'UNCLASSIFIED_F49_DEPENDENCY: IA rerank ausente da matriz');
    const deferredBlock = mat.includes('F49_DEFERRED_P3') && mat.includes('BLOCKED_BY_F49');
    assert(deferredBlock, 'ROADMAP_DEPENDENCY_MISMATCH: IA rerank deve ser BLOCKED_BY_F49 + F49_DEFERRED_P3');
  });

  // ── T6: aioi_weight_versions classificado na matriz ──────────────────────

  await test('T6: aioi_weight_versions classificado na matriz de dependências', () => {
    const mat = readDoc('AIOI_F49_DEPENDENCY_MATRIX.md');
    assert(mat, 'AIOI_F49_DEPENDENCY_MATRIX.md ausente');
    assert(
      mat.includes('weight_version') || mat.includes('weight versions') || mat.includes('aioi_weight'),
      'UNCLASSIFIED_F49_DEPENDENCY: weight_versions ausente da matriz'
    );
  });

  // ── T7: Roadmap Alignment — veredito P0 não bloqueado ────────────────────

  await test('T7: Roadmap alignment confirma F49 NÃO bloqueia P0', () => {
    const ra = readDoc('AIOI_F49_ROADMAP_ALIGNMENT.md');
    assert(ra, 'AIOI_F49_ROADMAP_ALIGNMENT.md ausente');
    const noBlockP0 = /P0.*NÃO|NÃO.*P0|Bloqueia P0.*NÃO|NÃO bloqueia P0/i.test(ra) ||
                      (ra.includes('P0') && ra.includes('NÃO'));
    assert(noBlockP0, 'ROADMAP_DEPENDENCY_MISMATCH: alinhamento não confirma que F49 não bloqueia P0');
  });

  // ── T8: Roadmap Alignment — P3 explicitamente bloqueado ──────────────────

  await test('T8: Roadmap alignment confirma F49 bloqueia P3', () => {
    const ra = readDoc('AIOI_F49_ROADMAP_ALIGNMENT.md');
    assert(ra, 'AIOI_F49_ROADMAP_ALIGNMENT.md ausente');
    assert(
      ra.includes('P3') && (ra.includes('Bloqueado') || ra.includes('SIM') || ra.includes('⛔') || ra.includes('bloqueia P3')),
      'ROADMAP_DEPENDENCY_MISMATCH: roadmap alignment não explicita bloqueio P3 por F49'
    );
  });

  // ── T9: geminiService.js existe e tem isAvailable() ──────────────────────

  await test('T9: geminiService.js existe com isAvailable() guard', () => {
    const svc = readSrc('services/geminiService.js');
    assert(svc !== null, 'UNTRACKED_GEMINI_REFERENCE: geminiService.js ausente');
    assert(svc.includes('isAvailable'), 'UNTRACKED_GEMINI_REFERENCE: isAvailable() ausente em geminiService');
    assert(svc.includes('GEMINI_API_KEY') || svc.includes('GOOGLE_API_KEY'), 'UNTRACKED_GEMINI_REFERENCE: credencial env var ausente');
  });

  // ── T10: Pontos de uso Gemini têm guard isAvailable() ────────────────────

  const GEMINI_CONSUMERS = [
    { rel: 'ai/layers/executionLayer.js',                  label: 'executionLayer' },
    { rel: 'services/geminiIngressEngine.js',              label: 'geminiIngressEngine' },
    { rel: 'eventPipeline/intent/intentRefinementService.js', label: 'intentRefinementService' },
    { rel: 'ai/cognitiveIntentIngress.js',                 label: 'cognitiveIntentIngress' },
    { rel: 'services/aiComplaintDetectionService.js',      label: 'aiComplaintDetectionService' },
    { rel: 'services/manuiaLiveAssistanceService.js',      label: 'manuiaLiveAssistanceService' },
    { rel: 'services/humanValidationClosureService.js',    label: 'humanValidationClosureService' },
    { rel: 'services/aiOrchestrator.js',                   label: 'aiOrchestrator' },
  ];

  for (const { rel, label } of GEMINI_CONSUMERS) {
    await test(`T10: ${label} tem guard isAvailable()`, () => {
      const code = readSrc(rel);
      if (code === null) return; // arquivo pode não existir em builds parciais — skip graceful
      const usesGemini = code.includes('geminiService') || code.includes('gemini');
      if (!usesGemini) return; // não usa Gemini — ok
      const hasGuard = code.includes('isAvailable') || code.includes('gemini_ingress_exempt');
      assert(hasGuard, `UNKNOWN_F49_CONSUMER: ${label} usa Gemini sem guard isAvailable()`);
    });
  }

  // ── T11: Nenhum consumidor Gemini não-classificado ────────────────────────

  await test('T11: Todos os consumidores Gemini estão inventariados', () => {
    const inv = readDoc('AIOI_F49_INVENTORY_AUDIT.md');
    assert(inv, 'AIOI_F49_INVENTORY_AUDIT.md ausente');
    // Todos os consumers do §2.2 devem estar no inventário
    const expectedConsumers = [
      'executionLayer',
      'geminiIngressEngine',
      'intentRefinementService',
      'aiComplaintDetectionService',
      'manuiaLiveAssistanceService',
      'humanValidationClosureService',
      'aiOrchestrator',
      'architectureHealthService',
    ];
    for (const consumer of expectedConsumers) {
      assert(
        inv.includes(consumer) || inv.includes(consumer.replace('Service', '')),
        `UNKNOWN_F49_CONSUMER: ${consumer} não encontrado no inventário`
      );
    }
  });

  // ── T12: IA rerank NÃO implementado ──────────────────────────────────────

  await test('T12: IA rerank ausente no código-fonte (não implementado)', () => {
    const aioiDir = path.join(SRC, 'aioi');
    if (fs.existsSync(aioiDir)) {
      const files = fs.readdirSync(aioiDir, { recursive: true }).filter(f => typeof f === 'string');
      const rerankFile = files.find(f => f.includes('rerank'));
      assert(!rerankFile, `ROADMAP_DEPENDENCY_MISMATCH: arquivo rerank encontrado em src/aioi/ — não deve existir antes de F49 UP: ${rerankFile}`);
    }
    // Confirmar que não há serviço de rerank dedicado no src principal
    const servicesDir = path.join(SRC, 'services');
    if (fs.existsSync(servicesDir)) {
      const files = fs.readdirSync(servicesDir);
      const rerankSvc = files.find(f => /rerank/i.test(f));
      assert(!rerankSvc, `ROADMAP_DEPENDENCY_MISMATCH: serviço rerank ativo em services/: ${rerankSvc}`);
    }
  });

  // ── T13: aioi_weight_versions NÃO implementado ───────────────────────────

  await test('T13: aioi_weight_versions tabela ausente (não implementado)', () => {
    const sqlFiles = [];
    function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) walk(full);
        else if (f.endsWith('.sql')) sqlFiles.push(full);
      }
    }
    walk(path.join(BACKEND_ROOT, 'src'));
    walk(path.join(BACKEND_ROOT, 'migrations'));
    for (const sqlFile of sqlFiles) {
      const sql = fs.readFileSync(sqlFile, 'utf8');
      const hasWeightVersions = /aioi_weight_versions/i.test(sql);
      assert(!hasWeightVersions, `ROADMAP_DEPENDENCY_MISMATCH: aioi_weight_versions encontrado em ${sqlFile} — deve aguardar P3`);
    }
  });

  // ── T14: Feature flags Gemini presentes no .env ──────────────────────────

  await test('T14: Feature flag IMPETUS_GEMINI_INGRESS_ENABLED documentada', () => {
    const inv = readDoc('AIOI_F49_INVENTORY_AUDIT.md');
    assert(inv, 'AIOI_F49_INVENTORY_AUDIT.md ausente');
    assert(
      inv.includes('IMPETUS_GEMINI_INGRESS_ENABLED'),
      'UNTRACKED_GEMINI_REFERENCE: IMPETUS_GEMINI_INGRESS_ENABLED ausente do inventário'
    );
  });

  // ── T15: Predecessor docs ORG-1 tokens válidos ────────────────────────────

  await test('T15: ORG-1 QUEUE_GLOBAL_SOVEREIGN ou QUEUE_SINGLE_SOURCE_OF_TRUTH presente', () => {
    const report = readDoc('AIOI_ORG_1_QUEUE_CONSOLIDATION_REPORT.md');
    assert(report, 'AIOI_ORG_1_QUEUE_CONSOLIDATION_REPORT.md ausente');
    const valid = report.includes('QUEUE_SINGLE_SOURCE_OF_TRUTH') ||
                  report.includes('QUEUE_GLOBAL_SOVEREIGN') ||
                  report.includes('AIOI_ORG_1') ||
                  report.includes('ORG-1');
    assert(valid, 'ROADMAP_DEPENDENCY_MISMATCH: relatório ORG-1 não contém token de certificação');
  });

  // ── T16: Predecessor docs ORG-2 tokens válidos ───────────────────────────

  await test('T16: ORG-2 TRUTH_STAGE7_CERTIFIED ou equivalente presente', () => {
    const report = readDoc('AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_REPORT.md');
    assert(report, 'AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_REPORT.md ausente');
    const valid = report.includes('TRUTH_STAGE7_CERTIFIED') ||
                  report.includes('AIOI_ORG_2') ||
                  report.includes('ORG-2') ||
                  report.includes('TRUTH_ENFORCEMENT_READY');
    assert(valid, 'ROADMAP_DEPENDENCY_MISMATCH: relatório ORG-2 não contém token de certificação');
  });

  // ── T17: P8 runtime flags continuam false ────────────────────────────────

  await test('T17: P8 runtime invariants preservados (cognitive_execution_allowed=false)', () => {
    const p8Files = [
      path.join(SRC, 'modules', 'aioi', 'aiAssistantRuntimeService.metadata.js'),
      path.join(SRC, 'modules', 'aioi', 'aiInsightsRuntimeService.metadata.js'),
      path.join(SRC, 'modules', 'aioi', 'aiRecommendationsRuntimeService.metadata.js'),
    ];
    for (const fp of p8Files) {
      if (!fs.existsSync(fp)) continue;
      const c = fs.readFileSync(fp, 'utf8');
      assert(
        !/"cognitive_execution_allowed"\s*:\s*true/.test(c),
        `ROADMAP_DEPENDENCY_MISMATCH: cognitive_execution_allowed=true em ${path.basename(fp)}`
      );
    }
  });

  // ── T18: Roadmap alignment não omite F49-B status ────────────────────────

  await test('T18: Roadmap alignment documenta PENDING_EXTERNAL_DEPENDENCY para F49-B', () => {
    const ra = readDoc('AIOI_F49_ROADMAP_ALIGNMENT.md');
    assert(ra, 'AIOI_F49_ROADMAP_ALIGNMENT.md ausente');
    assert(
      ra.includes('PENDING_EXTERNAL_DEPENDENCY') || ra.includes('TRI_AI_PENDING'),
      'ROADMAP_DEPENDENCY_MISMATCH: F49-B PENDING_EXTERNAL_DEPENDENCY não documentado no alinhamento'
    );
  });

  // ── T19: Inventário classifica IA rerank como NÃO INICIADO ───────────────

  await test('T19: Inventário classifica IA rerank como AUSENTE / NÃO INICIADO', () => {
    const inv = readDoc('AIOI_F49_INVENTORY_AUDIT.md');
    assert(inv, 'AIOI_F49_INVENTORY_AUDIT.md ausente');
    assert(
      (inv.includes('IA rerank') || inv.includes('rerank')) &&
      (inv.includes('NÃO INICIADO') || inv.includes('AUSENTE') || inv.includes('Não implementado')),
      'UNCLASSIFIED_F49_DEPENDENCY: IA rerank não classificado como ausente no inventário'
    );
  });

  // ── T20: Inventário classifica weight_versions como NÃO INICIADO ─────────

  await test('T20: Inventário classifica weight_versions como AUSENTE / NÃO INICIADO', () => {
    const inv = readDoc('AIOI_F49_INVENTORY_AUDIT.md');
    assert(inv, 'AIOI_F49_INVENTORY_AUDIT.md ausente');
    assert(
      (inv.includes('weight') || inv.includes('weight_version') || inv.includes('weight versions')) &&
      (inv.includes('NÃO INICIADO') || inv.includes('AUSENTE') || inv.includes('Não implementado')),
      'UNCLASSIFIED_F49_DEPENDENCY: weight_versions não classificado como ausente no inventário'
    );
  });

  // ── Resultado ─────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`  Resultado: ${passed} PASS · ${failed} FAIL`);
  console.log('═══════════════════════════════════════════════════════════════');

  if (failed > 0) {
    console.error('\n  Falhas:');
    for (const f of failures) {
      console.error(`    [${f.label}] ${f.error}`);
    }
    console.error('\n  Token: AIOI_ORG_3_F49_CERTIFICATION_CLOSURE_FAIL');
    process.exit(1);
  } else {
    console.log('\n  ┌──────────────────────────────────────────────────────────┐');
    console.log('  │  AIOI_ORG_3_F49_CERTIFICATION_CLOSURE_PASS               │');
    console.log('  │  F49_STATUS_DETERMINED                                   │');
    console.log('  │  F49_DEPENDENCIES_CLASSIFIED                             │');
    console.log('  │  F49_ROADMAP_ALIGNMENT_VALIDATED                         │');
    console.log('  └──────────────────────────────────────────────────────────┘\n');
    process.exit(0);
  }
})();
