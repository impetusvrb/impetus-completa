'use strict';

const fs = require('fs');
const path = require('path');
const { REPO } = require('./ops001ManifestLoader');

function _read(rel) {
  return fs.readFileSync(path.join(REPO, rel), 'utf8');
}

function validateWorkspaceRegistry(baselineManifest = {}) {
  const app = _read('frontend/src/App.jsx');
  const wmsReg = _read('frontend/src/domains/logistics-operational/routes/wmsOperationalRegistry.js');
  const ccReg = _read('frontend/src/domains/logistics-operational/routes/wmsCommandCenterRegistry.js');
  const layout = _read('frontend/src/components/Layout.jsx');
  const centro = _read('frontend/src/features/dashboard/centroComando/CentroComando.jsx');

  const expectedPath = baselineManifest.workspaces?.wms?.path || '/app/logistics-operational/workspace';

  const registries = [
    {
      id: 'workspace_registry',
      registry: 'Workspace Registry',
      file: 'wmsOperationalRegistry.js',
      present: wmsReg.includes('WMS_OPERATIONAL_BASE') && wmsReg.includes(expectedPath),
      status: 'PASS'
    },
    {
      id: 'route_registry',
      registry: 'Route Registry',
      file: 'App.jsx + wmsOperationalRegistry.js',
      present: app.includes(expectedPath) && wmsReg.includes('WMS_OPERATIONAL_ROUTES'),
      status: 'PASS'
    },
    {
      id: 'command_center_registry',
      registry: 'Command Center Registry',
      file: 'wmsCommandCenterRegistry.js + CentroComando.jsx',
      present: ccReg.includes('WMS_CC_OPERATIONAL_EXPOSURE') && centro.includes('WmsOperationalCcExposure'),
      status: 'PASS'
    },
    {
      id: 'navigation_registry',
      registry: 'Navigation Registry',
      file: 'Layout.jsx ↔ WMS-004 nav',
      present: layout.includes('logistics-operational/workspace') || layout.includes('getWmsNavigationSnapshot') || layout.includes('isWmsMenuVisible'),
      status: 'WARNING'
    },
    {
      id: 'menu_registry',
      registry: 'Menu Registry',
      file: 'Layout.jsx menu pipeline',
      present: layout.includes('isWmsMenuVisible') || layout.includes('WMS_OPERATIONAL_NAV') || layout.includes('getWmsNavigationSnapshot'),
      note: 'WMS-004 usa registry próprio; Layout integra logistics publication engine (domínio distinto)',
      status: 'WARNING'
    }
  ];

  for (const r of registries) {
    if (!r.present && r.status !== 'WARNING') r.status = 'FAIL';
    else if (!r.present && r.id === 'navigation_registry') r.status = 'WARNING';
    else if (!r.present && r.id === 'menu_registry') r.status = 'WARNING';
    else if (r.present) r.status = 'PASS';
  }

  let classification = 'PASS';
  if (registries.some((r) => r.status === 'FAIL')) classification = 'FAIL';
  else if (registries.some((r) => r.status === 'WARNING')) classification = 'WARNING';

  return Object.freeze({
    classification,
    expected_workspace_path: expectedPath,
    registries,
    modules_in_registry: (wmsReg.match(/id: '/g) || []).length,
    menu_visible_static: wmsReg.includes('menu_visible: false')
  });
}

module.exports = { validateWorkspaceRegistry };
