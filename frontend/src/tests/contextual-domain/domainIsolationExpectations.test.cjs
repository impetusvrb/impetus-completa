'use strict';

/**
 * Expectativas de isolamento contextual (frontend — espelho da matriz backend).
 * node frontend/src/tests/contextual-domain/domainIsolationExpectations.test.cjs
 */

const MATRIX = {
  environmental: {
    allow: ['environment_intelligence', 'dashboard', 'operational'],
    deny: ['quality_intelligence', 'raw_material_lots']
  },
  quality: {
    allow: ['quality_intelligence', 'dashboard'],
    deny: ['environment_intelligence']
  },
  hr: {
    allow: ['hr_intelligence', 'dashboard'],
    deny: ['manuia', 'quality_intelligence']
  },
  finance: {
    allow: ['dashboard', 'audit'],
    deny: ['manuia', 'anomaly_detection']
  }
};

function filterModules(modules, axis) {
  const rule = MATRIX[axis];
  if (!rule) return modules;
  return modules.filter((m) => !rule.deny.includes(m));
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${msg}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${msg}`);
  }
}

assert(
  !filterModules(['quality_intelligence', 'environment_intelligence'], 'environmental').includes('quality_intelligence'),
  'environmental != quality module'
);
assert(
  filterModules(['environment_intelligence'], 'environmental').includes('environment_intelligence'),
  'environmental keeps environment_intelligence'
);
assert(
  !filterModules(['environment_intelligence', 'quality_intelligence'], 'quality').includes('environment_intelligence'),
  'quality != environmental module'
);
assert(!filterModules(['manuia', 'hr_intelligence'], 'hr').includes('manuia'), 'HR != manuia');
assert(!filterModules(['anomaly_detection'], 'finance').includes('anomaly_detection'), 'finance != telemetry');

console.log(`\nTotal: ${passed} passed | ${failed} failed`);
if (failed > 0) process.exit(1);
