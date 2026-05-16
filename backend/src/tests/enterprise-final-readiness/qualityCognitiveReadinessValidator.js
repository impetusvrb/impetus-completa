'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');

function validate() {
  const checks = [];
  const orch = path.join(ROOT, 'domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator.js');
  checks.push(check('cognitive_orchestrator_exists', fs.existsSync(orch)));
  if (fs.existsSync(orch)) {
    const s = fs.readFileSync(orch, 'utf8');
    checks.push(check('cognitive_throttle_per_tenant', /_throttleOk|maxPerMin/.test(s)));
    checks.push(check('cognitive_budget_integration', s.includes('budgetSvc') || s.includes('aiContextBudget')));
    checks.push(check('cognitive_explainability_in_recommendations', /explainability/.test(s)));
    checks.push(check('cognitive_observability_metrics', s.includes('recordMetric')));
    checks.push(check('cognitive_publish_gated', s.includes('isCognitiveIndustrialPublishEnabled')));
  }

  const flagsPath = path.join(ROOT, 'domains/quality/cognitive/flags/qualityCognitiveRuntimeFlags.js');
  checks.push(check('cognitive_flags_module_exists', fs.existsSync(flagsPath)));

  const contract = require(path.join(ROOT, 'domains/quality/contracts/qualityDomainContract'));
  const { validateCatalogType } = require(path.join(ROOT, 'eventPipeline/catalog/industrialEventCatalog'));
  const cognitiveEvents = (contract.EVENTS || []).filter((e) => String(e).startsWith('quality.cognitive.'));
  checks.push(check('cognitive_events_nonempty', cognitiveEvents.length >= 5));
  for (const ev of cognitiveEvents) {
    const v = validateCatalogType(ev, { strict: true });
    checks.push(check(`cognitive_catalog_${ev.replace(/\./g, '_')}`, v.ok, 'fail', v.reason || ''));
  }

  return phaseResult('P7', 'Cognitive Runtime Readiness (static)', checks);
}

module.exports = { validate };
