'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');

function validate() {
  const checks = [];
  const orch = path.join(ROOT, 'domains/quality/rollout/orchestration/qualityRolloutOrchestrator.js');
  checks.push(check('rollout_orchestrator_exists', fs.existsSync(orch)));
  if (fs.existsSync(orch)) {
    const s = fs.readFileSync(orch, 'utf8');
    checks.push(check('rollout_throttle_per_tenant', /throttleOk/.test(s)));
    checks.push(check('rollout_budget_integration', s.includes('budgetSvc') || s.includes('resolveBudget')));
    checks.push(check('rollout_saturation_protection', s.includes('protectUserSaturation')));
    checks.push(check('rollout_readiness_engine', s.includes('assessIndustrialReadiness')));
    checks.push(check('rollout_maturity_scoring', s.includes('scoreOperationalMaturity')));
    checks.push(check('rollout_observability_metrics', s.includes('recordMetric')));
    checks.push(check('rollout_publish_gated', s.includes('isRolloutIndustrialPublishEnabled')));
  }

  const mem = path.join(ROOT, 'domains/quality/rollout/runtime/qualityRolloutMemoryStore.js');
  checks.push(check('rollout_memory_store_exists', fs.existsSync(mem)));

  const contract = require(path.join(ROOT, 'domains/quality/contracts/qualityDomainContract'));
  const { validateCatalogType } = require(path.join(ROOT, 'eventPipeline/catalog/industrialEventCatalog'));
  const rolloutEvents = (contract.EVENTS || []).filter((e) => String(e).startsWith('quality.rollout.'));
  checks.push(check('rollout_events_nonempty', rolloutEvents.length >= 5));
  for (const ev of rolloutEvents) {
    const v = validateCatalogType(ev, { strict: true });
    checks.push(check(`rollout_catalog_${ev.replace(/\./g, '_')}`, v.ok, 'fail', v.reason || ''));
  }

  return phaseResult('P8', 'Rollout Runtime Readiness (static)', checks);
}

module.exports = { validate };
