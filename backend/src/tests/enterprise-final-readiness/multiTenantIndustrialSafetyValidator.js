'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const ROOT = path.resolve(__dirname, '../..');

function validate() {
  const checks = [];

  const telemIso = path.join(ROOT, 'storage/telemetryIsolationService.js');
  const tsrc = fs.readFileSync(telemIso, 'utf8');
  checks.push(check('telemetry_sample_requires_company_uuid', /company_id/.test(tsrc) && /validateSample/.test(tsrc)));

  for (const rel of ['routes/qualityCognitive.js', 'routes/qualityRollout.js', 'routes/qualityTelemetry.js']) {
    const p = path.join(ROOT, rel);
    const s = fs.readFileSync(p, 'utf8');
    const base = path.basename(rel, '.js');
    checks.push(check(`${base}_requires_company_from_user`, /company_id/.test(s) && /403/.test(s) && /company_required/.test(s)));
  }

  const rolloutMem = path.join(ROOT, 'domains/quality/rollout/runtime/qualityRolloutMemoryStore.js');
  if (fs.existsSync(rolloutMem)) {
    const rs = fs.readFileSync(rolloutMem, 'utf8');
    checks.push(check('rollout_memory_keyed_by_tenant', /getTenantRolloutState|companyId|tenant/i.test(rs)));
    checks.push(
      check(
        'rollout_memory_no_global_singleton_mutation_doc',
        false,
        'warn',
        'Rever manualmente Map em memória sob pressão multi-tenant.'
      )
    );
  }

  const orchC = path.join(ROOT, 'domains/quality/cognitive/orchestration/qualityCognitiveOrchestrator.js');
  const cs = fs.readFileSync(orchC, 'utf8');
  checks.push(check('cognitive_throttle_map_per_tenant', /_tenantHits/.test(cs)));

  return phaseResult('P9', 'Multi-tenant Industrial Safety (static)', checks);
}

module.exports = { validate };
