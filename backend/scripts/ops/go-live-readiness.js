#!/usr/bin/env node
'use strict';

/**
 * Checklist único de prontidão para piloto industrial.
 * Uso: node backend/scripts/ops/go-live-readiness.js [company_id] [--structural-only]
 */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '../..');
const companyId = process.argv[2] || process.env.IMPETUS_PILOT_COMPANY_ID || '';
const structuralOnly = process.argv.includes('--structural-only');

function run(label, cmd, args, opts = {}) {
  console.log(`\n── ${label} ──`);
  const r = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...opts.env }
  });
  if (r.status !== 0) {
    console.error(`FALHOU: ${label}`);
    process.exit(r.status || 1);
  }
}

async function main() {
  console.log('IMPETUS — Go Live Readiness\n');

  run('Smoke instalação limpa', 'node', ['scripts/ops/smoke-clean-install.js']);

  run('Testes governança (contextual-modules)', 'npm', ['run', 'test:contextual-modules'], {
    env: { NODE_ENV: 'test' }
  });
  run('Testes governança (domain-isolation)', 'npm', ['run', 'test:domain-isolation']);
  run('Testes isolamento executivo', 'node', ['src/tests/executiveModuleIsolationScenarios.js']);

  if (companyId) {
    const validateArgs = ['scripts/ops/validate-structural-readiness.js', companyId];
    if (structuralOnly) validateArgs.push('--structural-only');
    run('Validação Base Estrutural', 'node', validateArgs);
  } else {
    console.log('\n── Validação Base Estrutural ──');
    console.log('  SKIP (sem company_id — defina IMPETUS_PILOT_COMPANY_ID ou passe como arg)');
  }

  console.log('\n══════════════════════════════════════');
  console.log('GO LIVE READINESS: OK');
  console.log('══════════════════════════════════════\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
