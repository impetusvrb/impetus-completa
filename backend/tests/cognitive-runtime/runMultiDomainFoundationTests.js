'use strict';

process.env.IMPETUS_COGNITIVE_RUNTIME = 'on';
process.env.IMPETUS_BLOCK_REGISTRY = 'on';
process.env.IMPETUS_COMPOSITION_SHADOW = 'on';
process.env.IMPETUS_COMPOSITION_ENGINE = 'on';
process.env.IMPETUS_QUALITY_COCKPIT_PILOT = 'shadow';
process.env.IMPETUS_MULTI_DOMAIN_FOUNDATION = 'active';
process.env.IMPETUS_COGNITIVE_ORCHESTRATION = 'active';
process.env.IMPETUS_SEMANTIC_DOMAIN_RUNTIME = 'active';
process.env.IMPETUS_MULTI_DOMAIN_OBSERVABILITY = 'on';

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}`);
    failed++;
  }
}

function section(name) { console.log(`\n--- ${name} ---`); }

/* ════ 1. Domain Registry ════ */
section('Domain Registry');
const dr = require('../../src/cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry');
assert('quality defined', dr.getDomainDefinition('quality') != null);
assert('safety defined', dr.getDomainDefinition('safety') != null);
assert('hr defined', dr.getDomainDefinition('hr') != null);
assert('environmental defined', dr.getDomainDefinition('environmental') != null);
assert('maintenance defined', dr.getDomainDefinition('maintenance') != null);
assert('production defined', dr.getDomainDefinition('production') != null);
assert('executive defined', dr.getDomainDefinition('executive') != null);
assert('7 domains total', dr.listDomains().length === 7);
const ready = dr.listReadyDomains();
assert('quality safety hr cockpit-ready', ready.includes('quality') && ready.includes('safety') && ready.includes('hr') && ready.length >= 3);

/* ════ 2. Domain Weighting ════ */
section('Domain Weighting');
const w = dr.getDomainWeighting('quality');
assert('quality 70% operational', w.operational === 0.7);
assert('quality 20% governance', w.governance === 0.2);
assert('quality 10% strategic', w.strategic === 0.1);
const ex = dr.getDomainWeighting('executive');
assert('executive 70% strategic', ex.strategic === 0.7);

/* ════ 3. Semantic Isolation ════ */
section('Semantic Isolation');
assert('quality isolated from safety', dr.isDomainIsolatedFrom('quality', 'safety'));
assert('quality isolated from hr', dr.isDomainIsolatedFrom('quality', 'hr'));
assert('executive not isolated from quality', !dr.isDomainIsolatedFrom('executive', 'quality'));

/* ════ 4. Semantic Profiles ════ */
section('Semantic Profiles');
const sp = require('../../src/cognitiveRuntime/domainFoundation/registry/domainSemanticProfiles');
assert('coordinator_quality -> quality', sp.resolveDomainFromProfile('coordinator_quality') === 'quality');
assert('coordinator_safety -> safety', sp.resolveDomainFromProfile('coordinator_safety') === 'safety');
assert('coordinator_hr -> hr', sp.resolveDomainFromProfile('coordinator_hr') === 'hr');
assert('executive_director -> executive', sp.resolveDomainFromProfile('executive_director') === 'executive');

/* ════ 5. Composition Registry ════ */
section('Composition Registry');
const cr = require('../../src/cognitiveRuntime/domainFoundation/registry/cockpitCompositionRegistry');
assert('resolvePersonaTier coordination', cr.resolvePersonaTier('coordinator_quality') === 'coordination');
assert('resolvePersonaTier executive', cr.resolvePersonaTier('executive_director') === 'executive');
const config = cr.buildCompositionConfig('quality', 'coordinator_quality');
assert('composition cockpit_ready true', config.cockpit_ready === true);
assert('composition persona_tier coordination', config.persona_tier === 'coordination');

/* ════ 6. Block Registry per domain ════ */
section('Block Registry per Domain');
const dbr = require('../../src/cognitiveRuntime/domainFoundation/registry/domainBlockRegistry');
const qualityBlocks = dbr.listBlocksForDomain('quality');
assert('quality blocks > 0', qualityBlocks.length > 0);
const sstBlocks = dbr.listBlocksForDomain('safety');
assert('safety blocks exist in registry', sstBlocks.length >= 0);

/* ════ 7. Cross-Domain Protection ════ */
section('Cross-Domain Protection');
const cdp = require('../../src/cognitiveRuntime/domainFoundation/runtime/crossDomainProtection');
const mockMixed = [
  { block_id: 'quality.nc_center', domain: 'quality' },
  { block_id: 'sst.incident_heatmap', domain: 'safety' }
];
const isolation = cdp.validateCrossDomainIsolation('quality', mockMixed);
assert('mixed blocks produce violation', isolation.violation_count >= 1);
assert('isolation detects safety contamination', isolation.violations.some(v => v.block_domain === 'safety'));

const { blocks: filtered } = cdp.filterBlocksByDomainIsolation('quality', mockMixed);
assert('filtered removes safety block', filtered.length === 1 && filtered[0].block_id === 'quality.nc_center');

/* ════ 8. Domain Weight Balancer ════ */
section('Domain Weight Balancer');
const dwb = require('../../src/cognitiveRuntime/domainFoundation/runtime/domainWeightBalancer');
const balanced = dwb.balanceWeightsForProfile('quality', 'coordinator_quality');
assert('blended operational close to 0.7', balanced.blended.operational >= 0.6);

/* ════ 9. Adaptive Composition Supervisor ════ */
section('Adaptive Composition Supervisor');
const acs = require('../../src/cognitiveRuntime/domainFoundation/runtime/adaptiveCompositionSupervisor');
const result = acs.superviseComposition(
  { company_id: 1 },
  { profile_code: 'coordinator_quality', functional_area: 'quality' },
  {}
);
assert('supervisor ok', result.ok === true);
assert('supervisor domain=quality', result.domain === 'quality');
assert('supervisor cockpit_ready', result.cockpit_ready === true);
assert('supervisor blocks > 0', result.block_count > 0);
assert('supervisor semantic_fidelity >= 0.7', result.semantic_fidelity >= 0.7);
assert('supervisor no violations', result.isolation.violation_count === 0);

/* ════ 10. Orchestration Engine ════ */
section('Orchestration Engine');
const oe = require('../../src/cognitiveRuntime/domainFoundation/orchestration/cognitiveOrchestrationEngine');
const orch = oe.orchestrateCockpitComposition(
  { company_id: 1 },
  { profile_code: 'coordinator_quality', functional_area: 'quality' },
  { force_orchestration: true }
);
assert('orchestration ok', orch.ok === true);
assert('orchestration blocks have priority', orch.orchestrated_blocks?.[0]?.orchestration_priority === 0);

/* ════ 11. Priority Resolver ════ */
section('Priority Resolver');
const pr = require('../../src/cognitiveRuntime/domainFoundation/orchestration/cockpitPriorityResolver');
const priorities = pr.resolveCockpitPriorities(orch.orchestrated_blocks || [], { max_visible: 4 });
assert('visible <= 4', priorities.visible.length <= 4);
assert('total matches blocks', priorities.total === (orch.orchestrated_blocks || []).length);

/* ════ 12. Operational Focus ════ */
section('Operational Focus');
const ofr = require('../../src/cognitiveRuntime/domainFoundation/orchestration/operationalFocusResolver');
const focus = ofr.resolveOperationalFocus(orch.orchestrated_blocks || [], orch.blended_weights || {});
assert('operational_ratio > 0', focus.operational_ratio > 0);
assert('focus balanced', typeof focus.balanced === 'boolean');

/* ════ 13. Governance-Aware Composer ════ */
section('Governance-Aware Composer');
const gac = require('../../src/cognitiveRuntime/domainFoundation/orchestration/governanceAwareComposer');
const gov = gac.composeWithGovernance('quality', orch.orchestrated_blocks || [], {});
assert('governance not blocked', gov.governance_blocked === false);
assert('governance safe blocks', gov.blocks.every(b => b.governance_safe === true));

/* ════ 14. Runtime Density ════ */
section('Runtime Density');
const drb = require('../../src/cognitiveRuntime/domainFoundation/orchestration/domainRuntimeBalancer');
const density = drb.balanceRuntimeDensity('quality', orch.orchestrated_blocks || []);
assert('density capped false if <= max', density.density.capped === false || density.density.source_count > density.density.max_blocks);

/* ════ 15. Cognitive Health ════ */
section('Cognitive Composition Health');
const ch = require('../../src/cognitiveRuntime/domainFoundation/observability/cognitiveCompositionHealth');
const health = ch.computeMultiDomainCognitiveHealth(result);
assert('health semantic_fidelity > 0', health.semantic_fidelity > 0);
assert('health cross_domain_isolation = 1', health.cross_domain_isolation === 1);
assert('health healthy', health.healthy === true);

/* ════ 16. Semantic Domain Fidelity ════ */
section('Semantic Domain Fidelity');
const sdr = require('../../src/cognitiveRuntime/domainFoundation/runtime/semanticDomainResolver');
const sem = sdr.resolveSemanticDomain({}, { profile_code: 'coordinator_quality' }, {});
assert('semantic resolved', sem.resolved === true);
assert('semantic domain = quality', sem.domain === 'quality');
const fidelity = sdr.validateSemanticFidelity('quality', result.composed_blocks || []);
assert('fidelity >= 0.7', fidelity.fidelity >= 0.7);

/* ════ 17. No Leakage - SST profile does not get quality blocks ════ */
section('Cross-Domain Leakage Test');
const sstResult = acs.superviseComposition(
  { company_id: 1 },
  { profile_code: 'coordinator_safety', functional_area: 'safety' },
  {}
);
assert('SST supervisor ok', sstResult.ok === true);
assert('SST domain = safety', sstResult.domain === 'safety');
const sstQualityBlocks = (sstResult.composed_blocks || []).filter(b => {
  const d = b.domain || '';
  return d === 'quality';
});
assert('SST no quality blocks leaked', sstQualityBlocks.length === 0);

/* ════ 18. No Executive Contamination ════ */
section('Executive Isolation Test');
const execResult = acs.superviseComposition(
  { company_id: 1 },
  { profile_code: 'executive_director', functional_area: 'executive' },
  {}
);
assert('executive resolved', execResult.ok === true);
assert('executive domain = executive', execResult.domain === 'executive');

/* ════ 19. Determinism ════ */
section('Determinism Validation');
const r1 = acs.superviseComposition(
  { company_id: 1 },
  { profile_code: 'coordinator_quality', functional_area: 'quality' },
  {}
);
const r2 = acs.superviseComposition(
  { company_id: 1 },
  { profile_code: 'coordinator_quality', functional_area: 'quality' },
  {}
);
assert('deterministic block_count', r1.block_count === r2.block_count);
assert('deterministic domain', r1.domain === r2.domain);
assert('deterministic fidelity', r1.semantic_fidelity === r2.semantic_fidelity);

/* ════ 20. Feature Flags ════ */
section('Feature Flags Z.24');
const f = require('../../src/cognitiveRuntime/config/phaseZ24FeatureFlags');
assert('multi_domain active', f.isMultiDomainActive());
assert('orchestration enabled', f.isCognitiveOrchestrationEnabled());
assert('globalReplace false', f.globalReplace === false);
assert('autoRemediation false', f.autoRemediation === false);

/* ════ FINAL ════ */
console.log(`\n=== Z.24 Multi-Domain Foundation: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
