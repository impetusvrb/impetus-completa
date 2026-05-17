'use strict';

const runtime = require('../../domains/quality/activation/qualityActivationRuntime');
const rollout = require('../../domains/quality/activation/qualityActivationRolloutEngine');
const metrics = require('../../../../shared/domain-publication/domainPublicationMetrics.cjs');

let p = 0;
let f = 0;
function ok(label, cond) {
  if (cond) {
    p++;
    console.log('  OK', label);
  } else {
    f++;
    console.log('  FAIL', label);
  }
}

function main() {
  console.log('quality-publication-activation (backend)\n');
  ok('metric constants', metrics.QUALITY_ACTIVATION_SAFE_CHECK_MS.includes('quality'));
  ok('rollout stages include shadow', rollout.STAGES.includes('shadow'));
  const prev = process.env.IMPETUS_QUALITY_ACTIVATION_STAGE;
  process.env.IMPETUS_QUALITY_ACTIVATION_STAGE = 'pilot';
  ok('stage pilot', rollout.resolveActivationStage() === 'pilot');
  process.env.IMPETUS_QUALITY_ACTIVATION_STAGE = prev;

  const shadow = runtime.runShadowPublicationPreview({
    sample_users: [{ id: '1', role: 'coordenador' }],
    tenant_id: '00000000-0000-4000-8000-000000000001'
  });
  ok('shadow preview ok', shadow.ok === true && shadow.shadow === true);

  console.log(`\nDone. ${p} ok, ${f} fail`);
  process.exit(f ? 1 : 0);
}

main();
