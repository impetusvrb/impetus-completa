'use strict';

const fs = require('fs');
const path = require('path');
const { REPO } = require('../ops001/ops001ManifestLoader');

const WMS_MODULES = Object.freeze([
  'dashboard',
  'warehouses',
  'inventory',
  'receiving',
  'picking',
  'shipping',
  'transfers'
]);

function validateWorkspacePublication() {
  const wmsReg = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/routes/wmsOperationalRegistry.js'),
    'utf8'
  );
  const layout = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/pages/WmsOperationalLayout.jsx'),
    'utf8'
  );
  const shell = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/components/WmsFoundationShell.jsx'),
    'utf8'
  );
  const nav = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/components/WmsOperationalNav.jsx'),
    'utf8'
  );
  const ccReg = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics-operational/routes/wmsCommandCenterRegistry.js'),
    'utf8'
  );
  const layoutGlobal = fs.readFileSync(path.join(REPO, 'frontend/src/components/Layout.jsx'), 'utf8');
  const menuEngine = fs.readFileSync(
    path.join(REPO, 'frontend/src/domains/logistics/navigation/logisticsMenuPublicationEngine.js'),
    'utf8'
  );
  const centro = fs.readFileSync(
    path.join(REPO, 'frontend/src/features/dashboard/centroComando/CentroComando.jsx'),
    'utf8'
  );

  const distAssets = path.join(REPO, 'frontend/dist/assets');
  const distHasWms = fs.existsSync(distAssets)
    ? fs.readdirSync(distAssets).some((f) => /LogisticsOperationalLayout/i.test(f))
    : false;

  const feEnv = fs.readFileSync(path.join(REPO, 'frontend/.env.production'), 'utf8');
  const flagsOn =
    feEnv.includes('VITE_IMPETUS_LOGISTICS_ENABLED=true') &&
    feEnv.includes('VITE_IMPETUS_LOGISTICS_WORKSPACE=true');

  const moduleRows = WMS_MODULES.map((mod) => ({
    module: mod,
    in_registry: wmsReg.includes(mod),
    in_layout: mod === 'dashboard' ? layout.includes('index') : layout.includes(`"${mod}"`) || layout.includes(`'${mod}'`),
    in_nav: nav.includes(mod),
    status: wmsReg.includes(mod) && layout.includes(mod === 'dashboard' ? 'index' : mod) ? 'PASS' : 'FAIL'
  }));

  const integration = [
    {
      id: 'workspace_registry',
      component: 'wmsOperationalRegistry.js',
      status: wmsReg.includes('WMS_OPERATIONAL_BASE') ? 'PASS' : 'FAIL',
      note: 'Registry WMS-004 congelado'
    },
    {
      id: 'workspace_shell',
      component: 'WmsFoundationShell.jsx',
      status: shell.includes('isLogisticsWorkspaceEnabled') ? 'PASS' : 'FAIL',
      note: flagsOn ? 'Shell activo com flags piloto' : 'Shell aguarda flags'
    },
    {
      id: 'internal_nav',
      component: 'WmsOperationalNav.jsx',
      status: nav.includes('filterNavByRbac') ? 'PASS' : 'FAIL',
      note: 'Menu módulos dentro do workspace (arquitectura WMS-004)'
    },
    {
      id: 'layout_global_menu',
      component: 'Layout.jsx ↔ WMS-004',
      status: layoutGlobal.includes('isWmsMenuVisible') ? 'PASS' : 'WARNING',
      note: 'Sidebar global não consome WMS registry — menu via WmsOperationalNav no workspace'
    },
    {
      id: 'logistics_publication_engine',
      component: 'logisticsMenuPublicationEngine.js',
      status: menuEngine.includes('mergeLogisticsPublicationIntoMenu') ? 'PASS' : 'FAIL',
      note: 'Domínio logística cognitiva (/app/logistics/operational) — separado de WMS-004'
    },
    {
      id: 'command_center_exposure',
      component: 'WmsOperationalCcExposure',
      status: ccReg.includes('isWmsCcExposureActive') && centro.includes('WmsOperationalCcExposure') ? 'PASS' : 'FAIL',
      note: 'flagsOn && VITE_IMPETUS_LOGISTICS_CC=true → CC exposto'
    },
    {
      id: 'dist_published',
      component: 'frontend/dist',
      status: distHasWms ? 'PASS' : 'FAIL',
      note: 'Build contém chunks WMS-004'
    }
  ];

  if (feEnv.includes('VITE_IMPETUS_LOGISTICS_CC=true') === false) {
    const cc = integration.find((i) => i.id === 'command_center_exposure');
    if (cc) cc.status = 'WARNING';
  }

  let classification = 'PASS';
  if (moduleRows.some((m) => m.status === 'FAIL') || integration.some((i) => i.status === 'FAIL')) {
    classification = 'FAIL';
  } else if (integration.some((i) => i.status === 'WARNING')) {
    classification = 'WARNING';
  }

  return Object.freeze({
    classification,
    workspace_path: '/app/logistics-operational/workspace',
    flags_active: flagsOn,
    menu_publication_mode: 'WmsOperationalNav (in-workspace) + registry menu_visible via isWmsMenuVisible()',
    modules: moduleRows,
    integration,
    api_contract: '/logistics-operational/v1 (WMS-003 public APIs only)'
  });
}

module.exports = { validateWorkspacePublication, WMS_MODULES };
