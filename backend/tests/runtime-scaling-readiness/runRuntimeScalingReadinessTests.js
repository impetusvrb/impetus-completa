'use strict';

let passed = 0;
let failed = 0;
function assert(c, m) {
  if (c) {
    passed++;
    console.log(`  PASS  ${m}`);
  } else {
    failed++;
    console.log(`  FAIL  ${m}`);
  }
}
function loadFresh(p) {
  delete require.cache[require.resolve(p)];
  return require(p);
}

function main() {
  console.log('Runtime Scaling Readiness — Phase Z.11');
  const readiness = loadFresh('../../src/runtimeScalingReadiness/runtimeScalingReadinessFacade');
  const result = readiness.assessRuntimeScalingReadiness('z11-r', {
    force: true,
    expansion: {
      classification: { classification: 'mature_scalable', expansion_blocked: false },
      risk: { high_risk: false }
    },
    scaling_stability: { scaling_instability_detected: false },
    governance_load_protection: { entropy: { protected: true } },
    z10: { runtime_sustainability: { governance: { governance_sustainable: true } } },
    rollback_readiness: { summary: { rollback_safe: true } }
  });
  assert(result.scaling_ready === true || result.scaling_safe === true, 'scaling readiness calculado');
  assert(result.auto_expand === false, 'sem auto expand');
  assert(result.rollback_readiness_preserved === true, 'rollback readiness preservado');

  const health = loadFresh('../../src/runtimeScalingReadiness/scalingReadinessHealth').assessScalingReadinessHealth({
    scaling_safe: true,
    stable: true
  });
  assert(health.continuous_ready === true, 'continuous readiness');

  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
