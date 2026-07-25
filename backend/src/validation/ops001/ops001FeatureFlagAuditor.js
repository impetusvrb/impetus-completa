'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { REPO } = require('./ops001ManifestLoader');

const FE_FLAGS = Object.freeze([
  { key: 'VITE_IMPETUS_LOGISTICS_ENABLED', baseline_key: 'logistics_enabled' },
  { key: 'VITE_IMPETUS_LOGISTICS_MENU', baseline_key: 'logistics_menu' },
  { key: 'VITE_IMPETUS_LOGISTICS_WORKSPACE', baseline_key: 'logistics_workspace' },
  { key: 'VITE_IMPETUS_LOGISTICS_CC', baseline_key: 'logistics_cc' }
]);

const BE_FLAG = Object.freeze({ key: 'IMPETUS_INC048_ENABLED', baseline_key: 'inc048_active' });

function _parseEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq <= 0) continue;
    out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return out;
}

function _truthy(v) {
  return v === 'true' || v === '1' || v === true;
}

function _pm2Env(processName) {
  const r = spawnSync('pm2', ['jlist'], { encoding: 'utf8' });
  if (r.status !== 0) return {};
  try {
    const list = JSON.parse(r.stdout || '[]');
    const proc = list.find((p) => p.name === processName);
    return proc?.pm2_env || {};
  } catch {
    return {};
  }
}

function auditFeatureFlags(baselineManifest = {}) {
  const feProd = _parseEnvFile(path.join(REPO, 'frontend/.env.production'));
  const feLocal = _parseEnvFile(path.join(REPO, 'frontend/.env'));
  const beEnv = _parseEnvFile(path.join(REPO, 'backend/.env'));
  const pm2Fe = _pm2Env('impetus-frontend');

  const wmsBaseline = baselineManifest.feature_flags_default?.wms || {};
  const inc048Baseline = baselineManifest.runtimes?.inc048?.active === true;

  const rows = [];

  for (const f of FE_FLAGS) {
    const prodVal = feProd[f.key];
    const localVal = feLocal[f.key];
    const pm2Val = pm2Fe[f.key];
    const observed = prodVal ?? localVal ?? pm2Val ?? undefined;
    const observedBool = _truthy(observed);
    const expectedBool = wmsBaseline[f.baseline_key] === true;
    const origin = prodVal !== undefined ? 'frontend/.env.production' : localVal !== undefined ? 'frontend/.env' : pm2Val !== undefined ? 'pm2:impetus-frontend' : 'runtime_default(false)';

    let status = 'PASS';
    if (observedBool !== expectedBool) status = 'WARNING';
    if (expectedBool && !observedBool) status = 'FAIL';

    rows.push({
      flag: f.key,
      expected: expectedBool,
      observed: observedBool,
      raw: observed ?? '(absent → false)',
      origin,
      status,
      impact: observedBool ? 'Expõe capacidades WMS-004' : 'Oculta workspace/menu/CC WMS-004'
    });
  }

  const incObserved = _truthy(beEnv[BE_FLAG.key]);
  rows.push({
    flag: BE_FLAG.key,
    expected: inc048Baseline,
    observed: incObserved,
    raw: beEnv[BE_FLAG.key] ?? '(absent → false)',
    origin: beEnv[BE_FLAG.key] !== undefined ? 'backend/.env' : 'runtime_default(false)',
    status: incObserved === inc048Baseline ? 'PASS' : 'WARNING',
    impact: incObserved ? 'INC-048 cross-domain activo' : 'INC-048 desligado (baseline)'
  });

  let classification = 'PASS';
  if (rows.some((r) => r.status === 'FAIL')) classification = 'FAIL';
  else if (rows.some((r) => r.status === 'WARNING')) classification = 'WARNING';

  const allWmsOff = rows
    .filter((r) => r.flag.startsWith('VITE_IMPETUS_LOGISTICS'))
    .every((r) => !r.observed);

  return Object.freeze({
    classification,
    rows,
    pilot_activation_only: baselineManifest.feature_flags_default?.pilot_activation_only === true,
    production_global: baselineManifest.feature_flags_default?.production_global === true,
    all_wms_flags_off: allWmsOff,
    operational_impact: allWmsOff
      ? 'Workspace/menu/CC WMS-004 inacessíveis — comportamento esperado com flags OFF certificadas'
      : 'Capacidades WMS parcial ou totalmente expostas'
  });
}

module.exports = { auditFeatureFlags, FE_FLAGS, BE_FLAG };
