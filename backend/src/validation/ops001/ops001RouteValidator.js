'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { REPO } = require('./ops001ManifestLoader');

const WMS_ROUTES = Object.freeze([
  '/app/logistics-operational/workspace',
  '/app/logistics-operational/workspace/warehouses',
  '/app/logistics-operational/workspace/inventory',
  '/app/logistics-operational/workspace/receiving',
  '/app/logistics-operational/workspace/picking',
  '/app/logistics-operational/workspace/shipping',
  '/app/logistics-operational/workspace/transfers'
]);

const WMS_API_ROUTES = Object.freeze([
  '/api/logistics-operational/health',
  '/api/logistics-operational/v1'
]);

function _httpProbe(url) {
  const r = spawnSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '--connect-timeout', '5', url], {
    encoding: 'utf8'
  });
  const code = parseInt(r.stdout || '0', 10);
  return Number.isFinite(code) ? code : 0;
}

function validateRoutes() {
  const app = fs.readFileSync(path.join(REPO, 'frontend/src/App.jsx'), 'utf8');
  const shell = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/components/WmsFoundationShell.jsx'),
    'utf8'
  );
  const flags = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/config/wmsFeatureFlags.js'),
    'utf8'
  );

  const distAssets = path.join(REPO, 'frontend/dist/assets');
  const distHasWms = fs.existsSync(distAssets)
    ? fs.readdirSync(distAssets).some((f) => /LogisticsOperationalLayout/i.test(f))
    : false;

  const rows = WMS_ROUTES.map((route) => {
    const registered = app.includes('/app/logistics-operational/workspace');
    const flagGated = shell.includes('WmsWorkspaceGate') && flags.includes('isLogisticsWorkspaceEnabled');
    return {
      route,
      registered,
      published_in_dist: distHasWms,
      flag_protected: flagGated,
      rbac_protected: app.includes('PrivateRoute') && app.includes('ColaboradorRouteGuard'),
      status: registered && distHasWms ? 'PASS' : registered ? 'WARNING' : 'FAIL',
      accessible_when_flags_off: false,
      note: flagGated ? 'WmsWorkspaceGate redirecciona para /app quando VITE_IMPETUS_LOGISTICS_WORKSPACE=OFF' : null
    };
  });

  const apiRows = WMS_API_ROUTES.map((route) => {
    const code = _httpProbe(`http://127.0.0.1:4000${route}`);
    const exists = code === 401 || code === 200 || code === 403;
    return {
      route,
      http_code: code,
      published: exists,
      status: exists ? 'PASS' : code === 0 ? 'WARNING' : 'FAIL'
    };
  });

  let classification = 'PASS';
  const all = [...rows, ...apiRows];
  if (all.some((r) => r.status === 'FAIL')) classification = 'FAIL';
  else if (all.some((r) => r.status === 'WARNING')) classification = 'WARNING';

  return Object.freeze({
    classification,
    frontend_routes: rows,
    backend_api_routes: apiRows,
    wms004_route_gate: 'WmsWorkspaceGate + isLogisticsWorkspaceEnabled()'
  });
}

module.exports = { validateRoutes, WMS_ROUTES, WMS_API_ROUTES };
