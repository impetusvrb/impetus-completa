'use strict';

/**
 * npm run test:chat-cognitive-alignment
 */

const path = require('path');
const fs = require('fs');

const SNAPSHOT_DIR = path.join(__dirname, 'snapshots');
let passed = 0;
let failed = 0;

function assert(c, m, d) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
    if (d) console.log('       ', JSON.stringify(d).slice(0, 400));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function resetPhaseW() {
  delete process.env.IMPETUS_CHAT_ALIGNMENT_RUNTIME;
  delete process.env.IMPETUS_CHAT_GUIDANCE_QUALITY;
  delete process.env.IMPETUS_CHAT_REASONING_STABILIZATION;
  delete process.env.IMPETUS_CHAT_HIERARCHY_ISOLATION;
  delete process.env.IMPETUS_CHAT_LEAKAGE_DETECTION;
  process.env.IMPETUS_CHAT_RUNTIME_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (key.includes('/chatAlignment/') || key.includes('/kpiRollout/')) {
      delete require.cache[key];
    }
  }
  loadFresh('../../src/chatAlignment/chatAlignmentTelemetry').resetChatAlignmentTelemetry();
}

const GOOD_REPLY = {
  reply:
    'Na linha 2, a taxa de NC está em 2.1%. Recomendo verificar o setup antes do próximo turno e priorizar inspeção no posto 3. Meta operacional: manter abaixo de 2.5%.'
};

const GENERIC_REPLY = {
  reply: 'Em geral, a situação está conforme esperado. É importante manter a cautela.'
};

const LEAK_REPLY = {
  reply:
    'O conselho deve rever o EBITDA consolidado enquanto o operador ajusta o OEE na linha 1 para 78% no turno.'
};

function testHierarchyIsolation() {
  console.log('\n=== Hierarchy isolation ===');
  resetPhaseW();
  const guard = loadFresh('../../src/chatAlignment/chatHierarchyIsolationGuard');
  const ok = guard.guardChatHierarchyIsolation({ role: 'coordinator', functional_axis: 'safety' }, {
    reply: 'LTI zero no turno; reforçar EPI na área de carga.'
  });
  assert(ok.isolated === true, 'coordinator ok');
  const bad = guard.guardChatHierarchyIsolation({ role: 'operator', functional_axis: 'operations' }, LEAK_REPLY);
  assert(bad.violations.length >= 1, 'operator leak');
  assert(bad.auto_block === false, 'no auto block');
}

function testGuidanceQuality() {
  console.log('\n=== Operational guidance ===');
  resetPhaseW();
  const eng = loadFresh('../../src/chatAlignment/operationalGuidanceQualityEngine');
  const good = eng.measureOperationalGuidanceQuality({ functional_axis: 'quality' }, GOOD_REPLY);
  const weak = eng.measureOperationalGuidanceQuality({}, GENERIC_REPLY);
  assert(good.guidance_usefulness >= 0.65, 'good guidance');
  assert(weak.generic_detected === true, 'generic detected');
}

function testReasoningQuality() {
  console.log('\n=== Reasoning quality ===');
  resetPhaseW();
  const stab = loadFresh('../../src/chatAlignment/chatSemanticReasoningStabilizer');
  const r = stab.stabilizeChatSemanticReasoning({ functional_axis: 'quality' }, GOOD_REPLY);
  assert(r.reasoning_quality_score >= 0.7, 'reasoning score');
  assert(r.auto_correct === false, 'no auto correct');
}

function testLeakageDetection() {
  console.log('\n=== Leakage detection ===');
  resetPhaseW();
  const det = loadFresh('../../src/chatAlignment/chatLeakageDetector');
  const r = det.detectChatLeakage({ role: 'operator', functional_axis: 'operations' }, LEAK_REPLY);
  assert(r.leakage_detected === true, 'leakage');
}

function testAmbiguity() {
  console.log('\n=== Ambiguity ===');
  resetPhaseW();
  const ana = loadFresh('../../src/chatAlignment/chatAmbiguityAnalyzer');
  const r = ana.analyzeChatAmbiguity({}, { reply: 'Talvez seja a linha 1 ou 2, não tenho certeza.' });
  assert(r.ambiguity_detected === true, 'ambiguity');
}

function testConfidence() {
  console.log('\n=== Runtime confidence ===');
  resetPhaseW();
  const conf = loadFresh('../../src/chatAlignment/chatOperationalConfidenceEngine');
  const r = conf.computeChatOperationalConfidence({ functional_axis: 'quality' }, GOOD_REPLY);
  assert(r.operational_confidence >= 0.65, 'operational confidence');
}

function testNarrativeIntegrity() {
  console.log('\n=== Narrative integrity ===');
  resetPhaseW();
  const nar = loadFresh('../../src/chatAlignment/chatNarrativeIntegrityEngine');
  const r = nar.validateChatNarrativeIntegrity(
    {},
    GOOD_REPLY,
    { summary_excerpt: 'NC em 2.1% na linha 2.' }
  );
  assert(r.narrative_integrity >= 0.7, 'integrity');
}

function testSummaryChatConsistency() {
  console.log('\n=== Summary ↔ chat consistency ===');
  resetPhaseW();
  const nar = loadFresh('../../src/chatAlignment/chatNarrativeIntegrityEngine');
  const r = nar.validateChatNarrativeIntegrity(
    {},
    { reply: 'A taxa reportada é 15% na linha 2, acima do esperado.' },
    { summary_excerpt: 'NC em 2.1% na linha 2.' }
  );
  assert(r.issues.some((i) => i.type === 'summary_chat_numeric_divergence'), 'divergence');
}

function testContextualAlignment() {
  console.log('\n=== Contextual alignment ===');
  resetPhaseW();
  const align = loadFresh('../../src/chatAlignment/chatContextualAlignmentEngine');
  const r = align.alignChatContextually(
    { functional_axis: 'quality', role: 'supervisor' },
    GOOD_REPLY,
    { runtime_truth_state: { canonical_axis: 'quality' } }
  );
  assert(r.alignment_score >= 0.8, 'alignment');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseW();
  const facade = loadFresh('../../src/chatAlignment/chatRuntimeAlignmentFacade');
  const r = facade.enrichChatRuntimeAlignment(
    { id: 1, functional_axis: 'quality', company_id: 1 },
    GOOD_REPLY,
    { force: true, user_message: 'Como está a qualidade na linha 2?' }
  );
  assert(r.chat_alignment?.phase === 'W', 'phase W');
  assert(r.chat_operational_guidance?.guidance_usefulness != null, 'guidance');
  assert(r.chat_runtime_confidence?.conversational_confidence != null, 'confidence');
  assert(r.chat_reasoning_quality?.reasoning_quality_score != null, 'reasoning');
  assert(r.chat_narrative_integrity?.narrative_integrity != null, 'narrative');
  assert(r.chat_leakage_analysis?.leakage_count != null, 'leakage');
}

function testFeatureFlags() {
  console.log('\n=== Feature flags ===');
  resetPhaseW();
  const f = loadFresh('../../src/chatAlignment/config/phaseWFeatureFlags');
  assert(f.isChatAlignmentRuntimeEnabled() === false, 'alignment off');
  assert(f.isChatRuntimeObservabilityEnabled() === true, 'observability on');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseW();
  const facade = loadFresh('../../src/chatAlignment/chatRuntimeAlignmentFacade');
  const personas = [
    ['executive', 'executive', 'Prioridade estratégica: margem e alocação de CAPEX no trimestre.'],
    ['director', 'operations', 'Planta: OEE 82%; foco em gargalos de linha 3 e SLA de expedição.'],
    ['coordinator', 'safety', 'SST: zero LTI; reforçar EPI e drill na área de carga.'],
    ['supervisor', 'quality', 'NC 1.8%; verificar setup linha 3 antes do turno B.'],
    ['operator', 'operations', 'Turno: meta atingida; 2 paradas curtas na estação 4.'],
    ['hr', 'hr', 'Turnover estável; plano de retenção no Q2 em curso.'],
    ['financial', 'financial', 'Margem bruta alinhada ao orçamento; variância de custo sob controlo.'],
    ['quality', 'quality', 'Inspeção: 97% aprovação no lote atual; atenção ao posto 2.'],
    ['environmental', 'environmental', 'Emissões dentro do limite; auditoria ESG na próxima semana.'],
    ['safety', 'safety', 'TRIR controlado; agendar simulacro de evacuação.'],
    ['logistics', 'logistics', 'OTIF 93%; reforço na rota sul recomendado.'],
    ['engineering', 'operations', 'MTBF melhorou após PM na linha 1; monitorar vibração.']
  ];
  for (const [file, axis, text] of personas) {
    const r = facade.enrichChatRuntimeAlignment(
      { id: 1, functional_axis: axis, role: file },
      { reply: text },
      { force: true, user_message: `Pergunta ${axis}` }
    );
    const snap = {
      chat_alignment: r.chat_alignment,
      chat_operational_guidance: r.chat_operational_guidance,
      chat_runtime_confidence: r.chat_runtime_confidence,
      chat_reasoning_quality: r.chat_reasoning_quality
    };
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(snap, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Chat Cognitive Alignment — Phase W');
  testHierarchyIsolation();
  testGuidanceQuality();
  testReasoningQuality();
  testLeakageDetection();
  testAmbiguity();
  testConfidence();
  testNarrativeIntegrity();
  testSummaryChatConsistency();
  testContextualAlignment();
  testFacadeObservability();
  testFeatureFlags();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
