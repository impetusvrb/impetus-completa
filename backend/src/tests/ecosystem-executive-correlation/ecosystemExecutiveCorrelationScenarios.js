'use strict';

const { ecosystemExecutiveCorrelationRuntime } = require('../../ecosystem-correlation/ecosystemExecutiveCorrelationRuntime');

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

console.log('\necosystem-executive-correlation\n');
const pack = ecosystemExecutiveCorrelationRuntime({
  domain_pairs: {
    quality: { aggregate_score: 0.6, narratives: [{ text: 'test' }] },
    safety: { aggregate_score: 0.5 }
  }
});
ok('heatmap', !!pack.heatmap);
ok('narratives', pack.narratives.length >= 1);
ok('assistive', pack.assistive_only === true);
console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
