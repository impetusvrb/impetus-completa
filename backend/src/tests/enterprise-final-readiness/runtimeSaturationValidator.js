'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');

function validate() {
  const checks = [];
  const obsPath = path.join(ROOT, 'services/operational/enterpriseObservabilityRuntime.js');
  const obs = fs.readFileSync(obsPath, 'utf8');
  checks.push(check('observability_trace_cap', /MAX_TRACES\s*=\s*\d+/.test(obs)));

  const cog = fs.readFileSync(path.join(ROOT, 'domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator.js'), 'utf8');
  checks.push(check('cognitive_has_throttle', /_throttleOk/.test(cog)));
  checks.push(check('cognitive_throttle_default_numeric', /\b48\b/.test(cog) || /maxPerMin/.test(cog)));

  const ro = fs.readFileSync(path.join(ROOT, 'domains/quality/rollout/orchestration/qualityRolloutOrchestrator.js'), 'utf8');
  checks.push(check('rollout_has_throttle', /throttleOk/.test(ro)));
  checks.push(check('rollout_throttle_default_numeric', /\b40\b/.test(ro)));

  checks.push(
    check(
      'replay_burst_not_statically_proven',
      false,
      'warn',
      'Proteção sob burst de replay depende de WAVE1–3 runtime; validar com test:soak:replay em staging.'
    )
  );

  return phaseResult('P12', 'Runtime Saturation (static heuristics)', checks);
}

module.exports = { validate };
