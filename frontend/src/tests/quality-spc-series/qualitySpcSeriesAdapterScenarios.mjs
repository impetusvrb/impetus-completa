/**
 * INC-033 — Adapter SPC séries temporais (frontend)
 */
import {
  normalizeSpcScreenResponse,
  extractRuntimeSpcDriftMetrics,
  validateSpcRuntimeCoherence,
  SPC_EMPTY_MESSAGE
} from '../../domains/quality/governance/qualitySpcSeriesAdapterCore.js';

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

console.log('\nINC-033 quality-spc-series-adapter\n');

const screenRaw = {
  ok: true,
  correlation_id: 'abc',
  result: {
    ok: true,
    limits: { center: 3, ucl: 3.5, lcl: 2.5 },
    violation_count: 0,
    subgroup_stats: [{ index: 0, mean: 3, n: 3 }]
  }
};
const normalized = normalizeSpcScreenResponse(screenRaw);
ok('normalizes xbar center', normalized.xbar_average === 3);
ok('normalizes ucl', normalized.ucl === 3.5);
ok('data available', normalized.data_available === true);
ok('process under control', normalized.violations_detected === false);

const failScreen = normalizeSpcScreenResponse({ result: { ok: false, reason: 'insufficient_data' } });
ok('failed screen empty', failScreen.data_available === false);
ok('empty message token', failScreen.empty_message === SPC_EMPTY_MESSAGE);

const mePayload = {
  cognitive_runtime_report: {
    specialized_cockpit_runtime: {
      centers: [
        {
          center_id: 'quality_telemetry_spc',
          metrics: { drift_level: 'high', drift_confidence: 100, spc_subgroup_means: [3, 3, 3] }
        }
      ]
    }
  }
};
const drift = extractRuntimeSpcDriftMetrics(mePayload);
ok('drift high', drift.drift_level === 'high');
ok('runtime means', drift.spc_subgroup_means.length === 3);

const coherence = validateSpcRuntimeCoherence(
  { data_available: true, subgroups: [[3, 3, 3], [3, 3, 3], [3, 3, 3]], subgroup_meta: { subgroup_count: 3 } },
  drift
);
ok('coherent with runtime', coherence.coherent === true);

const emptyCoherence = validateSpcRuntimeCoherence({ data_available: false }, drift);
ok('empty spc vs runtime flagged', emptyCoherence.coherent === false);

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
