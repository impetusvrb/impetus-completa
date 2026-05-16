'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');
const SERVER = path.join(ROOT, 'server.js');

function validate() {
  const checks = [];

  try {
    require.resolve(path.join(ROOT, 'routes/qualityOperational'));
    checks.push(check('route_quality_operational_resolvable', true));
  } catch (e) {
    checks.push(check('route_quality_operational_resolvable', false, 'fail', e.message));
  }
  try {
    require(path.join(ROOT, 'routes/qualityTelemetry'));
    checks.push(check('route_quality_telemetry_load', true));
  } catch (e) {
    checks.push(check('route_quality_telemetry_load', false, 'fail', e.message));
  }
  try {
    require(path.join(ROOT, 'routes/qualityCognitive'));
    checks.push(check('route_quality_cognitive_load', true));
  } catch (e) {
    checks.push(check('route_quality_cognitive_load', false, 'fail', e.message));
  }
  try {
    require(path.join(ROOT, 'routes/qualityRollout'));
    checks.push(check('route_quality_rollout_load', true));
  } catch (e) {
    checks.push(check('route_quality_rollout_load', false, 'fail', e.message));
  }

  const contract = require(path.join(ROOT, 'domains/quality/contracts/qualityDomainContract'));
  checks.push(check('quality_contract_version', contract.CONTRACT_VERSION >= 7, 'fail', `v${contract.CONTRACT_VERSION}`));
  checks.push(check('quality_contract_api_prefixes', !!contract.ROLLOUT_API_PREFIX && !!contract.COGNITIVE_API_PREFIX));

  const { validateCatalogType } = require(path.join(ROOT, 'eventPipeline/catalog/industrialEventCatalog'));
  let catalogMiss = 0;
  for (const ev of contract.EVENTS || []) {
    const v = validateCatalogType(ev, { strict: true });
    if (!v.ok) catalogMiss++;
  }
  checks.push(check('quality_contract_events_in_catalog', catalogMiss === 0, 'fail', `missing=${catalogMiss}`));

  const srv = fs.readFileSync(SERVER, 'utf8');
  for (const p of ['/api/quality-operational', '/api/quality-telemetry', '/api/quality-cognitive', '/api/quality-rollout']) {
    checks.push(check(`server_mount_${p.replace(/\//g, '_')}`, srv.includes(p), 'fail', p));
  }

  try {
    require(path.join(ROOT, 'domains/quality/telemetry/qualityTelemetryIngestService'));
    checks.push(check('telemetry_ingest_service_load', true));
  } catch (e) {
    checks.push(check('telemetry_ingest_service_load', false, 'fail', e.message));
  }
  try {
    require(path.join(ROOT, 'domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator'));
    checks.push(check('cognitive_orchestrator_load', true));
  } catch (e) {
    checks.push(check('cognitive_orchestrator_load', false, 'fail', e.message));
  }
  try {
    require(path.join(ROOT, 'domains/quality/rollout/orchestration/qualityRolloutOrchestrator'));
    checks.push(check('rollout_orchestrator_load', true));
  } catch (e) {
    checks.push(check('rollout_orchestrator_load', false, 'fail', e.message));
  }

  try {
    const reg = require(path.join(ROOT, 'domains/_core/domainRegistry'));
    checks.push(check('domain_registry_present', typeof reg.listDomains === 'function'));
  } catch (e) {
    checks.push(check('domain_registry_present', false, 'warn', e.message));
  }

  return phaseResult('P1', 'Runtime Integrity', checks);
}

module.exports = { validate };
