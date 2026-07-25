'use strict';

/**
 * INC-033 — Reconciliação séries temporais SPC ↔ datasets oficiais Qualidade
 */
const {
  buildSubgroupsFromMeasurements,
  loadQualitySpcSeriesBundle,
  resolveSubgroupsFromBundles
} = require('../../src/domains/quality/governance/spc/qualitySpcSeriesService');
const { evaluateSubgroupsSpc } = require('../../src/domains/quality/governance/spc/qualitySpcEngine');

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

const TENANT = '511f4819-fc48-479e-b11e-49ba4fb9c81b';

function testBuildSubgroups() {
  console.log('\n=== buildSubgroupsFromMeasurements ===');
  const empty = buildSubgroupsFromMeasurements([]);
  assert(empty.ok === false, 'empty array rejected');
  assert(empty.reason === 'no_measurements', 'empty reason');

  const two = buildSubgroupsFromMeasurements([1, 2, 3, 4]);
  assert(two.ok === true, '4 points → 2 subgroups n=2');
  assert(two.subgroups.length === 2, 'two subgroups');
  assert(two.subgroups.every((g) => g.length === 2), 'consistent n=2');

  const nine = buildSubgroupsFromMeasurements([3, 3, 3, 3, 3, 3, 3, 3, 3]);
  assert(nine.ok === true, '9 points form subgroups');
  assert(nine.subgroup_size === 4, 'prefers n=4 for 9 points (2 complete subgroups)');
  assert(nine.subgroup_count === 2, '2 subgroups without padding');

  const partial = buildSubgroupsFromMeasurements([1, 2, 3]);
  assert(partial.ok === false, '3 points insufficient for 2 subgroups min n=2');
}

function testResolvePriority() {
  console.log('\n=== resolveSubgroupsFromBundles priority ===');
  const insp = {
    has_data: true,
    measurements: [{ value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }, { value: 3 }]
  };
  const tel = { has_data: true, spc_measurements: [{ value: 10 }, { value: 10 }, { value: 10 }, { value: 10 }] };
  const snap = { has_data: false, measurements: [] };
  const r = resolveSubgroupsFromBundles(insp, tel, snap);
  assert(r.data_available === true, 'inspections preferred');
  assert(r.primary_source === 'quality_inspections', 'primary source inspections');
}

async function testLiveTenantBundle() {
  console.log('\n=== loadQualitySpcSeriesBundle (live tenant) ===');
  const bundle = await loadQualitySpcSeriesBundle(TENANT);
  assert(bundle.ok === true, 'bundle ok');
  assert(bundle.datasets.present.includes('quality_inspections'), 'inspections present');
  assert(bundle.data_available === true, 'tenant has sufficient SPC data');
  assert(Array.isArray(bundle.subgroups) && bundle.subgroups.length >= 2, 'at least 2 subgroups');
  assert(bundle.subgroup_meta.primary_source === 'quality_inspections', 'from inspections');
  assert(bundle.datasets.absent.includes('quality_timeseries'), 'quality_timeseries absent documented');
  assert(bundle.datasets.absent.includes('quality_measurements'), 'quality_measurements absent documented');

  const evalR = evaluateSubgroupsSpc(bundle.subgroups);
  assert(evalR.ok === true, 'SPC engine accepts real subgroups');
  assert(evalR.limits?.center === 3, 'xbar center matches defects_count=3');
}

async function testNoSyntheticOnEmpty() {
  console.log('\n=== empty tenant guard ===');
  const fake = resolveSubgroupsFromBundles(
    { has_data: false, measurements: [] },
    { has_data: false, spc_measurements: [] },
    { has_data: false, measurements: [] }
  );
  assert(fake.data_available === false, 'no data → unavailable');
  assert(fake.subgroups.length === 0, 'no fake subgroups');
  assert(fake.reason === 'insufficient_measurements', 'honest reason');
}

async function run() {
  testBuildSubgroups();
  testResolvePriority();
  await testLiveTenantBundle();
  await testNoSyntheticOnEmpty();
  console.log(`\n=== INC-033 SPC Timeseries: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
