'use strict';

process.env.IMPETUS_SZ3_DEFAULT_STAGE = process.env.IMPETUS_SZ3_DEFAULT_STAGE || 'OBSERVATION_ONLY';
process.env.IMPETUS_SZ2_PERSISTENCE = 'off';

const path = require('path');
const base = path.resolve(__dirname, '..', '..', 'src', 'runtime-z-maturation');

const flags = require(`${base}/config/sz3FeatureFlags`);
const observation = require(`${base}/patterns/zPatternObservationRuntime`);
const library = require(`${base}/patterns/zPatternLibraryRuntime`);
const matcher = require(`${base}/patterns/zPatternMatchRuntime`);
const { filterNoise, isNoisy, noiseLevel } = require(`${base}/calibration/zNoiseReductionRuntime`);
const { calibrateScores } = require(`${base}/calibration/zInferenceCalibrationRuntime`);
const vocab = require(`${base}/language/zOperationalVocabulary`);
const { buildMatureNarrative } = require(`${base}/language/zLanguageMaturationRuntime`);
const { computeErgonomics, PROFILE_DEFAULTS } = require(`${base}/ergonomics/zCognitiveErgonomicsRuntime`);
const { shapeResponse } = require(`${base}/ergonomics/zResponseShapingRuntime`);
const { matchBehaviors, findBehavior } = require(`${base}/industrial/zIndustrialBehaviorLibrary`);
const { matchScenario } = require(`${base}/industrial/zIndustrialScenarioMatcher`);
const { maturePriority } = require(`${base}/prioritization/zPrioritizationMaturationRuntime`);
const facade = require(`${base}/facade/zMaturationFacade`);

const TENANT = 'sz3-test-tenant';
const USER = { id: 'u-1', company_id: TENANT, role_code: 'plant_manager' };

let passed = 0;
let failed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push({ name, detail }); console.log(`  ✗ ${name}${detail ? ' :: ' + JSON.stringify(detail) : ''}`); }
}
function section(t) { console.log(`\n── ${t} ─────────────────────────────────────`); }

observation.clearPatterns(TENANT);

// ── CONFIG ────────────────────────────────────────────────────────────────────
section('config & flags');
assert('SZ3 enabled', flags.isEnabled() === true);
assert('default stage OBSERVATION_ONLY', flags.defaultStage() === 'OBSERVATION_ONLY');
assert('invariants frozen', Object.isFrozen(flags.invariants));
assert('invariants.assistive_only true', flags.invariants.assistive_only === true);
assert('invariants.no_ml_training true', flags.invariants.no_ml_training === true);
assert('invariants.no_external_model_calls true', flags.invariants.no_external_model_calls === true);

// ── PATTERN LIBRARY ───────────────────────────────────────────────────────────
section('pattern library');
const allPats = library.all();
assert('library non-empty', allPats.length >= 8);
assert('findByTrigger nr12', library.findByTrigger('nr12').length >= 1);
assert('findByTrigger oee', library.findByTrigger('queda de oee').length >= 1);
assert('findByTrigger auditoria', library.findByTrigger('auditoria ISO').length >= 1);
assert('findByTrigger acidente', library.findByTrigger('acidente grave').length >= 1);
assert('findByTrigger capa', library.findByTrigger('CAPA nao conformidade').length >= 1);
assert('getTemplate returns string', typeof library.getTemplate('nr12_training') === 'string' && library.getTemplate('nr12_training').length > 0);
assert('unknown id returns null', library.findById('nonexistent') === null);

// ── PATTERN OBSERVATION ───────────────────────────────────────────────────────
section('pattern observation');
observation.observe(TENANT, { type: 'plan_training', domains: ['safety'], anchors: ['nr12', 'treinamento'], intent: 'plan_training' });
observation.observe(TENANT, { type: 'plan_training', domains: ['safety'], anchors: ['nr12', 'treinamento'], intent: 'plan_training' });
observation.observe(TENANT, { type: 'send_communication', domains: ['safety'], anchors: ['comunicado'], intent: 'send_communication' });
assert('pattern count grows', observation.patternCount(TENANT) >= 2);
assert('listPatterns returns array', Array.isArray(observation.listPatterns(TENANT, 1)));
assert('topPatterns returns most frequent', (() => {
  const top = observation.topPatterns(TENANT, 3);
  return Array.isArray(top) && top.length >= 1 && top[0].frequency >= 1;
})());
assert('tenant isolation: other tenant zero patterns', observation.patternCount('other-sz3-tenant') === 0);

// ── PATTERN MATCHER ───────────────────────────────────────────────────────────
section('pattern matching');
const pm1 = matcher.matchPatterns(TENANT, 'treinamento nr12', ['safety']);
assert('match returns result', !!pm1);
assert('match has top', !!pm1.top);
assert('match top has confidence', typeof pm1.confidence === 'number' && pm1.confidence > 0);
assert('match has library_size', pm1.library_size === allPats.length);

const pm2 = matcher.matchPatterns(TENANT, 'oee caiu turno 2', ['production']);
assert('match oee production', pm2.matched.length >= 1);

const pm3 = matcher.matchPatterns(TENANT, 'reunião de aniversário', []);
assert('no match for unrelated text returns empty', pm3.matched.length === 0);

// ── NOISE REDUCTION ───────────────────────────────────────────────────────────
section('noise reduction');
assert('isNoisy(0.1) = true', isNoisy(0.1) === true);
assert('isNoisy(0.9) = false', isNoisy(0.9) === false);
assert('noiseLevel(0.8) = clear', noiseLevel(0.8) === 'clear');
assert('noiseLevel(0.5) = acceptable', noiseLevel(0.5) === 'acceptable');
assert('noiseLevel(0.3) = noisy', noiseLevel(0.3) === 'noisy');
assert('filterNoise removes below threshold', (() => {
  const items = [{ score: 0.8 }, { score: 0.2 }, { score: 0.6 }];
  const out = filterNoise(items, 0.5);
  return out.length === 2 && out.every((x) => x.score >= 0.5);
})());

// ── CALIBRATION ───────────────────────────────────────────────────────────────
section('inference calibration');
const sz2Mock = {
  reasoning: { reasoning_quality: 0.5, industrial_intelligence_score: 0.5 },
  continuity: { continuation_score: 0.4 },
  context: { awareness_score: 0.4 }
};
const cal1 = calibrateScores(TENANT, sz2Mock, pm1);
assert('calibration returned', cal1.calibrated === true);
assert('calibrated_reasoning >= base', cal1.calibrated_reasoning >= 0.5);
assert('overall_quality is numeric', typeof cal1.overall_quality === 'number');
assert('has_library_confirmation when pattern found', cal1.has_library_confirmation === true);
assert('noise_level is string', typeof cal1.noise_level === 'string');

const cal2 = calibrateScores(TENANT, { reasoning: { reasoning_quality: 0.1 }, continuity: { continuation_score: 0.1 }, context: { awareness_score: 0.1 } }, pm3);
assert('suppress_enrichment when all scores low', cal2.suppress_enrichment === true);

// ── VOCABULARY ────────────────────────────────────────────────────────────────
section('operational vocabulary');
assert('expandAbbreviation nr12', vocab.expandAbbreviation('nr12').includes('NR-12'));
assert('expandAbbreviation capa', vocab.expandAbbreviation('capa').includes('CAPA'));
assert('expandAbbreviation unknown returns term', vocab.expandAbbreviation('xyz') === 'xyz');
assert('getTemplate action_prepared with vars', (() => {
  const t = vocab.getTemplate('action_prepared', { count: 3 });
  return t.includes('3') && !t.includes('{count}');
})());
assert('getTemplate priority_p1 returns string', vocab.getTemplate('priority_p1').length > 0);
assert('allTemplateKeys non-empty', vocab.allTemplateKeys().length >= 10);

// ── LANGUAGE MATURATION ───────────────────────────────────────────────────────
section('language maturation');
const sz2Full = {
  reasoning: { priority: { tier: 'P2' }, criticality: { level: 'high' }, detected_risks: ['safety'], escalation: { suggested_escalation: 'area_manager', requires_human_review: true } },
  continuity: { inherited_context: { summary: 'Haverá treinamento NR12 dia 20', anchors: ['nr12', 'treinamento'] } },
  context: { shift: { shift_name: 'turno_2' }, temporal: { part_of_day: 'tarde' }, urgency: { level: 'medium' } },
  actions: { count: 2 },
  intent: { primary: 'plan_training' }
};
const narr = buildMatureNarrative({ calibration: cal1, patternMatch: pm1, sz2CogOutput: sz2Full });
assert('mature narrative returned', narr.mature === true);
assert('narrative is non-empty string', narr.narrative.length > 10);
assert('sentences array non-empty', Array.isArray(narr.sentences) && narr.sentences.length > 0);
assert('language_quality in [0,1]', narr.language_quality >= 0 && narr.language_quality <= 1);
assert('contains shift context', narr.sentences.some((s) => s.includes('turno')));

// suppressed narrative
const narrSuppressed = buildMatureNarrative({ calibration: cal2, patternMatch: pm3, sz2CogOutput: {} });
assert('suppressed narrative is compact', narrSuppressed.sentences.length <= 2);

// ── ERGONOMICS ────────────────────────────────────────────────────────────────
section('cognitive ergonomics');
const erg1 = computeErgonomics({ profileCode: 'plant_manager', criticality: { level: 'critical' }, urgency: { level: 'high' }, operational: { operational_saturation: 0.9 }, temporal: { part_of_day: 'tarde' }, calibration: cal1 });
assert('ergonomics returned', !!erg1);
assert('under_pressure when saturation > 0.7', erg1.under_pressure === true);
assert('high_criticality_mode when critical', erg1.high_criticality_mode === true);
assert('compact verbosity under pressure', erg1.verbosity === 'compact');

const erg2 = computeErgonomics({ profileCode: 'executive', criticality: { level: 'low' }, urgency: { level: 'normal' }, operational: { operational_saturation: 0.1 }, temporal: { part_of_day: 'manha' }, calibration: cal1 });
assert('executive verbosity correct', erg2.verbosity === 'executive');
assert('format_hint bullet for executive', erg2.format_hint === 'bullet_3_max');

// ── RESPONSE SHAPING ──────────────────────────────────────────────────────────
section('response shaping');
const shaped = shapeResponse({ ergonomics: erg1, narrative: narr, actions: sz2Full.actions, calibration: cal1, patternMatch: pm1 });
assert('shaping returned', shaped.shaped === true);
assert('blocks is array', Array.isArray(shaped.blocks));
assert('visible_actions <= max_actions', shaped.visible_actions.length <= shaped.max_actions);

// ── INDUSTRIAL BEHAVIOR ───────────────────────────────────────────────────────
section('industrial behavior library');
const behaviors = matchBehaviors({ domains: ['safety'], criticality: 'critical', text: 'acidente grave' });
assert('behaviors match for safety + critical', behaviors.length >= 1);
assert('top behavior has expected_behaviors', Array.isArray(behaviors[0].expected_behaviors));
assert('auto_actions_blocked in critical safety', behaviors[0].auto_actions_blocked === true);

const hsBehavior = findBehavior('safety_incident_active');
assert('findBehavior by id works', !!hsBehavior);
assert('safety behavior has direct_urgent tone', hsBehavior.response_tone === 'direct_urgent');

// ── SCENARIO MATCHER ──────────────────────────────────────────────────────────
section('scenario matcher');
const sc1 = matchScenario('acidente grave na linha 3', { reasoning: { detected_risks: ['safety'], criticality: { level: 'critical' } } });
assert('safety incident scenario matched', sc1.matched === true);
assert('scenario auto_actions_blocked', sc1.auto_actions_blocked === true);
assert('scenario human_authority_required', sc1.human_authority_required === true);

const sc2 = matchScenario('queda de oee no turno', { reasoning: { detected_risks: ['production'], criticality: { level: 'high' } } });
assert('oee scenario matched', sc2.matched === true);

const sc3 = matchScenario('olá tudo bem', { reasoning: { detected_risks: [], criticality: { level: 'low' } } });
assert('no scenario for casual text', sc3.matched === false);

// ── PRIORITY MATURATION ───────────────────────────────────────────────────────
section('priority maturation');
const p1 = maturePriority({ sz2Reasoning: { priority: { tier: 'P3', score: 0.45 }, impact: { breadth: 3 } }, patternMatch: pm1, calibration: cal1, profileCode: 'plant_manager', operational: { critical_incidents: 1 } });
assert('priority maturation returned', p1.mature === true);
assert('priority uplifted with multi-domain + incident', ['P1', 'P2', 'P3'].includes(p1.tier));
assert('mature score >= base score', p1.score >= 0.45);
assert('domain_boost applied', p1.domain_boost > 0);
assert('incident_boost applied', p1.incident_boost > 0);

const p2 = maturePriority({ sz2Reasoning: { priority: { tier: 'P2', score: 0.7 } }, patternMatch: pm1, calibration: cal1, profileCode: 'executive', operational: {} });
assert('executive profile: is_executive_profile true', p2.is_executive_profile === true);
assert('executive relevant when P1/P2', p2.executive_relevant === true);

const p3 = maturePriority({ sz2Reasoning: { priority: { tier: 'P4', score: 0.2 } }, patternMatch: pm3, calibration: cal2, profileCode: 'executive', operational: {} });
assert('executive ignores P4', p3.executive_relevant === false);

// ── FACADE ────────────────────────────────────────────────────────────────────
section('facade — end to end');
const out1 = facade.applyMaturation(USER, sz2Full, { tenant_id: TENANT, profile: 'plant_manager', message: 'treinamento nr12 comunicado' });
assert('facade ok', out1.ok === true);
assert('facade payload has runtime_z_maturation', !!out1.payload.runtime_z_maturation);
const mat = out1.payload.runtime_z_maturation;
assert('maturation assistive_only', mat.assistive_only === true);
assert('maturation auto_execution false', mat.auto_execution === false);
assert('maturation has mature_narrative', !!mat.mature_narrative && mat.mature_narrative.mature === true);
assert('maturation has calibration', !!mat.calibration && mat.calibration.calibrated === true);
assert('maturation has ergonomics', !!mat.ergonomics);
assert('maturation has mature_priority', !!mat.mature_priority);
assert('maturation has pattern_match', !!mat.pattern_match);
assert('maturation_quality in [0,1]', mat.maturation_quality >= 0 && mat.maturation_quality <= 1);
assert('observability applied_total > 0', facade.observability.snapshot().applied_total > 0);

// rollback
const prevFlag = process.env.IMPETUS_SZ3_MATURATION;
process.env.IMPETUS_SZ3_MATURATION = 'off';
const offOut = facade.applyMaturation(USER, {}, { tenant_id: TENANT });
assert('facade skipped when disabled (rollback)', offOut.skipped === true);
process.env.IMPETUS_SZ3_MATURATION = prevFlag || 'on';

console.log('\n────────────────────────────────────────────────');
console.log(`SZ3 maturation tests: ${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of failures) console.log(`  - ${f.name}`);
  process.exit(1);
}
process.exit(0);
