'use strict';

const orchestrator = require('../../domains/safety/analytics/safetyOperationalValidationOrchestrator');
const readiness = require('../../domains/safety/analytics/safetyPilotReadinessEngine');
const cognitive = require('../../domains/safety/analytics/safetyCognitivePressureAnalyzer');
const audience = require('../../domains/safety/analytics/safetyAudienceValidationRuntime');
const pilotGov = require('../../domains/safety/analytics/safetyPilotGovernanceRuntime');

let passed = 0;
let failed = 0;

function ok(label, cond) {
  if (cond) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}`);
    failed++;
  }
}

console.log('\nsafety-operational-validation (backend)\n');

const pack = orchestrator.runOperationalValidationPack({
  tenant_id: '00000000-0000-4000-8000-000000000099',
  menu_extra_count: 5,
  view_count: 2
});
ok('pack ok domain safety', pack.ok && pack.domain === 'safety');
ok('pilot readiness level valid', readiness.LEVELS.includes(pack.pilot_readiness?.level));
ok('cognitive pressure scores', pack.cognitive_pressure?.cognitive_risk_score != null);
ok('decision hint no auto full', pack.operational_decision_hint?.action !== 'FULL_ROLLOUT');
ok('executive assistive only', pack.executive_insights?.assistive_only !== false);

const cogOverload = cognitive.analyzeCognitivePressure({
  menu_extra_count: 20,
  view_count: 8,
  navigation_events_per_min: 30,
  dashboard_widget_count: 12,
  branching_factor: 5,
  cognitive_budget_remaining: 10
});
ok('cognitive overload detectable', cogOverload.overload_detected === true);

const aud = audience.validateAudienceMatrix([
  { band: 'operator', visible_modules: ['safety_intelligence'], expected: ['safety_intelligence'], menu_count: 5 }
]);
ok('audience matrix runs', typeof aud.failure_rate === 'number');

const scope = pilotGov.registerPilotScope({
  tenant_id: '00000000-0000-4000-8000-000000000099',
  plant_id: 'plant-a',
  audience_band: 'sst_technician',
  maturity: 'shadow'
});
ok('pilot scope registered', scope.ok === true);

orchestrator.recordBehaviorEvent({
  tenant_id: '00000000-0000-4000-8000-000000000099',
  event_type: 'route_open',
  route: '/app/safety/operational',
  route_open_ms: 120,
  audience_band: 'operator'
});
ok('behavior event recorded', true);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
