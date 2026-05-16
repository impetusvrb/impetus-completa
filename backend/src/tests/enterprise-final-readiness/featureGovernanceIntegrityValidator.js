'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');
const FGS = path.join(ROOT, 'services/featureGovernanceService.js');

function validate() {
  const src = fs.readFileSync(FGS, 'utf8');
  const required = [
    'IMPETUS_QUALITY_ROLLOUT_RUNTIME_ENABLED',
    'IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED',
    'IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED',
    'IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED',
    'IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED',
    'IMPETUS_QUALITY_ROLLOUT_PUBLISH_EVENTS_ENABLED',
    'IMPETUS_INDUSTRIAL_EVENTS_ENABLED',
    'IMPETUS_INDUSTRIAL_DLQ_ENABLED',
    'IMPETUS_INDUSTRIAL_OUTBOX_ENABLED'
  ];
  const checks = required.map((flag) =>
    check(`known_flag_${flag}`, src.includes(`'${flag}'`), 'warn', flag)
  );
  checks.push(check('rules_array_present', src.includes('const RULES = [') && src.includes('QUALITY_ROLLOUT_PUBLISH_WITHOUT_INDUSTRIAL_EVENTS')));
  return phaseResult('P3', 'Feature Governance Integrity', checks);
}

module.exports = { validate };
