'use strict';

const fs = require('fs');
const path = require('path');
const { REPO } = require('../ops001/ops001ManifestLoader');
const { FE_PILOT_FLAGS, BE_PILOT_FLAGS } = require('../../../scripts/ops002/applyPilotRolloutConfig');

function _parseEnvFile(rel) {
  const out = {};
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) return out;
  for (const line of fs.readFileSync(abs, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function _truthy(v) {
  return v === 'true' || v === '1' || v === 'on';
}

function validatePilotFlagActivation() {
  const fe = _parseEnvFile('frontend/.env.production');
  const be = _parseEnvFile('backend/.env');

  const rows = Object.entries(FE_PILOT_FLAGS).map(([key, expected]) => {
    const observed = fe[key];
    const ok = _truthy(observed) === _truthy(expected);
    return {
      flag: key,
      expected: expected,
      observed: observed ?? '(absent)',
      origin: 'frontend/.env.production',
      status: ok ? 'PASS' : 'FAIL',
      impact: ok ? 'Capacidade WMS-004 activa' : 'Flag piloto não activa'
    };
  });

  rows.push({
    flag: 'IMPETUS_INC048_ENABLED',
    expected: 'false',
    observed: be.IMPETUS_INC048_ENABLED ?? '(absent → false)',
    origin: 'backend/.env',
    status: !_truthy(be.IMPETUS_INC048_ENABLED) ? 'PASS' : 'FAIL',
    impact: 'INC-048 mantido desligado per OPS-002'
  });

  const beApi = {
    flag: 'IMPETUS_WMS_API_ENABLED',
    expected: 'true',
    observed: be.IMPETUS_WMS_API_ENABLED ?? '(absent)',
    origin: 'backend/.env',
    status: _truthy(be.IMPETUS_WMS_API_ENABLED) ? 'PASS' : 'WARNING',
    impact: 'Gate API WMS-003 — necessário para consumo v1',
    note: 'Activado per WMS-006 controlled activation (config operacional)'
  };
  rows.push(beApi);

  for (const [key, val] of Object.entries(BE_PILOT_FLAGS)) {
    if (key === 'IMPETUS_WMS_API_ENABLED') continue;
    const observed = be[key];
    rows.push({
      flag: key,
      expected: val,
      observed: observed ?? '(absent)',
      origin: 'backend/.env',
      status: _truthy(observed) === _truthy(val) ? 'PASS' : 'WARNING',
      impact: 'Mirror backend das flags piloto FE'
    });
  }

  let classification = 'PASS';
  if (rows.some((r) => r.status === 'FAIL')) classification = 'FAIL';
  else if (rows.some((r) => r.status === 'WARNING')) classification = 'WARNING';

  return Object.freeze({
    classification,
    rows,
    all_wms_pilot_on: rows
      .filter((r) => r.flag.startsWith('VITE_IMPETUS_LOGISTICS_'))
      .every((r) => _truthy(r.observed)),
    inc048_off: !_truthy(be.IMPETUS_INC048_ENABLED)
  });
}

module.exports = { validatePilotFlagActivation };
