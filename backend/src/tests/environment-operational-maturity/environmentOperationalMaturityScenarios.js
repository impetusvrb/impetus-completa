'use strict';

const { scoreOperationalMaturity, MATURITY_LEVELS } = require('../../domains/environment/pilot-rollout/environmentOperationalMaturityScoring');

let passed = 0;
let failed = 0;
function ok(l, c) {
  if (c) {
    console.log(`  OK ${l}`);
    passed++;
  } else {
    console.error(`  FAIL ${l}`);
    failed++;
  }
}

console.log('\nenvironment-operational-maturity\n');
ok('levels', MATURITY_LEVELS.includes('ENTERPRISE_READY'));
const low = scoreOperationalMaturity({});
ok('initial', low.maturity_level === 'INITIAL');
const high = scoreOperationalMaturity({
  field_collection_rate: 0.9,
  effluent_compliance_rate: 0.85,
  telemetry_coverage: 0.8,
  evidence_capture_rate: 0.75,
  navigation_consistency: 0.7,
  esg_reporting_rate: 0.65,
  cognitive_interaction_health: 0.6,
  executive_engagement: 0.55
});
ok('high maturity', ['CONTEXTUAL', 'EXECUTIVE_READY', 'ENTERPRISE_READY'].includes(high.maturity_level));
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
