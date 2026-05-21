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
  console.log('Delivery Quality — Phase Z.4');
  const q = loadFresh('../../src/deliveryQuality/deliveryQualityFacade');
  const r = q.analyzeDeliveryQuality(
    { role: 'operador' },
    {
      canonical_identity: { hierarchy_tier: 'operational' },
      visible_modules: ['dashboard', 'operational', 'proaction']
    }
  );
  assert(r.operational_usefulness.operationally_useful === true, 'operator useful');
  const noise = q.analyzeDeliveryQuality(
    {},
    {
      canonical_identity: { domain_axis: 'hr' },
      visible_modules: ['dashboard', 'hr_intelligence', 'safety_intelligence']
    }
  );
  assert(noise.contextual_noise.noise_detected === true, 'noise detected');
  console.log(`\nTotal: ${passed} passed | ${failed} failed`);
  if (failed) process.exit(1);
}
main();
