'use strict';

/**
 * Smoke + contrato — Quality Operational Runtime API (sem subir Express).
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
  console.log('\nQUALITY OPERATIONAL RUNTIME (backend)\n');

  const route = require('../../routes/qualityOperational');
  ok('route load', typeof route === 'function' || (route && typeof route.use === 'function'));

  const flags = require('../../domains/quality/runtime/qualityOperationalRuntimeFlags');
  ok('flags snapshot', typeof flags.getOperationalRuntimeFlagSnapshot === 'function');

  const { validateCatalogType } = require('../../eventPipeline/catalog/industrialEventCatalog');
  for (const t of [
    'quality.inspection.saved',
    'quality.evidence.attached',
    'quality.offline.sync_started',
    'quality.scan.performed',
    'quality.kiosk.session_started'
  ]) {
    const v = validateCatalogType(t, { strict: true });
    ok(`catalog ${t}`, v.ok === true);
  }

  console.log(`\n${p} passed ${f} failed\n`);
  process.exit(f > 0 ? 1 : 0);
})();
