'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');

function validate() {
  const checks = [];
  const obsPath = path.join(ROOT, 'services/operational/enterpriseObservabilityRuntime.js');
  checks.push(check('enterprise_observability_file', fs.existsSync(obsPath)));
  const s = fs.readFileSync(obsPath, 'utf8');
  checks.push(check('otel_compatible_trace_shape', /traceId|spanId|spans/.test(s)));
  checks.push(check('prometheus_style_record_metric', /recordMetric|getMetrics/.test(s)));
  checks.push(check('trace_retention_bounded', /MAX_TRACES|RETENTION/.test(s)));
  checks.push(check('metric_series_bounded', /1000|shift/.test(s)));

  const cog = path.join(ROOT, 'domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator.js');
  const ro = path.join(ROOT, 'domains/quality/rollout/orchestration/qualityRolloutOrchestrator.js');
  if (fs.existsSync(cog)) checks.push(check('cognitive_emits_obs_metrics', fs.readFileSync(cog, 'utf8').includes('recordMetric')));
  if (fs.existsSync(ro)) checks.push(check('rollout_emits_obs_metrics', fs.readFileSync(ro, 'utf8').includes('recordMetric')));

  checks.push(
    check(
      'cardinality_manual_review',
      false,
      'warn',
      'Labels dinâmicos em métricas requerem revisão humana (explosão de cardinalidade).'
    )
  );

  return phaseResult('P11', 'Enterprise Observability Readiness (static)', checks);
}

module.exports = { validate };
