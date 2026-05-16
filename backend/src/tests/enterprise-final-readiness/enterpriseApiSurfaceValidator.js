'use strict';

const fs = require('fs');
const path = require('path');
const { check, phaseResult } = require('./common/readinessResult');

const SERVER = path.join(path.resolve(__dirname, '../..'), 'server.js');

function sliceForMount(src, mountPrefix) {
  const idx = src.indexOf(`'${mountPrefix}'`);
  if (idx < 0) return '';
  return src.slice(idx, idx + 900);
}

function validate() {
  const src = fs.readFileSync(SERVER, 'utf8');
  const checks = [];
  const mounts = [
    '/api/quality-operational',
    '/api/quality-governance',
    '/api/quality-telemetry',
    '/api/quality-cognitive',
    '/api/quality-rollout'
  ];
  for (const p of mounts) {
    const block = sliceForMount(src, p);
    const slug = p.replace(/\//g, '_');
    checks.push(check(`mount_exists${slug}`, block.length > 0, 'fail', p));
    checks.push(check(`mount_auth${slug}`, block.includes('requireAuth'), 'fail', p));
    checks.push(check(`mount_company${slug}`, block.includes('requireCompanyActive'), 'fail', p));
    checks.push(check(`mount_limiter${slug}`, block.includes('apiByUserLimiter'), 'fail', p));
  }

  /** Montagem single-line sem middleware nas 5 rotas enterprise QUALITY (não inclui /api/quality-intelligence legado). */
  const openCoreQuality = /useRoute\(\s*['"]\/api\/quality-(operational|governance|telemetry|cognitive|rollout)['"],\s*['"][^'"]+['"]\s*\)\s*;/;
  const badMinimalMount = openCoreQuality.test(src);
  checks.push(
    check(
      'quality_enterprise_routes_not_minimal_mount',
      !badMinimalMount,
      'warn',
      badMinimalMount
        ? 'Detectada montagem mínima (sem middleware visível na mesma linha) numa rota quality enterprise — rever server.js.'
        : 'ok'
    )
  );

  return phaseResult('P14', 'API Surface (Quality + governance mounts)', checks);
}

module.exports = { validate };
