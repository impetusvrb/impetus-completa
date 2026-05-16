'use strict';

const path = require('path');
const fs = require('fs');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');

function validate() {
  const checks = [];
  const route = path.join(ROOT, 'routes/qualityTelemetry.js');
  checks.push(check('quality_telemetry_route_exists', fs.existsSync(route)));
  const ingest = path.join(ROOT, 'domains/quality/telemetry/qualityTelemetryIngestService.js');
  checks.push(check('telemetry_ingest_service_exists', fs.existsSync(ingest)));
  const dimensional = path.join(ROOT, 'domains/quality/telemetry/qualityTelemetryDimensional.js');
  checks.push(check('dimensional_telemetry_module_exists', fs.existsSync(dimensional)));

  const contract = require(path.join(ROOT, 'domains/quality/contracts/qualityDomainContract'));
  checks.push(check('contract_telemetry_prefix', contract.TELEMETRY_API_PREFIX === '/api/quality-telemetry'));

  const { validateCatalogType } = require(path.join(ROOT, 'eventPipeline/catalog/industrialEventCatalog'));
  for (const t of ['quality.telemetry.sample_ingested', 'quality.telemetry.batch_ingested', 'quality.telemetry.range_breached']) {
    checks.push(check(`telemetry_event_${t}`, validateCatalogType(t, { strict: true }).ok));
  }

  const s = fs.readFileSync(path.join(ROOT, 'services/operational/enterpriseObservabilityRuntime.js'), 'utf8');
  checks.push(check('obs_record_metric_available', s.includes('recordMetric')));

  return phaseResult('P6', 'Quality Telemetry Readiness', checks);
}

module.exports = { validate };
