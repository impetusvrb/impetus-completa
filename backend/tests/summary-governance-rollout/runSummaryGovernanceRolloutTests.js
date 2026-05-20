'use strict';

/**
 * npm run test:summary-governance-rollout
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

function resetPhaseV() {
  delete process.env.IMPETUS_SUMMARY_GOVERNANCE_ROLLOUT;
  delete process.env.IMPETUS_SUMMARY_SEMANTIC_STABILIZATION;
  delete process.env.IMPETUS_SUMMARY_RELEVANCE_ENGINE;
  delete process.env.IMPETUS_SUMMARY_DELIVERY_PRECISION;
  delete process.env.IMPETUS_SUMMARY_GOVERNANCE;
  process.env.IMPETUS_SUMMARY_GOVERNANCE_OBSERVABILITY = 'on';
  for (const key of Object.keys(require.cache)) {
    if (
      key.includes('/summaryRollout/') ||
      key.includes('/kpiRollout/') ||
      key.includes('/controlledActivation/')
    ) {
      delete require.cache[key];
    }
  }
  loadFresh('../../src/summaryRollout/summaryGovernanceTelemetry').resetSummaryGovernanceTelemetry();
  loadFresh('../../src/summaryRollout/tenantSummaryIsolation').clearTenantSummaryState();
  loadFresh('../../src/summaryRollout/summaryRuntimeCoordinator').resetRolloutMemory();
  loadFresh('../../src/controlledActivation/channelActivationGovernance').resetChannelActivation();
}

const GOOD_SUMMARY = {
  summary:
    'Resumo operacional de qualidade: taxa de NC em 2.1% na linha 2. Recomenda-se verificação do setup antes do próximo turno.'
};

const LEAK_SUMMARY = {
  summary:
    'A diretoria deve avaliar o EBITDA consolidado enquanto o operador monitora o turno na linha 1 com OEE em 78%.',
  executive_only: true
};

function testHierarchyValidation() {
  console.log('\n=== Hierarchy summary validation ===');
  resetPhaseV();
  const val = loadFresh('../../src/summaryRollout/hierarchySummaryValidator');
  const ok = val.validateHierarchySummary({ role: 'coordinator', functional_axis: 'safety' }, {
    summary: 'Indicadores SST do turno: zero LTI com foco em EPI.'
  });
  assert(ok.valid === true, 'coordinator valid');
  const bad = val.validateHierarchySummary({ role: 'operator' }, LEAK_SUMMARY);
  assert(bad.valid === false, 'operator executive leak');
}

function testSemanticAlignment() {
  console.log('\n=== Summary semantic alignment ===');
  resetPhaseV();
  const eng = loadFresh('../../src/summaryRollout/summarySemanticStabilizer');
  const r = eng.stabilizeSummarySemantics({ functional_axis: 'quality' }, GOOD_SUMMARY);
  assert(r.stable === true, 'stable summary');
  assert(r.auto_correct === false, 'no auto correct');
}

function testNarrativeIntegrity() {
  console.log('\n=== Narrative integrity ===');
  resetPhaseV();
  const nar = loadFresh('../../src/summaryRollout/narrativeAlignmentEngine');
  const r = nar.alignNarrative({ functional_axis: 'quality' }, GOOD_SUMMARY);
  assert(r.narrative_integrity >= 0.7, 'integrity');
}

function testLeakageDetection() {
  console.log('\n=== Summary leakage detection ===');
  resetPhaseV();
  const det = loadFresh('../../src/summaryRollout/summaryLeakageDetector');
  const r = det.detectSummaryLeakage({ role: 'operator', functional_axis: 'operations' }, LEAK_SUMMARY);
  assert(r.leakage_detected === true, 'leakage');
}

function testUnderdelivery() {
  console.log('\n=== Summary underdelivery ===');
  resetPhaseV();
  const det = loadFresh('../../src/summaryRollout/summaryUnderdeliveryDetector');
  const r = det.detectSummaryUnderdelivery({}, { summary: 'ok' });
  assert(r.underdelivery === true, 'underdelivery short');
}

function testAuthorityConflicts() {
  console.log('\n=== Summary authority conflicts ===');
  resetPhaseV();
  const det = loadFresh('../../src/summaryRollout/summaryAuthorityConflictDetector');
  const r = det.detectSummaryAuthorityConflicts(
    { scope_level: 1 },
    { requires_authority: 5, contextual_narrative_conflict: true }
  );
  assert(r.conflict_detected === true, 'conflict');
}

function testOperationalRelevance() {
  console.log('\n=== Operational relevance ===');
  resetPhaseV();
  const rel = loadFresh('../../src/summaryRollout/operationalSummaryRelevance');
  const r = rel.measureOperationalSummaryRelevance({ functional_axis: 'logistics' }, {
    summary:
      'Logística: OTIF em 94% no hub regional. Recomenda-se reforço de expedição na rota sul e verificação de SLA com o cliente chave antes do fecho semanal.'
  });
  assert(r.operational_relevance >= 0.65, 'relevance');
}

function testContextualUsefulness() {
  console.log('\n=== Contextual usefulness ===');
  resetPhaseV();
  const ana = loadFresh('../../src/summaryRollout/summaryUsefulnessAnalyzer');
  const r = ana.analyzeSummaryUsefulness(GOOD_SUMMARY);
  assert(r.summary_usefulness >= 0.6, 'usefulness');
}

function testNarrativeConsistency() {
  console.log('\n=== Narrative consistency ===');
  resetPhaseV();
  const val = loadFresh('../../src/summaryRollout/contextualNarrativeValidator');
  const r = val.validateContextualNarrative({}, { summary: 'Talvez a linha 1 ou 2 tenha problema?' });
  assert(r.issues.some((i) => i.type === 'contextual_ambiguity'), 'ambiguity');
}

function testTenantSafeRollout() {
  console.log('\n=== Tenant-safe rollout ===');
  resetPhaseV();
  const iso = loadFresh('../../src/summaryRollout/tenantSummaryIsolation');
  iso.setTenantSummaryRolloutActive('t-v', true, { approved_by: 'ops' });
  const other = iso.getTenantSummaryState('t-other');
  assert(other.rollout_active === false, 'tenant isolated');
}

function testRolloutSafety() {
  console.log('\n=== Rollout safety ===');
  resetPhaseV();
  const eng = loadFresh('../../src/summaryRollout/summaryGovernanceActivationEngine');
  const prep = eng.activateSummaryGovernance(
    { company_id: 1, functional_axis: 'quality' },
    GOOD_SUMMARY,
    { skip_kpi_prerequisite: true }
  );
  assert(prep.prepared === true && prep.global_activation === false, 'prepare only');
}

function testActivationReadiness() {
  console.log('\n=== Activation readiness threshold ===');
  resetPhaseV();
  const eng = loadFresh('../../src/summaryRollout/summaryGovernanceActivationEngine');
  const low = eng.activateSummaryGovernance(
    { functional_axis: 'general' },
    { summary: '' },
    { execute: true, approved_by: 'x', readiness_threshold: 0.99, skip_kpi_prerequisite: true }
  );
  assert(low.activated === false && low.reason === 'readiness_below_threshold', 'blocks low readiness');
}

function testFacadeObservability() {
  console.log('\n=== Facade observability ===');
  resetPhaseV();
  const facade = loadFresh('../../src/summaryRollout/summaryRolloutFacade');
  const r = facade.enrichSummaryGovernanceRollout(
    { id: 1, functional_axis: 'quality', company_id: 1 },
    GOOD_SUMMARY,
    { force: true }
  );
  assert(r.summary_governance?.phase === 'V', 'phase V');
  assert(r.summary_relevance?.operational_relevance != null, 'relevance');
  assert(r.summary_semantic_alignment?.stable != null, 'semantic');
  assert(r.summary_narrative_integrity?.narrative_integrity != null, 'narrative');
  assert(r.summary_delivery_precision?.delivery_precision_score != null, 'precision');
}

function testFeatureFlags() {
  console.log('\n=== Feature flags ===');
  resetPhaseV();
  const f = loadFresh('../../src/summaryRollout/config/phaseVFeatureFlags');
  assert(f.isSummaryGovernanceRolloutEnabled() === false, 'rollout off');
  assert(f.isSummaryGovernanceObservabilityEnabled() === true, 'observability on');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  resetPhaseV();
  const facade = loadFresh('../../src/summaryRollout/summaryRolloutFacade');
  const personas = [
    ['executive', 'executive', 'Resumo estratégico: margem consolidada e prioridades do conselho.'],
    ['director', 'operations', 'Visão da planta: OEE 82% com foco em gargalos de linha.'],
    ['coordinator', 'safety', 'SST: zero LTI no turno; reforçar EPI na área de carga.'],
    ['supervisor', 'quality', 'Qualidade: NC em 1.8%; verificar setup linha 3.'],
    ['operator', 'operations', 'Turno: meta de produção atingida com 2 paradas curtas.'],
    ['hr', 'hr', 'People: turnover estável; ações de retenção no Q2.'],
    ['quality', 'quality', 'Inspeção: taxa de aprovação 97% no lote atual.'],
    ['environmental', 'environmental', 'Ambiental: emissões dentro do limite regulatório.'],
    ['safety', 'safety', 'Segurança: TRIR controlado; drill de evacuação agendado.'],
    ['financial', 'financial', 'Financeiro: margem bruta alinhada ao orçamento mensal.'],
    ['logistics', 'logistics', 'Logística: OTIF 93%; atenção ao hub sul.'],
    ['engineering', 'operations', 'Engenharia: MTBF melhorou após manutenção preventiva.']
  ];
  for (const [file, axis, text] of personas) {
    const r = facade.enrichSummaryGovernanceRollout(
      { id: 1, functional_axis: axis, role: file },
      { summary: text },
      { force: true }
    );
    const snap = {
      summary_governance: r.summary_governance,
      summary_relevance: r.summary_relevance,
      summary_semantic_alignment: r.summary_semantic_alignment,
      summary_narrative_integrity: r.summary_narrative_integrity,
      summary_delivery_precision: r.summary_delivery_precision
    };
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(snap, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Summary Governance Rollout — Phase V');
  testHierarchyValidation();
  testSemanticAlignment();
  testNarrativeIntegrity();
  testLeakageDetection();
  testUnderdelivery();
  testAuthorityConflicts();
  testOperationalRelevance();
  testContextualUsefulness();
  testNarrativeConsistency();
  testTenantSafeRollout();
  testRolloutSafety();
  testActivationReadiness();
  testFacadeObservability();
  testFeatureFlags();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
