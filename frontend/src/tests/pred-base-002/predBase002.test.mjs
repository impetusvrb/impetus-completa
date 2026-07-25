/**
 * PRED-BASE-002 — Enterprise Prediction Platform Certification tests.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRED_BASE_002_PHASE,
  PRED_BASE_002_PRINCIPLE,
  PRED_BASE_002_SCOPE,
  CERT_STATUS,
  PLATFORM_PREDICTION_CERTIFICATION,
  assessPlatformPredictionCertification,
  validatePredBase002,
  getPlatformPredictionCertificationReport,
  listCertifiedCapabilities,
  discoverPlatformPredictionCapabilities,
  normalizeForecastToPlatformContract,
  getPlatformPredictionConfidence,
  PREDICTION_COVERAGE_MATRIX,
  getCoverageBySource,
  getCertifiedConsumerReadiness,
  PLATFORM_PREDICTION_PUBLIC_API,
  PRED_BASE_STATUS
} from '../../platform/prediction/index.js';
import { PRED_BASE_GAPS } from '../../platform/prediction/readiness/platformPredictionReadiness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const ROOT = path.join(FE, 'src/platform/prediction');
const DOCS = path.join(FE, 'docs/evidence/PRED-BASE-002');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

console.log('PRED-BASE-002 — predBase002.test\n');

test('principle CERTIFY BEFORE CONSUME + no new motors', () => {
  assert.equal(PRED_BASE_002_PHASE, 'PRED-BASE-002');
  assert.equal(PRED_BASE_002_PRINCIPLE, 'CERTIFY BEFORE CONSUME');
  assert.equal(PRED_BASE_002_SCOPE.createsNewForecastingMotors, false);
  assert.equal(PRED_BASE_002_SCOPE.implementsDomainPredictions, false);
  assert.equal(PRED_BASE_002_SCOPE.certifiesExistingOnly, true);
});

test('GAP-PB-005 closed; GAP-PB-003 PARTIAL coverage only', () => {
  const pb005 = PRED_BASE_GAPS.find((g) => g.id === 'GAP-PB-005');
  const pb003 = PRED_BASE_GAPS.find((g) => g.id === 'GAP-PB-003');
  assert.equal(pb005.status, PRED_BASE_STATUS.READY);
  assert.equal(pb005.closedBy, 'PRED-BASE-002');
  assert.equal(pb003.status, PRED_BASE_STATUS.PARTIAL);
  assert.ok(PLATFORM_PREDICTION_CERTIFICATION.gapsClosed.includes('GAP-PB-005'));
  assert.ok(PLATFORM_PREDICTION_CERTIFICATION.gapsDeferredAsCoverage.includes('GAP-PB-003'));
});

test('platform.prediction.v0 officially certified + FIN-EVOLVE-2.4 gate open', () => {
  const a = assessPlatformPredictionCertification();
  assert.equal(a.platformCertified, true);
  assert.equal(a.contractOfficiallyCertified, true);
  assert.equal(a.gapPb005Closed, true);
  assert.equal(a.gapPb003BlocksPlatform, false);
  assert.equal(a.gate.openFinEvolve24, true);
  assert.equal(a.gate.openEnterprisePredictionConsumers, true);
  assert.equal(a.gate.openEnergyForecasts, false);
  assert.equal(PLATFORM_PREDICTION_CERTIFICATION.status, CERT_STATUS.CERTIFIED);
});

test('public API — discover + normalize + confidence', () => {
  assert.equal(PLATFORM_PREDICTION_PUBLIC_API.createsNewBackend, false);
  const disc = discoverPlatformPredictionCapabilities('finance');
  assert.ok(disc.capabilities.length >= 1);
  assert.ok(disc.limitations.some((l) => /Energy/i.test(l)));
  const norm = normalizeForecastToPlatformContract(
    { metric: 'eficiencia', series: [{ value: 82 }, { value: 79 }] },
    { domainId: 'finance', horizon: '2d' }
  );
  assert.equal(norm.semantic_lane, 'forecast_prediction');
  assert.equal(norm.point_estimate, 79);
  assert.equal(norm.contract, 'platform.prediction.v0');
  const conf = getPlatformPredictionConfidence(norm);
  assert.equal(conf.ok, true);
});

test('registry — certified caps; energy excluded', () => {
  const certified = listCertifiedCapabilities();
  assert.ok(certified.length >= 4);
  assert.ok(certified.every((c) => c.state === CERT_STATUS.CERTIFIED));
  assert.ok(certified.every((c) => c.limitations?.length));
  const energy = PREDICTION_COVERAGE_MATRIX.find((c) => c.source === 'energia');
  assert.equal(getCoverageBySource('energia').status, PRED_BASE_STATUS.PARTIAL);
  assert.equal(energy.inInitialWave, false);
});

test('consumer readiness — finance opens FIN-EVOLVE-2.4 without energy', () => {
  const finance = getCertifiedConsumerReadiness('finance');
  assert.equal(finance.eligibleNow, true);
  assert.equal(finance.opensProduct, 'FIN-EVOLVE-2.4');
  assert.ok(!finance.mayConsumeImmediately.includes('cap-energy'));
  assert.ok(finance.excludedUntilLater.includes('cap-energy'));
  for (const d of ['maintenance', 'production', 'logistics', 'quality', 'environment']) {
    assert.ok(getCertifiedConsumerReadiness(d)?.eligibleNow, d);
  }
});

test('full validatePredBase002 + report', () => {
  const v = validatePredBase002();
  assert.equal(v.valid, true, v.issues.join('; '));
  const report = getPlatformPredictionCertificationReport();
  assert.equal(report.next.openNow, 'FIN-EVOLVE-2.4 as platform consumer');
  assert.ok(report.temporaryExclusions.some((e) => e.id === 'energia'));
});

test('no new forecasting engines / domain prediction products under prediction/', () => {
  const forbidden = [
    'FinancePredictionEngine',
    'trainModel(',
    'tensorflow',
    'createsNewBackend: true'
  ];
  for (const dir of ['certification', 'registry', 'public-api', 'coverage', 'reports']) {
    const p = path.join(ROOT, dir);
    if (!fs.existsSync(p)) continue;
    for (const name of fs.readdirSync(p)) {
      if (!/\.js$/.test(name)) continue;
      const t = fs.readFileSync(path.join(p, name), 'utf8');
      for (const f of forbidden) assert.ok(!t.includes(f), `${name} has ${f}`);
    }
  }
  assert.equal(PRED_BASE_002_SCOPE.createsNewForecastingMotors, false);
});

test('structure + evidence docs', () => {
  for (const dir of ['certification', 'registry', 'public-api', 'coverage', 'consumers', 'reports']) {
    assert.ok(fs.existsSync(path.join(ROOT, dir)), dir);
  }
  for (const doc of [
    'PRED-BASE-002-EXECUTIVE-SUMMARY.md',
    'PRED-BASE-002-CERTIFICATION.md',
    'PRED-BASE-002-PUBLIC-API.md',
    'PRED-BASE-002-REGISTRY.md',
    'PRED-BASE-002-COVERAGE.md',
    'PRED-BASE-002-CONSUMERS.md'
  ]) {
    assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
