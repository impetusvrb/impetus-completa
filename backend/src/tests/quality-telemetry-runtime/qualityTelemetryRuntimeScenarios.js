'use strict';

/**
 * Smoke — Quality Industrial Telemetry Runtime (sem subir Express).
 */

let p = 0;
let f = 0;
function ok(label, cond) {
  if (cond) {
    p++;
    console.log('  OK', label);
  } else {
    f++;
    console.log('  FAIL', label);
  }
}

(async () => {
  console.log('\nQUALITY TELEMETRY RUNTIME (backend)\n');

  const route = require('../../routes/qualityTelemetry');
  ok('route load', typeof route === 'function' || (route && typeof route.use === 'function'));

  const flags = require('../../domains/quality/telemetry/qualityTelemetryRuntimeFlags');
  ok('telemetry flags snapshot', typeof flags.getTelemetryRuntimeFlagSnapshot === 'function');

  const { evaluateExpectedRange } = require('../../domains/quality/telemetry/qualityTelemetryAnomalyGate');
  const r1 = evaluateExpectedRange(5, { min: 0, max: 10 });
  ok('range ok', r1.breached === false);
  const r2 = evaluateExpectedRange(11, { min: 0, max: 10 });
  ok('range breach', r2.breached === true);

  const { validateDimensionalBlock } = require('../../domains/quality/telemetry/qualityTelemetryDimensional');
  const d1 = validateDimensionalBlock({ characteristic_id: 'D-1', nominal: 10, tolerance_upper: 10.5 });
  ok('dimensional valid', d1.ok === true && d1.labels.dimensional?.characteristic_id === 'D-1');

  const { validateCatalogType } = require('../../eventPipeline/catalog/industrialEventCatalog');
  for (const t of ['quality.telemetry.sample_ingested', 'quality.telemetry.batch_ingested', 'quality.telemetry.range_breached']) {
    const v = validateCatalogType(t, { strict: true });
    ok(`catalog ${t}`, v.ok === true);
  }

  const contract = require('../../domains/quality/contracts/qualityDomainContract');
  ok('contract v7 includes telemetry', contract.CONTRACT_VERSION === 7 && contract.TELEMETRY_API_PREFIX === '/api/quality-telemetry');

  console.log(`\n${p} passed ${f} failed\n`);
  process.exit(f > 0 ? 1 : 0);
})();
