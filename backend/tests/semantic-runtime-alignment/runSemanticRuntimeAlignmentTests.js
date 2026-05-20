'use strict';

/**
 * npm run test:semantic-runtime-alignment
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
    if (d) console.log('       ', JSON.stringify(d).slice(0, 300));
  }
}

function loadFresh(p) {
  const r = require.resolve(p);
  delete require.cache[r];
  return require(p);
}

function testPublicationLeakage() {
  console.log('\n=== Publication leakage ===');
  process.env.IMPETUS_SEMANTIC_PUBLICATION_GOVERNANCE = 'on';
  const resolver = loadFresh('../../src/semanticGovernance/semanticModulePublicationResolver');
  const r = resolver.resolveSemanticPublication(
    { id: 1, functional_axis: 'safety' },
    { visible_modules: ['sst', 'quality', 'dashboard'], functional_axis: 'safety' }
  );
  assert(!r.visible_modules.includes('quality'), 'quality blocked on safety axis', r);
  assert(r.enforcement_active === true, 'enforcement on');
}

function testCrossDomainExposure() {
  console.log('\n=== Cross-domain exposure ===');
  const iso = loadFresh('../../src/semanticGovernance/semanticPublicationIsolation');
  const r = iso.isolatePublication(['environment_intelligence', 'sst'], { functional_axis: 'safety' });
  assert(r.modules.includes('sst'), 'sst allowed');
  assert(r.blocked.some((b) => b.module === 'environment_intelligence'), 'env blocked on safety');
}

function testOrphanPipelines() {
  console.log('\n=== Orphan pipelines ===');
  process.env.IMPETUS_ORPHAN_PIPELINE_DETECTION = 'on';
  const det = loadFresh('../../src/runtimeAlignment/orphanPipelineDetector');
  const r = det.detectOrphanPipelines({ force: true });
  assert(r.enabled === true, 'detection enabled');
  assert(r.orphan_count >= 0, 'orphan count');
}

function testGovernedCards() {
  console.log('\n=== Governed cards ===');
  process.env.IMPETUS_GOVERNANCE_CARD_ORCHESTRATION = 'on';
  const comp = loadFresh('../../src/dashboardGovernance/contextualCardCompositionEngine');
  const r = comp.composeCards(
    [{ type: 'executive', module_id: 'executive' }, { type: 'kpi' }],
    { functional_axis: 'safety' }
  );
  assert(r.auto_removed === false, 'no auto remove');
  assert(typeof r.alignment_score === 'number', 'alignment score');
}

function testFallbackSanitization() {
  console.log('\n=== Fallback sanitization ===');
  process.env.IMPETUS_CONTEXTUAL_FALLBACK_SANITIZATION = 'on';
  const san = loadFresh('../../src/runtimeAlignment/contextualFallbackSanitizer');
  const r = san.sanitizeFallback({ corporate_aggregate: true, data: 1 });
  assert(r.flags.corporate_fallback_stripped === true, 'corporate stripped');
  assert(r.enforcement_active === true, 'sanitizer active');
}

function testContextualConsistency() {
  console.log('\n=== Contextual consistency ===');
  const kpi = loadFresh('../../src/runtimeAlignment/governedKpiAlignment');
  const empty = kpi.alignKpiResponse([], { functional_axis: 'safety' });
  assert(empty.contextual_insufficiency === true, 'insufficiency flagged');
  assert(empty.explanation?.do_not_invent === true, 'no invent');
}

function testSemanticIntegrity() {
  console.log('\n=== Semantic integrity ===');
  const resolver = loadFresh('../../src/semanticGovernance/semanticModulePublicationResolver');
  const r = resolver.resolveSemanticPublication(
    { id: 1 },
    { visible_modules: ['dashboard'], functional_axis: 'quality', force_observe: true }
  );
  assert(r.semantic_integrity_score >= 0 && r.semantic_integrity_score <= 1, 'integrity score range');
}

function testLegacyBuilderDetection() {
  console.log('\n=== Legacy builder detection ===');
  const enr = loadFresh('../../src/runtimeAlignment/orphanEnricherDetector');
  const r = enr.detectOrphanEnrichers({ force: true });
  assert(r.legacy_enrichers.length >= 1, 'legacy enrichers found', r.legacy_enrichers);
}

function testShadowOnlyMode() {
  console.log('\n=== Shadow-only mode ===');
  process.env.IMPETUS_SEMANTIC_PUBLICATION_GOVERNANCE = 'off';
  process.env.IMPETUS_SEMANTIC_RUNTIME_OBSERVABILITY = 'on';
  delete require.cache[require.resolve('../../src/semanticGovernance/config/phaseKFeatureFlags')];
  const resolver = loadFresh('../../src/semanticGovernance/semanticModulePublicationResolver');
  const r = resolver.resolveSemanticPublication(
    { id: 1 },
    { visible_modules: ['quality', 'sst'], functional_axis: 'safety' }
  );
  assert(r.shadow_only === true, 'shadow only');
  assert(r.visible_modules.includes('quality'), 'modules not removed in shadow', r);
}

function testAlignmentReport() {
  console.log('\n=== Alignment report ===');
  const facade = loadFresh('../../src/runtimeAlignment/semanticRuntimeAlignmentFacade');
  const report = facade.getAlignmentReport({ force: true });
  assert(report.shadow_first === true, 'shadow first');
  assert(report.enforcement_default === false, 'no default enforcement');
}

function writeSnapshots() {
  console.log('\n=== Snapshots ===');
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  process.env.IMPETUS_SEMANTIC_RUNTIME_OBSERVABILITY = 'on';
  const resolver = loadFresh('../../src/semanticGovernance/semanticModulePublicationResolver');
  const personas = [
    ['safety', 'safety', ['sst', 'dashboard', 'quality', 'environment_intelligence']],
    ['environmental', 'environmental', ['environment_intelligence', 'esg', 'dashboard']],
    ['quality', 'quality', ['quality', 'qualidade', 'reports', 'dashboard']],
    ['hr', 'hr', ['hr', 'rh', 'dashboard']],
    ['executive', 'executive', ['executive', 'analytics', 'dashboard']],
    ['operational', 'operations', ['maintenance', 'sst', 'dashboard']],
    ['shared_modules', 'quality', ['reports', 'analytics', 'dashboard']]
  ];
  for (const [file, axis, mods] of personas) {
    const pub = resolver.resolveSemanticPublication(
      { id: 1 },
      { visible_modules: mods, functional_axis: axis, force_observe: true }
    );
    fs.writeFileSync(path.join(SNAPSHOT_DIR, `${file}.json`), JSON.stringify(pub, null, 2));
    console.log(`  SNAP  ${file}.json`);
  }
}

function main() {
  console.log('Semantic Runtime Alignment — Phase K');
  testPublicationLeakage();
  testCrossDomainExposure();
  testOrphanPipelines();
  testGovernedCards();
  testFallbackSanitization();
  testContextualConsistency();
  testSemanticIntegrity();
  testLegacyBuilderDetection();
  testShadowOnlyMode();
  testAlignmentReport();
  writeSnapshots();
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}

main();
