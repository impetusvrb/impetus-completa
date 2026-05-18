'use strict';

process.env.IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED = 'true';

const flags = require('../../domains/environment/operational/environmentOperationalRuntimeFlags');
const orchestrator = require('../../domains/environment/operational/environmentOperationalOrchestrator');
const water = require('../../domains/environment/operational/water/waterRuntimes');
const effluent = require('../../domains/environment/operational/effluent/effluentRuntimes');
const validation = require('../../domains/environment/operational/validation/environmentOperationalValidationRuntime');
const { getCatalogEntry } = require('../../eventPipeline/catalog/industrialEventCatalog');

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

console.log('\nenvironment-operational-runtime (backend)\n');

ok('operational enabled', flags.isEnvironmentOperationalRuntimeEnabled() === true);
ok('water runtime', water.waterOperationalRuntime({ companyId: 't1' }).module === 'water');
ok('effluent sampling', effluent.effluentSamplingRuntime({ companyId: 't1', ph: 7 }).parameters.ph === 7);
ok('summary water', orchestrator.getWorkspaceSummary('water', { companyId: 't1' }).ok === true);

const val = validation.runEnvironmentOperationalValidation({ tenant_id: 't1' });
ok('validation framework', val.framework === 'environment_operational_validation');
ok('catalog water event', !!getCatalogEntry('environment.water.sample_collected'));
ok('catalog field event', !!getCatalogEntry('environment.field.occurrence_registered'));

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed) process.exit(1);
