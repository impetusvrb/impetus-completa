'use strict';

const { buildPublicationContext } = require('../../domains/environment/navigation/environmentNavigationPublicationService');
const navFlags = require('../../domains/environment/navigation/environmentNavigationFlags');
const { environmentPublicationRuntime, environmentPublicationValidationRuntime } = require('../../domains/environment/publication');

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass++;
    console.log('  OK', label);
  } else {
    fail++;
    console.log('  FAIL', label);
  }
}

function setEnv(k, v) {
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

function main() {
  console.log('environment-publication-runtime (backend)\n');
  const saved = {
    NAV: process.env.IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED,
    PUB: process.env.IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED,
    OP: process.env.IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED,
    SH: process.env.IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE
  };
  try {
    setEnv('IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED', 'false');
    setEnv('IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED', 'false');
    setEnv('IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED', 'true');
    ok('flags snapshot', typeof navFlags.snapshot === 'function');

    const ctxOff = buildPublicationContext({ company_id: '00000000-0000-4000-8000-000000000001' }, {});
    ok('publication denied when off', ctxOff.publication_allowed === false);

    setEnv('IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED', 'true');
    setEnv('IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED', 'true');
    setEnv('IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE', 'true');
    const user = { company_id: '00000000-0000-4000-8000-000000000001', role: 'coordenador' };
    const ctxOn = buildPublicationContext(user, { enrich: true });
    ok('publication allowed when on', ctxOn.publication_allowed === true);
    ok('shadow_only in context', ctxOn.shadow_only === true || ctxOn.rollout_shadow === true);

    const pack = environmentPublicationRuntime(user, { hasEnvironmentIntelligenceModule: true });
    ok('runtime audience band', !!pack.audience_band);
    ok('runtime capabilities', !!pack.capabilities?.capabilities);
    ok('no auto promotion', pack.auto_promotion === false);

    const validation = environmentPublicationValidationRuntime({ user, tenant_id: user.company_id });
    ok('validation pipeline includes environment', validation.multi_domain.pipeline_order.includes('environment'));
  } finally {
    setEnv('IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED', saved.NAV);
    setEnv('IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED', saved.PUB);
    setEnv('IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED', saved.OP);
    setEnv('IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE', saved.SH);
  }

  console.log(`\nDone. ${pass} ok, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main();
