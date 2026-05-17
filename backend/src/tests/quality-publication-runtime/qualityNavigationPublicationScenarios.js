'use strict';

const { buildPublicationContext } = require('../../domains/quality/navigation/qualityNavigationPublicationService');
const navFlags = require('../../domains/quality/navigation/qualityNavigationFlags');

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
  console.log('quality-publication-runtime (backend smoke)\n');
  const saved = {
    NAV: process.env.IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED,
    PUB: process.env.IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED,
    OP: process.env.IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED
  };
  try {
    setEnv('IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED', 'false');
    setEnv('IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED', 'false');
    setEnv('IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED', 'true');
    ok('flags snapshot loads', typeof navFlags.snapshot === 'function');

    const ctxOff = buildPublicationContext({ company_id: '00000000-0000-4000-8000-000000000001' }, {});
    ok('publication denied when nav/pub off', ctxOff.publication_allowed === false);

    setEnv('IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED', 'true');
    setEnv('IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED', 'true');
    const ctxOn = buildPublicationContext({ company_id: '00000000-0000-4000-8000-000000000001' }, {});
    ok('publication allowed when all on + tenant', ctxOn.publication_allowed === true);
  } finally {
    setEnv('IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED', saved.NAV);
    setEnv('IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED', saved.PUB);
    setEnv('IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED', saved.OP);
  }

  console.log(`\nDone. ${pass} ok, ${fail} fail`);
  process.exit(fail ? 1 : 0);
}

main();
