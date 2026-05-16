'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const SRC = path.resolve(__dirname, '../..');
const BB = path.join(SRC, 'eventPipeline/industrialEventBackbone.js');

function validate() {
  const checks = [];
  checks.push(check('industrial_event_backbone_file', fs.existsSync(BB)));
  if (fs.existsSync(BB)) {
    const s = fs.readFileSync(BB, 'utf8');
    checks.push(check('backbone_correlation_signals', /correlation/i.test(s), 'warn'));
  }
  const replay = path.join(SRC, 'tests/enterprise-soak/replayMassiveStressTest.js');
  checks.push(check('replay_stress_test_present', fs.existsSync(replay), 'warn'));
  const dlq = path.join(SRC, 'tests/enterprise-soak/dlqPressureStressTest.js');
  checks.push(check('dlq_stress_test_present', fs.existsSync(dlq), 'warn'));
  return phaseResult('P5', 'Replay / DLQ readiness (static)', checks);
}

module.exports = { validate };
